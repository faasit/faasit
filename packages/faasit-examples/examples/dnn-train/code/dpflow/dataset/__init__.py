from dataclasses import dataclass
from typing import Any, Callable, Iterator, List, Literal, Optional, Protocol

# dataset


class IDpShuffledDataset(Protocol):
    def __len__(self) -> int: ...

    def __iter__(self) -> Iterator: ...


class IDpMappedDataset(Protocol):
    def __len__(self) -> int: ...

    def __getitem__(self, index) -> Any: ...


_T_CACHE_CONTROL = Literal["no-cache", "can-cache", "must-cache"]


@dataclass
class TDataLoadFlowStage:
    name: str
    cache_control: _T_CACHE_CONTROL
    fn: Callable[[Any], Any]


@dataclass
class TDataLoadFlowPrefetch:
    local_factor: int = 2
    remote_factor: int = 4


@dataclass
class TDataLoadFlowShuffle:
    batch_size: int
    collate_fn: Callable[[List[Any]], Any]
    drop_last: bool
    prefetch: TDataLoadFlowPrefetch


class IDataLoadFlowReader(Protocol):
    def read_mapped_source(self, flow: "TDataLoadFlow") -> IDpMappedDataset: ...

    def read_mapped(self, flow: "TDataLoadFlow") -> IDpMappedDataset: ...

    def read_shuffled(
        self, flow: "TDataLoadFlow", batch: TDataLoadFlowShuffle
    ) -> IDpShuffledDataset: ...

    def get_dataset_meta(self, flow: "TDataLoadFlow") -> "TDatasetMeta": ...


@dataclass
class TDatasetUse:
    name: str
    variant: str
    version: str = ""

@dataclass
class TDatasetMeta:
    # id: str
    name: str
    variant: str
    version: str
    length: int


@dataclass
class TDatasetSubset:
    indices: List[int]


@dataclass
class TDataLoadFlow:
    name: str
    version: int
    dataset_use: TDatasetUse
    stages: List[TDataLoadFlowStage]

    # local state
    local_mappers: List[Callable[[Any], Any]]
    subset: Optional[TDatasetSubset] = None

    def validate(self):
        assert self.name
        assert self.dataset_use.name
        assert self.dataset_use.variant
        assert ":" not in self.name

    def clone(self) -> "TDataLoadFlow":
        return TDataLoadFlow(
            name=self.name,
            version=self.version,
            dataset_use=self.dataset_use,
            stages=[*self.stages],
            local_mappers=[*self.local_mappers],
            subset=self.subset,
        )


    def __str__(self):
        f = self

        version = f.dataset_use.version or "v1"

        out = []
        out.append(f"Dataset({f.dataset_use.name}:{version}:{f.dataset_use.variant})")
        for m in f.stages:
            out.append(f"Map({m.name})")

        return " -> ".join(out)

    def __repr__(self) -> str:
        return str(self)



class IMapTransform(Protocol):
    def process_arg(self, arg) -> Any: ...

    def process_ret(self, arg, ret) -> Any: ...


class DataTransform(IMapTransform):
    def process_arg(self, arg) -> Any:
        return arg[0]

    def process_ret(self, arg, ret) -> Any:
        return ret, arg[1]


class TargetTransform(IMapTransform):
    def process_arg(self, arg) -> Any:
        return arg[1]

    def process_ret(self, arg, ret) -> Any:
        return arg[0], ret


class DataLoadFlow(object):
    def __init__(self, name: str, version: int = 0) -> None:
        self._flow = TDataLoadFlow(
            name=name,
            version=version,
            dataset_use=TDatasetUse("", ""),
            stages=[],
            local_mappers=[],
        )

    def dataset(self, name: str, variant="train", version=""):
        self._flow.dataset_use = TDatasetUse(
            name=name, variant=variant, version=version
        )
        return self

    def map(
        self,
        stage: str,
        fn: Callable[[Any], Any],
        transform: Optional[IMapTransform] = None,
        cache_control: _T_CACHE_CONTROL = "no-cache",
    ):
        handler = fn
        if transform:
            handler = lambda x: transform.process_ret(x, fn(transform.process_arg(x)))  # noqa: E731

        self._flow.stages.append(
            TDataLoadFlowStage(name=stage, cache_control=cache_control, fn=handler)
        )
        return self

    def map_data(
        self,
        stage: str,
        fn: Callable[[Any], Any],
        cache_control: _T_CACHE_CONTROL = "no-cache",
    ):
        return self.map(stage, fn, DataTransform(), cache_control)

    def map_target(
        self,
        stage: str,
        fn: Callable[[Any], Any],
        cache_control: _T_CACHE_CONTROL = "no-cache",
    ):
        return self.map(stage, fn, TargetTransform(), cache_control)

    def prepare_read(self, reader: IDataLoadFlowReader):
        flow = self._flow.clone()
        flow.validate()
        return DataLoadFlowRead(reader, flow)

    def prepare_compute(self):
        flow = self._flow.clone()
        flow.validate()
        return flow

    def validate(self) -> TDataLoadFlow:
        flow = self._flow.clone()
        flow.validate()
        return flow

    def __str__(self) -> str:
        return str(self._flow)



class DataLoadFlowRead(object):
    def __init__(self, reader: IDataLoadFlowReader, flow: TDataLoadFlow):
        self._reader = reader
        self._flow = flow

    def subset(self, indices: List[int]):
        # can be used to reject sampling
        self._flow.subset = TDatasetSubset(indices)
        return self

    def local_map(self, fn: Callable[[Any], Any]):
        self._flow.local_mappers.append(fn)
        return self

    def get_raw_flow(self):
        return self._flow

    def get_dataset_meta(self):
        return self._reader.get_dataset_meta(self._flow)

    def to_mapped_source(self):
        """returns source of dataset, used for debug"""
        return self._reader.read_mapped_source(self._flow)

    def to_mapped(self):
        return self._reader.read_mapped(self._flow)

    def to_shuffled(
        self,
        batch_size: int,
        collate_fn: Optional[Callable[[List[Any]], Any]] = None,
        drop_last=True,
        prefetch_local: int = 2,
        prefetch_remote: int = 3,
    ):
        assert batch_size > 0

        collate_fn = collate_fn or (lambda x: x)

        return self._reader.read_shuffled(
            self._flow,
            TDataLoadFlowShuffle(
                batch_size,
                collate_fn,
                drop_last,
                prefetch=TDataLoadFlowPrefetch(
                    local_factor=prefetch_local, remote_factor=prefetch_remote
                ),
            ),
        )

    def __str__(self) -> str:
        return str(self._flow)
