from io import BytesIO
import logging
from os import path
import pathlib
from typing import Any, Dict, Optional, Protocol, Tuple
import pydantic
import dpflow
from dpflow.dataset import IDpMappedDataset, spec_types
from dpflow.dataset_readers import LocalDatasetFlowReader
import cachetools

import dpflow.utils


class CDatasetAddress(pydantic.BaseModel):
    class S3Address(pydantic.BaseModel):
        endpoint_url: str
        access_key_id: str
        access_key_secret: str

    class FsAddress(pydantic.BaseModel):
        root_dir: str

    dataset_store_path: str
    s3: Optional[S3Address] = None
    fs: Optional[FsAddress] = None

    def split_s3_data_path(self) -> Tuple[str, str]:
        """
        :return (bucket, prefix)
        """
        data_path = self.dataset_store_path
        if self.dataset_store_path.startswith("_"):
            data_path = data_path[1:]

        bucket, prefix = data_path.split("/", 1)
        return (bucket, prefix)

    def get_mode(self) -> str:
        if self.s3:
            return "s3"
        if self.fs:
            return "fs"
        return "none"


class CDatasetUse(pydantic.BaseModel):
    name: str
    variant: str
    addr: CDatasetAddress


class IStorageReader(Protocol):
    """Provide API to access underlying storage (fs or s3)"""

    def get_content(self, key: str) -> bytes:
        ...


class S3StorageReader(IStorageReader):
    def __init__(
        self, addr: CDatasetAddress, s3_addr: CDatasetAddress.S3Address
    ) -> None:
        import boto3

        self.s3_addr = s3_addr
        self.s3_bucket, self.s3_prefix = addr.split_s3_data_path()

        self.s3_client = boto3.client(
            "s3",
            endpoint_url=s3_addr.endpoint_url,
            aws_access_key_id=s3_addr.access_key_id,
            aws_secret_access_key=s3_addr.access_key_secret,
            config=boto3.session.Config(s3={"addressing_style": "virtual"}),  # type: ignore
        )

    def get_content(self, key: str) -> bytes:
        if self.s3_prefix:
            real_key = self.s3_prefix + "/" + key
        else:
            real_key = key

        resp = self.s3_client.get_object(Bucket=self.s3_bucket, Key=real_key)
        file_stream = resp["Body"]
        return file_stream.read()


class FsStorageReader(IStorageReader):
    def __init__(self, dataset_store_dir: str) -> None:
        self._dataset_store_dir = pathlib.Path(dataset_store_dir)

    def get_content(self, key: str) -> bytes:
        return self._dataset_store_dir.joinpath(key).read_bytes()


def create_storage_reader(addr: CDatasetAddress) -> IStorageReader:
    if addr.fs and addr.s3:
        raise ValueError("only one of fs or s3 should be specified")

    if addr.fs:
        root_dir = path.expanduser(addr.fs.root_dir)
        data_store_dir = path.join(root_dir, addr.dataset_store_path)
        return FsStorageReader(data_store_dir)

    if addr.s3:
        return S3StorageReader(addr, addr.s3)

    raise ValueError("either fs or s3 should be specified")


class UnifieddpflowDataset(IDpMappedDataset):
    def __init__(self, dataset: CDatasetUse, preload_meta: bool = False) -> None:
        # self._logger = logging.getLogger("UDD")
        self._logger = dpflow.utils.DummyLogger()

        self._dataset = dataset
        self._reader = create_storage_reader(dataset.addr)

        self._logger.info("created storage reader")

        self._dataset_formed_name = dataset.name

        # read spec json
        spec_key = f"{self._dataset_formed_name}/spec.json"
        spec_json = self._reader.get_content(spec_key)
        # print(dataset.name, self._dataset_formed_name, spec_key, spec_json)

        self._spec = spec_types.CoreV1Dataset.model_validate_json(spec_json)

        self._logger.info("read dataset spec")

        variant = None
        for spec_var in self._spec.spec.variants:
            if spec_var.name == dataset.variant:
                variant = spec_var
                break

        if not variant:
            raise ValueError(
                f"dataset {dataset.name} with variant {dataset.variant} not found in spec"
            )
        self._variant = variant

        # TODO: using LRU
        # self._meta_cache: Dict[int, spec_types.CoreV1DatasetMetaShard] = {}
        self._meta_cache = cachetools.LRUCache(maxsize=20)

        self._data_key_prefix = path.join(
            self._dataset_formed_name, self._variant.data_path
        )
        self._meta_key_prefix = path.join(
            self._dataset_formed_name, self._variant.meta_path
        )

        self._logger.info(
            f"init udd ok dataset={dataset.name} variant={dataset.variant} mode={dataset.addr.get_mode()}"
        )

        if preload_meta:
            shard_count = self._variant.length // self._variant.meta_shard_size + 1
            self._logger.info("preloading meta")
            for i in range(shard_count):
                self._get_meta_by_shard(i)
            self._logger.info("preloading meta done")

    def __len__(self) -> int:
        return self._variant.length

    def __getitem__(self, index) -> Any:
        meta = self._get_meta_by_index(index)

        data_key = path.join(self._data_key_prefix, meta.key)

        data = self._reader.get_content(data_key)
        return data, meta.target

    def _get_meta_by_index(
        self, index: int
    ) -> spec_types.CoreV1DatasetMetaShardSpec.TData:
        # calculate shard
        shard_idx, shard_no = divmod(index, self._variant.meta_shard_size)
        meta = self._get_meta_by_shard(shard_idx)
        return meta.spec.datas[shard_no]

    def _get_meta_by_shard(self, shard_idx: int):
        meta = self._meta_cache.get(shard_idx, None)
        if not meta:
            self._logger.info(f"loading meta shard ms-{shard_idx}")
            # load meta shard
            meta_key = path.join(self._meta_key_prefix, f"ms-{shard_idx}.json")
            meta = spec_types.CoreV1DatasetMetaShard.model_validate_json(
                self._reader.get_content(meta_key)
            )
            self._meta_cache[shard_idx] = meta
        return meta


def get_dataflow_local_reader(addr: CDatasetAddress):
    reader = LocalDatasetFlowReader()

    dataset_names = [
        "core/cifar100",
        "core/got-10k",
        "core/imagenet-1k",
        "core/mini-imagenet",
        "core/libri-speech",
        "core/mscoco",
    ]

    for name in dataset_names:
        reader.add_dataset_factory(
            name,
            lambda name, variant: UnifieddpflowDataset(
                CDatasetUse(name=name, variant=variant, addr=addr)
            ),
        )

    return reader
