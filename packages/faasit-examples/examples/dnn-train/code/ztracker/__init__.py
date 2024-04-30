import logging
from pathlib import Path
from typing import Optional, Union
from ztracker.event_recorder import LocalEventRecorder
from ztracker.reader import Reader
from ztracker.tracker import (
    MultiProcessTrackerManager,
    SaveFunc,
    Tracker,
    TrackerSetting,
    DotDict,
    RoundRobinIDPool,
)
from ztracker.datatype import Event


def create(
    result_dir: Union[str, Path, None], dry_run=False, num_buffers=10
) -> Tracker:
    import time

    if not dry_run and not result_dir:
        raise ValueError("must specify result dir when dry_run=False")

    result_dir = Path(result_dir or "ztracker")
    recorder = LocalEventRecorder(result_dir, dry_run=dry_run, num_buffers=num_buffers)

    return Tracker(
        recorder=recorder,
        logger=logging.getLogger("ztracker"),
        settings=TrackerSetting("default", {}),
        fields={},
        perf_timer_ns=time.perf_counter_ns(),
    )


def create_mp(
    result_dir: Union[str, Path], dry_run=False, num_buffers=10
) -> MultiProcessTrackerManager:
    result_dir = Path(result_dir)
    return MultiProcessTrackerManager(
        result_dir=result_dir, dry_run=dry_run, num_buffers=num_buffers
    )


def reader(result_dir: Union[str, Path]) -> Reader:
    result_dir = Path(result_dir)

    return Reader(
        result_dir=result_dir,
    )


__all__ = [
    "Tracker",
    "Reader",
    "Event",
    "DotDict",
    "RoundRobinIDPool",
    "create",
    "reader",
    "str_datetime",
    "saver_yaml",
]


# Utility functions


def str_datetime() -> str:
    import time

    return time.strftime("%Y%m%d-%H%M%S", time.localtime())


def float_to_fixed(val: float, digits: int) -> float:
    """Return float with at-most num of digits.

    >>> float_to_fixed(1.234, 2)
    1.23
    >>> float_to_fixed(1.0, 3)
    1.0
    """
    num = 10**digits
    return int(val * num) // num


def saver_yaml() -> SaveFunc:
    def saver(data, path: Path):
        import yaml

        with path.open("w") as f:
            yaml.dump(data, f)

    return saver


def saver_json(indent: Optional[str] = None) -> SaveFunc:
    def saver(data, path: Path):
        import json

        with path.open("w") as f:
            json.dump(data, f, indent=indent)

    return saver


def saver_torch_model() -> SaveFunc:
    def saver(data, path: Path):
        import torch

        torch.save(data, path)

    return saver


def encode_pydantic(data):
    return data.dict()


def encode_pydantic_list(data):
    return [item.dict() for item in data]


if __name__ == "__main__":
    import doctest

    doctest.testmod()
