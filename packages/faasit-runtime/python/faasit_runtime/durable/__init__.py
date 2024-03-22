from faasit_runtime.runtime import FaasitRuntime

class Durable:
    def __init__(self, frt: FaasitRuntime):
        self.frt = frt

    def call(self, event:dict):
        self.frt.call(event)

def durable(fn):
    def handler(frt: FaasitRuntime):
        dfrt = Durable(frt)
        
        return fn(dfrt)
    return handler

__all__ = [
    "durable"
]