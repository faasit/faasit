# Helpers

from dataclasses import dataclass
import logging
from typing import Any, Dict, Protocol, Tuple, Type

from pydantic import BaseModel


@dataclass
class TaskContext:
    logger: logging.Logger


class BaseTask(Protocol):
    class Config(BaseModel):
        pass

    def run(self, ctx: TaskContext, cfg: Any):
        raise NotImplementedError


class TaskStore:
    def __init__(self) -> None:
        self.stores: Dict[str, Type[BaseTask]] = {}

    def task(self):
        def decorator(cls):
            self.stores[cls.__name__] = cls
            return cls

        return decorator

    def get_task(self, name: str) -> Tuple[Type[BaseTask], Type[BaseModel]]:
        task_cls = self.stores.get(name)
        if not task_cls:
            raise ValueError(f"no such task={name}, valid={self.stores.keys()}")

        return (task_cls, task_cls.Config)
