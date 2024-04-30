import contextlib
import gzip
import math
from pathlib import Path
import pickle
import random
from time import perf_counter_ns
from typing import Any, Dict, List, Tuple, Union
from dpflow import utils
from dpflow.dataset import DataLoadFlowRead

from pydantic import BaseModel


class OneStepTimer:
    def __init__(self, start_ns: int) -> None:
        self._start_ns = start_ns
        self._stop_ns = None

    def stop(self):
        self._stop_ns = perf_counter_ns()

    def elapsed_ns(self):
        if not self._stop_ns:
            raise ValueError("timer not stopped, must can after with statement")
        return self._stop_ns - self._start_ns

    def elapsed_us(self):
        return self.elapsed_ns() // 1000


class StepTimer:
    def __init__(self) -> None:
        self._abs_start_ns = perf_counter_ns()

    def elapsed_ns(self):
        return perf_counter_ns() - self._abs_start_ns

    @contextlib.contextmanager
    def step(self):
        timer = OneStepTimer(start_ns=self._abs_start_ns)
        try:
            yield timer
        finally:
            timer.stop()


class StageProfileItem(BaseModel):
    elapsed_us: int
    size_bytes: int


class ProfileItem(BaseModel):
    key: Any
    stages: List[StageProfileItem]

    def total_elapsed_us(self):
        return sum([stage.elapsed_us for stage in self.stages])

    def result_bytes(self):
        return self.stages[-1].size_bytes

    def max_bytes(self):
        return max([stage.size_bytes for stage in self.stages])


class ProfiledDataset(object):
    def __init__(self, flow: DataLoadFlowRead) -> None:
        super().__init__()

        self._dataset = flow.to_mapped_source()
        self._flow = flow
        self._profiles: Dict[Any, ProfileItem] = {}

    def get_stage_names(self):
        stages: List[str] = ["source"]

        flow = self._flow.get_raw_flow()
        for stage in flow.stages:
            stages.append(stage.name)

        for i in flow.local_mappers:
            stages.append(f"local-map-{i}")

        return stages

    def profile_getitem(self, index) -> Tuple[Any, ProfileItem]:
        gtimer = StepTimer()

        profile = ProfileItem(key=index, stages=[])

        with gtimer.step() as timer:
            item = self._dataset[index]

        size_bytes = utils.estimate_byte_size(item)
        profile.stages.append(
            StageProfileItem(elapsed_us=timer.elapsed_us(), size_bytes=size_bytes)
        )

        flow = self._flow.get_raw_flow()

        funcs = [stage.fn for stage in flow.stages]
        funcs.extend(flow.local_mappers)

        for func in funcs:
            with gtimer.step() as timer:
                item = func(item)

            size_bytes = utils.estimate_byte_size(item)
            profile.stages.append(
                StageProfileItem(elapsed_us=timer.elapsed_us(), size_bytes=size_bytes)
            )

        return (item, profile)


def profile_dataset(
    dflow: DataLoadFlowRead,
    result_dir: Union[Path, str, None] = None,
    dry_run=False,
    sample_ratio=0.001,
):
    import ztracker
    import snappy

    utils.disable_multi_thread()

    dataset = dflow.to_mapped_source()

    num_samples = max(math.floor(len(dataset) * sample_ratio), 1000)
    num_samples = min(len(dataset), num_samples)

    pdataset = ProfiledDataset(dflow)

    with ztracker.create(result_dir, dry_run=dry_run, num_buffers=2) as tracker:
        tracker = tracker.with_settings(reporter="profile", move=True)
        tracker.track_config(
            {
                "sample_ratio": sample_ratio,
                "num_samples": num_samples,
                "stage_names": pdataset.get_stage_names(),
            },
            "profile",
        )

        indices = list(range(num_samples))
        random.shuffle(indices)

        for idx in indices:
            item, profile = pdataset.profile_getitem(idx)

            item_pickle_bytes = pickle.dumps(item)
            compressed_pickle_bytes = snappy.compress(item_pickle_bytes)

            tracker.with_fields(
                {
                    **profile.model_dump(),
                    "total_us": profile.total_elapsed_us(),
                    "result_bytes": profile.result_bytes(),
                    "max_bytes": profile.max_bytes(),
                    "result_pickle_bytes": len(item_pickle_bytes),
                    "compressed_pickle_bytes": len(compressed_pickle_bytes)
                }
            ).track(meta={"t": "p"}).info("compute item", exclude_fields=["stages"])
