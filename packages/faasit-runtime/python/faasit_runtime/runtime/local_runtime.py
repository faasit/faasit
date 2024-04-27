from faasit_runtime.runtime.faasit_runtime import (
    FaasitRuntime, 
    InputType,
    CallResult,
    StorageMethods,
    FaasitRuntimeMetadata
)
import requests
import redis

class LocalRuntime(FaasitRuntime):
    name: str = 'local'
    def __init__(self, data, metadata:FaasitRuntimeMetadata) -> None:
        super().__init__()
        self._input = data
        self._storage = self.LocalStorage()
        self._metadata = metadata

    def input(self):
        return self._input

    def output(self, _out):
        return _out

    def metadata(self):
        return self._metadata

    async def call(self, fnName: str, fnParams: InputType) -> CallResult:
        resp = requests.post(
            f"http://{fnName}:9000", 
            json=fnParams, 
            headers={'Content-Type': 'application/json'}
        )
        result = resp.json()
        return result

    async def tell(self, fnName: str, fnParams: InputType):
        # 异步发送一个HTTP请求
        requests.post(
            f"http://{fnName}:9000", 
            json=fnParams, 
            headers={'Content-Type': 'application/json'}
        )
        pass

    @property
    def storage(self) -> StorageMethods:
        return self._storage

    class LocalStorage(StorageMethods):
        def __init__(self) -> None:
            self.redis_client = redis.Redis(host='redis', port=6379, db=0)
            pass

        async def set(self, key: str, value: str) -> None:
            self.redis_client.set(key, value)
            pass

        async def get(self, key: str) -> str:
            return self.redis_client.get(key)

        async def delete(self, key: str) -> None:
            self.redis_client.delete(key)
            pass

        async def list(self) -> list:
            return [key.decode('utf-8') for key in self.redis_client.keys()]

        async def exists(self, key: str) -> bool:
            return self.redis_client.exists(key)


        