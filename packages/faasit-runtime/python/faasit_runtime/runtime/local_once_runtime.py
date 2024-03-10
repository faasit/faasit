from faasit_runtime.runtime.faasit_runtime import FaasitRuntime


class LocalOnceRuntime(FaasitRuntime):
    name: str = 'local'
    def __init__(self, data) -> None:
        super().__init__()
        self._input = data

    def input(self):
        return self._input

    def output(self, _out):
        return _out

    def call(self):
        pass

    def tell(self):
        pass