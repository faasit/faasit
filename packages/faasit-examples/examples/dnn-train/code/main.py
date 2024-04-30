## Running locally
import asyncio
import logging
import os

import _hacked  # noqa
import fire
from _hacked import script_dir
from training import conf_utils

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    force=True,
)

DEFAULT_CONFIG_DIR = script_dir.joinpath("config").as_posix()


class CommandLine:
    def run_aliyun(
        self, name: str = "train-cls-resnet", port: int = 9000, invoke: bool = False
    ):
        configs = conf_utils.read_configs(DEFAULT_CONFIG_DIR, os.environ, [])

        from training.faas import WorkloadRpcService
        from training.utils import rpc

        service = WorkloadRpcService(configs)

        async def invoke_worker():
            if invoke:
                await asyncio.sleep(0.5)
                client = rpc.RpcClient(f"http://localhost:{port}")
                reply = await client.acall.invoke("invoke", dict(config_name=name))
                print(reply)

        async def main():
            await asyncio.gather(
                rpc.start_async_rpc_server(service, port=port), invoke_worker()
            )

        rpc.graceful_async_run(main())

        # rpc.start_rpc_server(service, port=port)

    def run(
        self,
        name: str = "train-cls-resnet",
        config_dir: str = DEFAULT_CONFIG_DIR,
        dry_run: bool = False,
        v: str = "",
    ):
        configs = conf_utils.read_configs(
            config_dir, os.environ, v.split(","), includes=[name]
        )
        config = configs.get_config(name)

        os.environ.setdefault("FAASIT_PROVIDER", "shell")

        from handler import HandlerInput, handler

        handler(
            HandlerInput(
                task_name=config.task.name,
                task_config=config.task.config,
                dry_run=dry_run,
            ).model_dump()
        )

    def conf(self, config_dir: str = DEFAULT_CONFIG_DIR, v: str = ""):
        print(v)

        configs = conf_utils.read_configs(config_dir, os.environ, v.split(","))

        print(conf_utils.to_yaml(configs))


if __name__ == "__main__":
    fire.Fire(CommandLine)
