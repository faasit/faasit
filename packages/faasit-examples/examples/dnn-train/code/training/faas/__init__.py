import asyncio
from concurrent.futures import ProcessPoolExecutor
import re
from training.utils import rpc
from training.conf_utils import ResolvedConfigRoot
from pydantic import BaseModel
from typing import Any
import os
import logging

from training import conf_utils


def get_ips():
    ips = []
    output = os.popen("ip addr").read()
    matches = re.findall(r"inet (\d+\.\d+\.\d+\.\d+)/\d+", output)
    for match in matches:
        ips.append(match)
    return ips


class TRunReq(BaseModel):
    config_name: str = "train-od-ssd"
    # like TrainOdSsdTask
    task_name: str = ""
    task_config: Any = None


class WorkloadRpcService:
    def __init__(self, default_configs: ResolvedConfigRoot) -> None:
        self._logger = logging.getLogger(self.__class__.__name__)
        self._default_configs = default_configs
        self._invoked = False

        # print ips
        self._logger.info(f"Available IPs: {get_ips()}")

    @rpc.rpc_method(default=True)
    async def invoke(self, reqd: rpc.RpcRequest):
        if self._invoked:
            raise ValueError("Task is already running")

        req = reqd.to_pydantic(TRunReq)

        self._logger.info(f"Received request: {req}")

        if req.config_name:
            self._logger.info(f"Using config {req.config_name}")
            config = self._default_configs.get_config(req.config_name).task
        else:
            assert req.task_name and req.task_config
            config = conf_utils.ConfigTask(name=req.task_name, config=req.task_config)

        os.environ.setdefault("FAASIT_PROVIDER", "shell")
        from handler import HandlerInput, handler

        input = HandlerInput(
            task_name=config.name,
            task_config=config.config,
            dry_run=False,
        ).model_dump()

        # invoke and wait for result
        self._invoked = True
        try:
            loop = asyncio.get_running_loop()
            with ProcessPoolExecutor(max_workers=1) as executor:
                try:
                    result = await loop.run_in_executor(executor, handler, input)
                    return result
                except KeyboardInterrupt:
                    executor.shutdown(wait=False)
        finally:
            self._invoked = False
