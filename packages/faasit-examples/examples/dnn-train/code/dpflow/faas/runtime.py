import os
from typing import Any, Protocol
import pydantic


class FunctionContainerConf(pydantic.BaseModel):
    provider: str

    @staticmethod
    def parse_env(env: os._Environ):
        # same interface as FAASIT-RT
        return FunctionContainerConf(provider=env.get("FAASIT_PROVIDER", ""))


class FaasitRuntime(Protocol):
    def input(self) -> dict:
        ...

    def output(self, obj: Any):
        ...


class ShellFaasitRuntime(FaasitRuntime):
    def __init__(self, event) -> None:
        super().__init__()
        self._event = event

    def input(self) -> dict:
        return self._event

    def output(self, obj: Any):
        return obj


def create_runtime(conf: FunctionContainerConf, *args, **kwargs) -> FaasitRuntime:
    match conf.provider:
        case "shell":
            return ShellFaasitRuntime(event=args[0])
        case _:
            raise ValueError(f"Unknown provider: {conf.provider}")
