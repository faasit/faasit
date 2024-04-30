import itertools
from pathlib import Path
from typing import Any, Callable, Dict, List

from ztracker.datatype import Event


class EventFileReader(object):
    """It is responsible for read one event file"""

    def __init__(self, name: str, event_file_path: Path) -> None:
        self._name = name
        self._event_file_path = event_file_path
        self._filters = []

    def add_filter(self, cb: Callable[[Event], bool]):
        self._filters.append(cb)
        return self

    def iter_read(self):
        with self._event_file_path.open("r") as _event_file:
            while True:
                line = _event_file.readline()
                # eof
                if not line:
                    return None

                event = Event.from_json(line)

                filtered = True
                for filter in self._filters:
                    if not filter(event):
                        filtered = False
                        break

                if not filtered:
                    continue

                yield event

    def read_all(self) -> List[Event]:
        events = []

        for event in self.iter_read():
            events.append(event)
        return events

    def datas_to_pandas(self, stop=None, normalize_json=False):
        import pandas as pd

        datas = []

        it = itertools.islice(self.iter_read(), stop)
        datas = [evt.data for evt in it]

        if normalize_json:
            return pd.json_normalize(datas)
        return pd.DataFrame(datas)


class Reader(object):
    """Reader used to read tracked events directories and files"""

    def __init__(self, result_dir: Path) -> None:
        self._result_dir = result_dir

    def event_reader(self, reporter: str = "default") -> EventFileReader:
        event_file_path = self._result_dir / f"{reporter}.event.json"
        if not event_file_path.exists():
            raise ValueError(
                f"event reporter file, reporter={reporter}, path={event_file_path.as_posix()} not exists"
            )
        return EventFileReader(reporter, event_file_path)
