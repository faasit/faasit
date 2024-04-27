from faasit_runtime.runtime import (
    LocalOnceRuntime,
    FaasitRuntimeMetadata
)

from faasit_runtime.durable.state import (
    DurableFunctionState,
    ScopedDurableStateClient
)

from faasit_runtime.durable.metadata import (
    DurableMetadata,
    OrchestratorMetadata,
)

from faasit_runtime.durable.context import (
    DurableCallbackContext,
    parseDurableCallbackContext
)

from faasit_runtime.durable.runtime import (
    DurableRuntime,
    DurableException
)

from faasit_runtime.durable.result import (
    DurableWaitingResult
)

import uuid

def createOrchestratorScopedId(orcheId:str):
    return f"orchestrator::__state__::{orcheId}"

def localonce_durable(fn):
    localonceClients : dict[str,ScopedDurableStateClient] = {}
    def getClient(scopeId:str):
        if scopeId not in localonceClients:
            localonceClients[scopeId] = ScopedDurableStateClient(scopeId)
        return localonceClients[scopeId]
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
                id=str(uuid.uuid4()),
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
        client = getClient(scopeId)
        state, init = await DurableFunctionState.load(client)

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