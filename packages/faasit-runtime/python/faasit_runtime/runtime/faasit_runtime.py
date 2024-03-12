from abc import ABC, abstractclassmethod
from typing import Any, Tuple

FaasitResult = Any

class FaasitRuntime(ABC):
    def __init__(self) -> None:
        super().__init__()
        self.event = None
    
    @abstractclassmethod
    def input(self):
        pass

    @abstractclassmethod
    def output(self) -> FaasitResult:
        pass

    @abstractclassmethod
    def call(self) -> FaasitResult:
        pass

    @abstractclassmethod
    async def tell(self):
        pass