from dataclasses import dataclass
from pathlib import Path
import multiprocessing as mp
import queue
from typing import List, Callable, Dict, Any, Protocol
from ztracker.datatype import ArtifactDataType, Event

import logging

lib_logger = logging.getLogger(__name__)


@dataclass
class SaveArtifactParam:
    data: Any
    save_func: Callable[[Any, Path], None]
    prefix: str
    persist_name: str
    format: str
    meta: Dict


def _handle_save_artifact(
    p: SaveArtifactParam, artifacts_dir: Path, artifact_id: str, dry_run: bool
) -> ArtifactDataType:
    format = p.format
    if len(format) == 0:
        format = "bin"

    prefix = p.prefix
    if len(prefix) == 0:
        prefix = "data"

    name = f"{prefix}_{artifact_id}"
    if p.persist_name:
        name = p.persist_name

    artifact_name = f"{name}.{format}"
    artifact_path = artifacts_dir / artifact_name

    if not dry_run:
        # save data
        p.save_func(p.data, artifact_path)

    return ArtifactDataType(
        _type_="artifact",
        name=name,
        url=artifact_path.as_posix(),
        format=format,
        meta=p.meta,
    )


def _handle_clone_artifact(
    artifacts_dir: Path, src: ArtifactDataType, dest_name: str, dry_run: bool
) -> ArtifactDataType:
    artifact_path = artifacts_dir / f"{dest_name}.{src.format}"

    if not dry_run:
        import shutil

        shutil.copyfile(src.url, artifact_path.as_posix())

    return ArtifactDataType(
        _type_="artifact",
        name=dest_name,
        url=artifact_path.as_posix(),
        format=src.format,
        meta=src.meta,
    )


def _handle_run_callbacks(callbacks, evt, reporter):
    for callback in callbacks:
        try:
            callback(evt, reporter)
        except Exception:
            lib_logger.warn("failed to run callback", exc_info=True)


class EventRecorder(Protocol):
    """EventRecorder manages state to record events, may be thread-safe or not thread-safe, depends on the derived class"""

    def next_span_id(self) -> str:
        ...

    def save_artifact(self, param: SaveArtifactParam) -> ArtifactDataType:
        ...

    def clone_artifact(self, src: ArtifactDataType, dest_name: str) -> ArtifactDataType:
        ...

    def register_callback(self, cb: "EventRecordCallback") -> None:
        ...

    def record_event(self, evt: Event, reporter: str) -> None:
        ...

    def share(self) -> "EventRecorder":
        ...

    def unshare(self) -> None:
        ...


class MpEventRecorderClient(EventRecorder):
    """EventRecorder client, not thread-safe, used in multi-process"""

    def __init__(
        self, queue: queue.Queue, client_id: str, artifacts_dir: Path, dry_run: bool
    ) -> None:
        self._queue = queue
        self._client_id = client_id
        self._artifacts_dir = artifacts_dir
        self._dry_run = dry_run
        self._local_span_id = 1000
        self._local_artifact_id = 1000
        self._share_cnt = 1

        self._event_record_callbacks: List[EventRecordCallback] = []

    def next_span_id(self) -> str:
        self._local_span_id += 1
        return f"{self._client_id}_{self._local_span_id}"

    def save_artifact(self, param: SaveArtifactParam) -> ArtifactDataType:
        return _handle_save_artifact(
            param, self._artifacts_dir, self._next_artifact_id(), self._dry_run
        )

    def clone_artifact(self, src: ArtifactDataType, dest_name: str) -> ArtifactDataType:
        return _handle_clone_artifact(
            self._artifacts_dir, src, dest_name, self._dry_run
        )

    def register_callback(self, cb: "EventRecordCallback") -> None:
        self._event_record_callbacks.append(cb)

    def record_event(self, evt: Event, reporter: str) -> None:
        if not self._dry_run:
            self._queue.put(("event", (evt, reporter)))

        _handle_run_callbacks(self._event_record_callbacks, evt, reporter)

    def share(self) -> "EventRecorder":
        self._share_cnt += 1
        return self

    def unshare(self):
        self._share_cnt -= 1
        if self._share_cnt == 0:
            self._finalize()

    def _finalize(self):
        # TODO: find a better way to notify we've done
        self._queue.put(("close", self._client_id), timeout=10)

    def _next_artifact_id(self) -> str:
        self._local_artifact_id += 1
        return f"{self._client_id}_{self._local_artifact_id}"


class LocalEventRecorder(EventRecorder):
    """Used only in one thread, not thread-safe"""

    def __init__(self, result_dir: Path, dry_run: bool, num_buffers: int) -> None:
        self._result_dir = result_dir
        self._artifacts_dir = self._result_dir / "artifacts"
        self._reporters: Dict[str, EventReporter] = {}

        self._share_cnt = 1
        self._artifact_id = 1000
        self._span_id = 2000

        self._dry_run = dry_run
        self._num_buffers = num_buffers

        if not self._dry_run:
            self._result_dir.mkdir(parents=True, exist_ok=True)
            self._artifacts_dir.mkdir(exist_ok=True)

        self._event_record_callbacks: List[EventRecordCallback] = []

    def _get_artifact_id(self):
        self._artifact_id += 1
        return str(self._artifact_id)

    def next_span_id(self):
        self._span_id += 1
        return str(self._span_id)

    def save_artifact(self, p: SaveArtifactParam) -> ArtifactDataType:
        return _handle_save_artifact(
            p, self._artifacts_dir, self._get_artifact_id(), self._dry_run
        )

    def clone_artifact(self, src: ArtifactDataType, dest_name: str) -> ArtifactDataType:
        return _handle_clone_artifact(
            self._artifacts_dir, src, dest_name, self._dry_run
        )

    def register_callback(self, cb: "EventRecordCallback"):
        self._event_record_callbacks.append(cb)

    def record_event(self, evt: Event, reporter: str):
        if not self._dry_run:
            self._get_reporter(reporter).record_event(evt)

        _handle_run_callbacks(self._event_record_callbacks, evt, reporter)

    def share(self) -> "EventRecorder":
        self._share_cnt += 1
        return self

    def unshare(self):
        self._share_cnt -= 1
        if self._share_cnt == 0:
            self._finalize()

    def _finalize(self):
        for _, reporter in self._reporters.items():
            reporter.finalize()
        self._reporters = {}

    def __enter__(self):
        return self

    def __exit__(self, exc1, exc2, exc3):
        self._finalize()
        return

    def __del__(self):
        self._finalize()

    def _get_reporter(self, name: str):
        reporter = self._reporters.get(name, None)
        if not reporter:
            reporter = EventReporter(
                name,
                self._result_dir / f"{name}.event.json",
                num_buffers=self._num_buffers,
            )
            self._reporters[name] = reporter
        return reporter


class EventReporter(object):
    def __init__(self, name: str, out_file_path: Path, num_buffers: int = 10) -> None:
        """

        :param: num_buffer - every {num_buffer} events, write
        """
        self._name = name
        self._out_file = out_file_path.open("a+")
        self._num_buffers = num_buffers
        self._buffers: List[Event] = []

        self._evt_id = 0

    def record_event(self, evt: Event):
        evt.id = self._get_evt_id()
        self._buffers.append(evt)

        if len(self._buffers) > self._num_buffers:
            self._flush()

    def _flush(self):
        for evt in self._buffers:
            evt.write_json(self._out_file)
            self._out_file.write("\n")
        self._buffers = []
        self._out_file.flush()

    def _get_evt_id(self):
        self._evt_id += 1
        return str(self._evt_id)

    def finalize(self):
        self._flush()
        self._out_file.close()


# (event, reporter) -> ()
EventRecordCallback = Callable[[Event, str], None]


class MpEventRecorderMaster(object):
    def __init__(
        self, manager, result_dir: Path, dry_run: bool, num_buffers: int
    ) -> None:
        # the queue may be pickled, so we use manager (such as used in pool)
        self._queue = manager.Queue(maxsize=200)
        self._num_clients = mp.Value("i", 0)
        self._stopped_flag = mp.Event()
        self._started_flag = mp.Event()

        self._result_dir = result_dir
        self._dry_run = dry_run
        self._artifacts_dir = result_dir / "artifacts"
        self._num_buffers = num_buffers

        if not self._dry_run:
            self._result_dir.mkdir(exist_ok=True, parents=True)
            self._artifacts_dir.mkdir(exist_ok=True, parents=True)

    # This method should only be called in one process
    def start(self):
        if self._started_flag.is_set():
            raise ValueError(
                "can't call master.start() multiple times, may called in another process unexpectedly"
            )

        self._started_flag.set()
        clients_done = set()
        with LocalEventRecorder(
            result_dir=self._result_dir,
            dry_run=self._dry_run,
            num_buffers=self._num_buffers,
        ) as event_recorder:
            while True:
                try:
                    value = self._queue.get(timeout=3)
                except queue.Empty:
                    if self._stopped_flag.is_set():
                        break
                    continue

                if value[0] == "close":
                    clients_done.add(value[1])
                    # print(f"clients={sorted(clients_done, key=lambda x: int(x))}, num_clients={self._num_clients.value}")

                    # end loop if marked finished
                    if self._stopped_flag.is_set():
                        with self._num_clients.get_lock():
                            if len(clients_done) == self._num_clients.value:  # type: ignore
                                break
                    continue

                # handle task
                try:
                    evt, reporter = value[1]
                    event_recorder.record_event(evt, reporter)
                    pass
                except Exception:
                    lib_logger.warn("failed to handle task", exc_info=True)

        lib_logger.debug("event recorder master stopped")

    # Those methods May called in other processes
    def stop(self):
        self._stopped_flag.set()

    def create_client(self):
        if self._stopped_flag.is_set():
            raise ValueError("failed to create client, master is stopped")

        client_id = "<no-set>"
        with self._num_clients.get_lock():
            self._num_clients.value += 1  # type: ignore
            client_id = str(self._num_clients.value)  # type: ignore
        return MpEventRecorderClient(
            queue=self._queue,
            client_id=client_id,
            artifacts_dir=self._artifacts_dir,
            dry_run=self._dry_run,
        )
