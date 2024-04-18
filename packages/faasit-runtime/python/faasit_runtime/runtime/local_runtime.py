from faasit_runtime.runtime.faasit_runtime import (
    FaasitRuntime, 
    InputType,
    CallResult
)
import requests

class LocalRuntime(FaasitRuntime):
    name: str = 'local'
    def __init__(self, data) -> None:
        super().__init__()
        self._input = data

    def input(self):
        return self._input

    def output(self, _out):
        return _out

    async def call(self, fnName: str, fnParams: InputType) -> CallResult:
        resp = requests.post(f"http://{fnName}:9000", json=fnParams, headers={'Content-Type': 'application/json'})
        return resp.json()

    def tell(self):
        pass