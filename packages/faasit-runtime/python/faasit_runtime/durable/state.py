from abc import ABC, abstractclassmethod
from typing import Any, Awaitable, Union, Callable
from pydantic import BaseModel
from typing import Literal
from faasit_runtime.runtime import CallResult

class DurableStateClient(ABC):

    @abstractclassmethod
    def __init__(self) -> None:
        pass

    @abstractclassmethod
    def set(self, key: str, value: Any) -> Awaitable[None]:
        pass

    @abstractclassmethod
    def get(self, key: str) -> Union[Awaitable[Any],None] :
        pass

    @abstractclassmethod
    def get(self, key: str, default: Callable) -> Awaitable[Any]:
        pass

class ScopedDurableStateClient(DurableStateClient):
    def __init__(self) -> None:
        self._state = dict()
        # self._scopedId = scopedId
        pass

    async def set(self, key: str, value: Any) -> Awaitable[None]:
        # key = self.build_key(key)
        self._state[key] = value
        pass
    async def get(self, key: str) -> Union[Awaitable[Any],None]:
        # key = self.build_key(key)
        return self._state.get(key, None)
    async def get(self, key: str, default: Callable) -> Awaitable[Any]:
        # key = self.build_key(key)
        return self._state.get(key, default)

    # def build_key(self, key: str) -> str:
    #     return f"{self._scopedId}::{key}"

class DurableState(ABC):
    def __init__(self) -> None:
        pass

    @staticmethod
    async def load(client: DurableStateClient):
        return DurableState()
    
class Action(BaseModel):
    kind: str = 'call'
    status: Literal['pending', 'completed', 'failed']
    result: CallResult

class DurableFunctionState(DurableState):
    def __init__(self) -> None:
        super().__init__()
        self._actions: list[Action] = list()
    @staticmethod
    async def load(client: ScopedDurableStateClient):
        state = DurableFunctionState()
        isInitialized = await client.get("isInitialized", False)
        if not isInitialized:
            await client.set("isInitialized", True)
            await client.set("isFinished", False)
            await state.store(client)

            return (state, True)
        
        state._actions = await client.get("actions", list())
        return (state, False)
    
    async def store(self, client: ScopedDurableStateClient):
        await client.set('actions', self._actions)
        pass

    async def saveResult(self, client: ScopedDurableStateClient, result: CallResult):
        await client.set('isFinished', True)
        await client.set('result', result)


    def add_action(self, action: Action):
        self._actions.append(action)
    
    def get_actions(self):
        return self._actions

class DurableGroupState(DurableState):
    def __init__(self, groupid) -> None:
        super().__init__()
        self.groupId = groupid