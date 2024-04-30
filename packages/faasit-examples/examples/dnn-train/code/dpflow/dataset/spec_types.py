from typing import Any, List
from pydantic import BaseModel, Field

## Resource Objects


class ResourceMetadata(BaseModel):
    name: str


class ResourceObject(BaseModel):
    api_version: str
    kind: str
    metadata: ResourceMetadata


## ResourceSpec


class CoreV1DatasetStoreSpec(BaseModel):
    class TDataset(BaseModel):
        name: str

    datasets: List[TDataset]


class CoreV1DatasetSpec(BaseModel):
    class TVariant(BaseModel):
        name: str
        length: int = 0  # can be filled later
        meta_shard_size: int
        data_path: str
        meta_path: str
        extra: Any = Field(default_factory=dict)

    version: str
    extra: Any
    variants: List[TVariant]


class CoreV1DatasetMetaShardSpec(BaseModel):
    class TData(BaseModel):
        key: str
        target: Any

    datas: List[TData]


class CoreV1DatasetStore(ResourceObject):
    api_version: str = "core/v1"
    kind: str = "DatasetStore"
    spec: CoreV1DatasetMetaShardSpec


class CoreV1Dataset(ResourceObject):
    api_version: str = "core/v1"
    kind: str = "Dataset"
    spec: CoreV1DatasetSpec


class CoreV1DatasetMetaShard(ResourceObject):
    api_version: str = "core/v1"
    kind: str = "DatasetMetaShard"
    spec: CoreV1DatasetMetaShardSpec
