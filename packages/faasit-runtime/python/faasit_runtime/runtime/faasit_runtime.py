from abc import ABC, abstractclassmethod
from typing import Any

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
    def call(self):
        pass

    @abstractclassmethod
    def tell(self):
        pass