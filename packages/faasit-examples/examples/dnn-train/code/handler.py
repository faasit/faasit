from typing import Any
from pydantic import BaseModel
from dpflow.faas import FaasitRuntime, function
import logging


def parse_logging_level(level: str):
    return getattr(logging, level.upper())


class HandlerInput(BaseModel):
    # train-cls-resnet
    task_name: str
    task_config: Any
    logging_level: str = "info"
    dry_run: bool = False


@function
def handler(frt: FaasitRuntime):
    from training.tasks import run_dnn_task

    input = HandlerInput.model_validate(frt.input())

    logging.basicConfig(
        level=parse_logging_level(input.logging_level),
        format="[%(levelname)s] <%(name)s> %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        force=True,
    )

    out = run_dnn_task(input.task_name, input.task_config, input.dry_run)

    return frt.output({"output": out})
