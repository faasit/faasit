from faasit_runtime.runtime import FaasitRuntime

class AliyunRuntime(FaasitRuntime):
    name: str = 'aliyun'
    def __init__(self, arg0, arg1) -> None:
        super().__init__()
        self.event = arg0
        self.context = arg1

    def input(self):
        return str(self.event)

    def output(self, data):
        return data

    def call(self):
        pass

    def tell(self):
        pass