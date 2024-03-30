from faasit_runtime.runtime import (
    FaasitRuntime,
    FaasitRuntimeMetadata,
    LocalOnceRuntime
)
from faasit_runtime.durable.state import (
    ScopedDurableStateClient,
    DurableFunctionState,
    Action
)
from faasit_runtime import function
from faasit_runtime.durable.runtime import DurableRuntime,DurableException
from faasit_runtime.durable.context import DurableCallbackContext,parseDurableCallbackContext
from faasit_runtime.durable.metadata import DurableMetadata,OrchestratorMetadata
from typing import Coroutine,Any,Awaitable

def createOrchestratorScopedId(orcheId:str):
    return f"orchestrator::__state__::{orcheId}"

class DurableWaitingResult:
    def __init__(self,task,state,client) -> None:
        self._task = task
        self._state:DurableFunctionState = state
        self._client: ScopedDurableStateClient = client
        pass
    async def waitResult(self):
        result = await self._task()
        if isinstance(result,DurableWaitingResult):
            result = await result.waitResult()
        # if not isinstance(result,DurableWaitingResult):
        #     await self._state.saveResult(self._client,result)
        return result

def durable(fn):
    # fn = function(fn)
    client = ScopedDurableStateClient()
    state = DurableFunctionState()
    async def handler(event: dict,
                      workflow_runner = None,
                      metadata = None):
        frt = LocalOnceRuntime(event,workflow_runner,metadata)
        frt_metadata: FaasitRuntimeMetadata = frt.metadata()
        # print(f"[Debug] {frt_metadata.dict()}")
        callbackCtx : DurableCallbackContext = None

        # special judge
        if frt_metadata.invocation.kind == 'tell':
            callbackCtx = parseDurableCallbackContext(frt_metadata.invocation.response.responseCtx)

        if callbackCtx is not None:
            # not first-call
            orchestratorMetadata = callbackCtx.orchestrator
        else:
            # first-call
            orchestratorMetadata = OrchestratorMetadata(
                id=frt_metadata.invocation.id,
                initialData=OrchestratorMetadata.InitialData(
                    input=frt.input(),
                    metadata=frt_metadata
                )
            )
        durableMetadata  = DurableMetadata(
            orchestrator=orchestratorMetadata,
            runtimeData=frt_metadata,
            fn=handler
        )
        
        orchestratorMetadataId = orchestratorMetadata.id
        scopeId = createOrchestratorScopedId(orchestratorMetadataId)
        # state, init = await DurableFunctionState.load(client)

        if callbackCtx is not None:
            result = frt.input()
            action = state._actions[callbackCtx.taskpc-1]
            action.status = 'completed'
            action.result = result
            await state.store(client)

        dfrt = DurableRuntime(frt,durableMetadata,state)
        
        try:
            result = await fn(dfrt)
            await state.saveResult(client,result)
            return result
        except DurableException as e:
            print(f"[Trace] {frt_metadata.funcName}::{orchestratorMetadataId} yield")
            await state.store(client)
            return DurableWaitingResult(e.task,state,client)
    return handler

__all__ = [
    "durable",
    "DurableWaitingResult",
]