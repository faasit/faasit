from faasit_runtime.runtime.faasit_runtime import FaasitRuntime
from faasit_runtime.workflow import WorkFlowRunner
from typing import Any


class LocalOnceRuntime(FaasitRuntime):
    name: str = 'local-once'
    def __init__(self, data, workflow_runner: WorkFlowRunner = None) -> None:
        super().__init__()
        self._input = data
        self._workflow_runner = workflow_runner

    def set_workflow(self, workflow_runner: WorkFlowRunner):
        self._workflow_runner = workflow_runner
        return workflow_runner

    def input(self):
        return self._input

    def output(self, _out):
        return _out

    def call(self, fn_name:str, event: dict):
        if self._workflow_runner == None:
            raise Exception("workflow is not defined")
        return self._workflow_runner.route(fn_name)(event)

    def tell(self):
        pass