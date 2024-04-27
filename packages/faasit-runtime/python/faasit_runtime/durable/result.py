from faasit_runtime.durable.state import (
    DurableFunctionState,
    ScopedDurableStateClient
)

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