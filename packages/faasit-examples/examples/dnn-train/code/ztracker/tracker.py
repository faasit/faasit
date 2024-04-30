import contextlib
from dataclasses import dataclass
import datetime
import logging
from pathlib import Path
import multiprocessing as mp
import time
from typing import Any, Callable, Dict, List, Optional

from ztracker.datatype import ArtifactDataType, Event
from ztracker.event_recorder import (
    EventRecordCallback,
    EventRecorder,
    MpEventRecorderMaster,
    SaveArtifactParam,
)

lib_logger = logging.getLogger(__name__)

SaveFunc = Callable[[Any, Path], None]


class DotDict(object):
    def __init__(self, d: Dict) -> None:
        self._d = d

    def __getattr__(self, name):
        return self._d[name]

    def dict(self):
        return self._d


@dataclass
class TrackerSetting:
    reporter: str
    meta: Dict
    record_log_event: Optional[bool] = None

    def merge(self, new_cfg: "TrackerSetting") -> "TrackerSetting":
        reporter = new_cfg.reporter if len(new_cfg.reporter) != 0 else self.reporter

        record_log_event = self.record_log_event
        if new_cfg.record_log_event is not None:
            record_log_event = new_cfg.record_log_event

        return TrackerSetting(reporter, {**self.meta, **new_cfg.meta}, record_log_event)


@dataclass
class TrackItem:
    fields: Optional[Dict]
    meta: Optional[Dict]


class Tracker(object):
    """Tracker is a stateless object (only have local state), all the event and related states are managed by EventRecorder"""

    def __init__(
        self,
        recorder: EventRecorder,
        logger: logging.Logger,
        settings: TrackerSetting,
        fields: Dict,
        perf_timer_ns: int,
    ) -> None:
        self._recorder = recorder
        self._settings = settings
        self._fields = fields
        self._perf_timer_ns = perf_timer_ns
        self._logger = logger

        # tracker local variables
        self._tracks_buf: List[TrackItem] = []  # for defer commit

    def clone(self, move: bool = False):
        if not self._recorder:
            raise ValueError("tracker has already been moved, can't clone")

        if move:
            recorder = self._recorder
            self._recorder = None
        else:
            recorder = self._recorder.share()

        return Tracker(
            recorder=recorder,
            settings=self._settings,
            fields=self._fields,
            logger=self._logger,
            perf_timer_ns=self._perf_timer_ns,
        )

    def clone_with_recorder(self, event_recorder: EventRecorder):
        """needed to impl thread-safe tracker"""
        return Tracker(
            recorder=event_recorder,
            settings=self._settings,
            fields=self._fields,
            logger=self._logger,
            perf_timer_ns=self._perf_timer_ns,
        )

    def with_settings(
        self,
        reporter: str = "",
        meta: Optional[Dict] = None,
        record_log_event: Optional[bool] = None,
        move: bool = False,
    ):
        if meta is None:
            meta = {}

        new_settings = self._settings.merge(
            TrackerSetting(reporter, meta, record_log_event)
        )
        tracker = self.clone(move)
        tracker._settings = new_settings
        return tracker

    def with_fields(self, fields: Dict, move: bool = False):
        new_fields = {**self._fields, **fields}
        tracker = self.clone(move)
        tracker._fields = new_fields
        return tracker

    def track(
        self,
        fields: Optional[Dict] = None,
        meta: Optional[Dict] = None,
        commit: bool = True,
    ):
        self._tracks_buf.append(TrackItem(fields, meta))

        if commit:
            fields = {**self._fields}
            meta = {**self._settings.meta}
            for track in self._tracks_buf:
                if track.fields:
                    fields.update(track.fields)
                if track.meta:
                    meta.update(track.meta)
            self._tracks_buf = []

            evt = self._create_event(meta)
            evt.type = "z.tk"
            evt.data = fields
            self._record_event(evt)

        return self

    @contextlib.contextmanager
    def span(self, name: str, log_end_span: bool = False):
        assert self._recorder
        span_id = self._recorder.next_span_id()
        tracker = self.with_settings(
            meta={
                "span.id": span_id,
                "span.name": name,
            }
        )
        tracker._record_event(
            self._create_event(
                meta={"span.id": span_id, "span.name": name, "span.event": "started"},
                type="z.span",
            )
        )

        start_time_ns = time.perf_counter_ns()
        try:
            yield tracker

        finally:
            elapsed_ns = time.perf_counter_ns() - start_time_ns
            elapsed_ms = (elapsed_ns / 10**6) * 100 // 100
            if log_end_span:
                tracker.with_fields(
                    {
                        "span.id": span_id,
                        "span.name": name,
                        "span.elapsed_ms": elapsed_ms,
                    }
                ).info("span end")

            tracker._record_event(
                self._create_event(
                    meta={
                        "span.id": span_id,
                        "span.name": name,
                        "span.event": "stopped",
                        "span.elapsed_ms": elapsed_ms,
                    },
                    type="z.span",
                )
            )

    def info(
        self,
        msg,
        exclude_fields: Optional[List[str]] = None,
        include_fields: Optional[List[str]] = None,
    ):
        return self.log(logging.INFO, msg, exclude_fields, include_fields)

    def error(self, msg, exclude_fields: None = None, include_fields: None = None):
        return self.log(logging.ERROR, msg, exclude_fields, include_fields)

    def warn(self, msg, exclude_fields: None = None, include_fields: None = None):
        return self.log(logging.WARN, msg, exclude_fields, include_fields)

    def debug(self, msg, exclude_fields: None = None, include_fields: None = None):
        return self.log(logging.DEBUG, msg, exclude_fields, include_fields)

    def log(
        self,
        level: int,
        msg: str,
        exclude_fields: Optional[List[str]] = None,
        include_fields: Optional[List[str]] = None,
    ):
        if self._settings.record_log_event:
            evt = self._create_event()
            evt.type = "z.log"
            evt.data["log.level"] = logging.getLevelName(level)
            evt.data["log.msg"] = msg
            self._record_event(evt)

        if self._logger.isEnabledFor(level):
            self._logger.log(
                level,
                "%s %s",
                msg,
                self._format_log_fields(exclude_fields, include_fields),
            )

        return self

    def finalize(self):
        if self._recorder:
            self._recorder.unshare()

    def Artifact(
        self,
        data: Any,
        save_func: SaveFunc,
        prefix: str = "",
        persist_name: str = "",
        format: str = "bin",
        meta: Optional[Dict] = None,
    ) -> ArtifactDataType:
        """
        :param: data - data to save
        :param: save_func - (data, path) -> None, save_func to implement actual save logic
        :param: format - format of the artifact (@see ArtifactDataType)
        """
        assert self._recorder
        if meta is None:
            meta = {}

        return self._recorder.save_artifact(
            SaveArtifactParam(
                data=data,
                save_func=save_func,
                prefix=prefix,
                persist_name=persist_name,
                format=format,
                meta=meta,
            )
        )

    def clone_artifact(self, src: ArtifactDataType, dest_name: str) -> ArtifactDataType:
        assert self._recorder
        return self._recorder.clone_artifact(src, dest_name)

    def track_config(
        self, data: Any, name: str, encoder: Optional[Callable[[Any], Any]] = None
    ):
        def yaml_saver(data: Any, path: Path):
            import yaml

            with open(path, "w") as f:
                yaml.safe_dump(data, f)

        def json_saver(data: Any, path: Path):
            import json

            with open(path, "w") as f:
                json.dump(data, f, indent=2)

        if encoder:
            data = encoder(data)

        data = self.Artifact(
            data, save_func=json_saver, persist_name=name, format="json"
        )
        self.track({"config": data}, meta={"z.type": "config"})

    def register_event_callback(self, cb: EventRecordCallback):
        assert self._recorder
        self._recorder.register_callback(cb)

    def _format_log_fields(
        self,
        exclude_fields: Optional[List[str]] = None,
        include_fields: Optional[List[str]] = None,
    ) -> str:
        field_keys = set(self._fields.keys())
        if exclude_fields:
            field_keys -= set(exclude_fields)
        if include_fields:
            field_keys &= set(include_fields)

        fields = []

        for k in field_keys:
            value = self._fields[k]
            if isinstance(value, str):
                value = f'"{value}"'

            elif isinstance(value, ArtifactDataType):
                value = f"'{value.name}.{value.format}'"

            fields.append(f"{k}={value}")

        fields.sort()

        return " ".join(fields)

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        self.finalize()

    def __del__(self):
        self.finalize()

    def _record_event(self, evt: Event):
        reporter = self._settings.reporter
        if len(reporter) == 0:
            reporter = "default"

        if self._recorder:
            self._recorder.record_event(evt, reporter)

    def _create_event(self, meta: Optional[Dict] = None, type: str = "") -> Event:
        if meta:
            meta.update(self._settings.meta)
        else:
            meta = self._settings.meta

        return Event(
            id="",
            type=type,
            ts=datetime.datetime.now().astimezone().strftime("%Y-%m-%dT%H:%M:%S %z"),
            perf_ts=time.perf_counter_ns() - self._perf_timer_ns,
            meta=meta,
            data={
                **self._fields,
            },
        )


def _start_event_record_master(master: MpEventRecorderMaster):
    master.start()


class MultiProcessTrackerManager(object):
    """Tracker manager to create multiprocess-safe tracker"""

    def __init__(self, result_dir: Path, dry_run: bool, num_buffers: int) -> None:
        self._manager = mp.Manager()
        self._event_record_master = MpEventRecorderMaster(
            self._manager,
            result_dir=result_dir,
            dry_run=dry_run,
            num_buffers=num_buffers,
        )
        self._result_dir = result_dir
        self._dry_run = dry_run

        self._process: Optional[mp.Process] = None

        self._local_tracker: Tracker = Tracker(
            recorder=self._event_record_master.create_client(),
            # recorder=LocalEventRecorder(self._result_dir, self._dry_run),
            logger=logging.getLogger("ztracker"),
            settings=TrackerSetting(reporter="", meta={}),
            fields={},
            perf_timer_ns=time.perf_counter_ns(),
        )

    def __enter__(self):
        self.start()
        return self

    def __exit__(self, e1, e2, e3):
        self.stop()

    # @property
    # def tracker(self) -> Tracker:
    #     return self._local_tracker

    def add_fields(self, fields: Dict):
        self._local_tracker = self._local_tracker.with_fields(fields, move=True)

    def add_settings(
        self,
        reporter: str = "",
        meta: Optional[None] = None,
        record_log_event: Optional[bool] = None,
    ):
        self._local_tracker = self._local_tracker.with_settings(
            reporter, meta, record_log_event, move=True
        )

    def track_config(
        self, data: Any, name: str, encoder: Optional[Callable[[Any], Any]] = None
    ):
        self._local_tracker.track_config(data, name, encoder)

    def create_tracker(self) -> Tracker:
        return self._local_tracker.clone_with_recorder(
            self._event_record_master.create_client()
        )

    def start(self):
        if self._process:
            return

        self._process = mp.Process(
            target=_start_event_record_master, args=(self._event_record_master,)
        )
        self._process.start()

    def stop(self):
        if not self._process:
            return
        self._event_record_master.stop()
        self._local_tracker.finalize()
        # print(f"share_cnt={self._local_tracker._recorder._share_cnt}")
        # TODO: join ?
        if self._process:
            self._process.join(timeout=5)
        self._process = None


class RoundRobinIDPool(object):
    def __init__(self, max_size: int) -> None:
        self.id = 0
        self.max_size = max_size
        pass

    def next_id(self) -> str:
        self.id = (self.id + 1) % self.max_size
        return str(self.id)
