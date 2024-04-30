import random
from typing import Any, Callable, Dict
from dpflow.dataset import (
    IDpMappedDataset,
    IDpShuffledDataset,
    IDataLoadFlowReader,
    TDataLoadFlow,
    TDataLoadFlowShuffle,
    TDatasetMeta,
)


class _LocalDpMappedDataset(IDpMappedDataset):
    def __init__(self, dataset: IDpMappedDataset, flow: TDataLoadFlow):
        self._dataset = dataset
        self._flow = flow

        self._index_func = lambda i: i
        if flow.subset:
            indices = flow.subset.indices
            self._index_func = lambda i: indices[i]
        self._length = len(flow.subset.indices) if flow.subset else len(dataset)

    def __getitem__(self, index) -> Any:
        idx = self._index_func(index)
        data = self._dataset[idx]

        # map data
        for stage in self._flow.stages:
            data = stage.fn(data)

        for mapper in self._flow.local_mappers:
            data = mapper(data)

        return data

    def __len__(self) -> int:
        return self._length


class _LocalDpShuffledDataset(IDpShuffledDataset):
    def __init__(
        self,
        dataset: IDpMappedDataset,
        flow: TDataLoadFlow,
        _shuffle: TDataLoadFlowShuffle,
    ) -> None:
        self._dp_dataset = _LocalDpMappedDataset(dataset, flow)
        self._flow = flow
        self._shuffle = _shuffle

        # state
        self._indices = list(range(len(self._dp_dataset)))

        ## shuffle
        random.shuffle(self._indices)
        length, remain = divmod(len(self._indices), self._shuffle.batch_size)
        if remain > 0 and not _shuffle.drop_last:
            length = length + 1
        self._length = length

    def __iter__(self):
        batch_size = self._shuffle.batch_size
        collate_fn = self._shuffle.collate_fn

        for i in range(0, len(self._indices), batch_size):
            batch_indices = self._indices[i : i + batch_size]
            batch_data = [self._dp_dataset[idx] for idx in batch_indices]
            if len(batch_data) < batch_size and self._shuffle.drop_last:
                break
            yield collate_fn(batch_data)

    def __len__(self) -> int:
        return self._length


# def (name: str, variant: str) -> IDpMappedDatasets
LocalDatasetFactory = Callable[[str, str], IDpMappedDataset]


class LocalDatasetFlowReader(IDataLoadFlowReader):
    def __init__(self) -> None:
        self._datasets: Dict[str, LocalDatasetFactory] = {}

    def add_dataset_factory(self, name: str, dataset: LocalDatasetFactory):
        if name in self._datasets:
            raise ValueError(f"Dataset with name {name} already exists")
        self._datasets[name] = dataset

    def get_dataset_meta(self, flow: TDataLoadFlow) -> TDatasetMeta:
        dataset = self._get_dataset(flow)
        version = flow.dataset_use.version if flow.dataset_use.version else "v1"
        return TDatasetMeta(
            # id=f"{flow.dataset_use.name}:{flow.dataset_use.variant}:{version}",
            name=flow.dataset_use.name,
            variant=flow.dataset_use.variant,
            version=version,
            length=len(dataset),
        )

    def read_mapped_source(self, flow: TDataLoadFlow) -> IDpMappedDataset:
        return self._get_dataset(flow)

    def read_mapped(self, flow: TDataLoadFlow) -> IDpMappedDataset:
        return _LocalDpMappedDataset(self._get_dataset(flow), flow)

    def read_shuffled(
        self, flow: TDataLoadFlow, _shuffle: TDataLoadFlowShuffle
    ) -> IDpShuffledDataset:
        return _LocalDpShuffledDataset(self._get_dataset(flow), flow, _shuffle)

    def _get_dataset(self, flow: TDataLoadFlow):
        factory = self._datasets[flow.dataset_use.name]
        return factory(flow.dataset_use.name, flow.dataset_use.variant)
