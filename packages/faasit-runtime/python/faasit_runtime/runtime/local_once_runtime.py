from faasit_runtime.runtime.faasit_runtime import (
    FaasitRuntime,
    CallParams,
    TellParams,
    CallResult,
    InputType,
    FaasitRuntimeMetadata,
)
from faasit_runtime.workflow import WorkFlowRunner
from typing import Any


class LocalOnceRuntime(FaasitRuntime):
    name: str = 'local-once'
    def __init__(self, 
                 data, 
                 workflow_runner: WorkFlowRunner = None, 
                 metadata: FaasitRuntimeMetadata = None) -> None:
        super().__init__()
        self._input = data
        self._workflow_runner = workflow_runner
        self._metadata = metadata

    def set_workflow(self, workflow_runner: WorkFlowRunner):
        self._workflow_runner = workflow_runner
        return workflow_runner

    def input(self):
        return self._input

    def output(self, _out):
        return _out

    async def call(self, fnName:str, fnParams: InputType) -> CallResult:
        fnParams: CallParams = CallParams(
            input=fnParams
        )
        event = fnParams.input
        seq = fnParams.seq
        if self._workflow_runner == None:
            raise Exception("workflow is not defined")
        metadata = self.helperCollectMetadata("call", fnName, fnParams)

        callerName = self._metadata.funcName
        print(f"[function call] {callerName} -> {fnName}")
        print(f"[call params] {event}")

        handler = self._workflow_runner.route(fnName)

        result = await handler(event, self._workflow_runner, metadata)

        from faasit_runtime.durable import DurableWaitingResult
        if isinstance(result, DurableWaitingResult):
            result = await result.waitResult()

        return result

    async def tell(self, fnName:str, fnParams: TellParams) -> Any:
        # fnParams = TellParams(**fnParams)
        event = fnParams.input
        if self._workflow_runner == None:
            raise Exception("workflow is not defined")
        metadata:FaasitRuntimeMetadata = self.helperCollectMetadata("tell", fnName, fnParams)
        # print(f"[Debug] {metadata.dict()}")
        callerName = self._metadata.funcName

        print(f"[function tell] {callerName} -> {fnName}")
        print(f"[tell params] {event}")
        async def task():
            handler = self._workflow_runner.route(fnName)
            nonlocal metadata
            result = await handler(event, self._workflow_runner, metadata)
            from faasit_runtime.durable import DurableWaitingResult
            if isinstance(result, DurableWaitingResult):
                result = await result.waitResult()
            # callback
            if metadata.invocation.callback.ctx.kind == 'durable-orchestrator-callback':
                handler = self._workflow_runner.route(callerName)
                callbackParams = TellParams(
                    input=result,
                    responseCtx=metadata.invocation.callback.ctx,
                    callback=None
                )
                callbackMetadata = self.helperCollectMetadata("tell", callerName, callbackParams)
                result = await handler(result, self._workflow_runner, callbackMetadata)

            return result
        return task