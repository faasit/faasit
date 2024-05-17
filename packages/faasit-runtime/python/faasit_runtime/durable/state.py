from abc import ABC, abstractmethod
from typing import Any, Awaitable, Union, Callable
from pydantic import BaseModel
from typing import Literal
from faasit_runtime.runtime import CallResult
import json
import redis

class DurableStateClient(ABC):

    @classmethod
    @abstractmethod
    def __init__(self) -> None:
        pass

    @classmethod
    @abstractmethod
    def set(self, key: str, value: Any) -> Awaitable[None]:
        pass

    @classmethod
    @abstractmethod
    def get(self, key: str) -> Union[Awaitable[Any],None] :
        pass

    @classmethod
    @abstractmethod
    def get(self, key: str, default: Callable) -> Awaitable[Any]:
        pass

class ScopedDurableStateClient(DurableStateClient):
    def __init__(self,scopedId) -> None:
        self._state = dict()
        self._scopedId = scopedId
        pass

    async def set(self, key: str, value: Any) -> Awaitable[None]:
        key = self.build_key(key)
        self._state[key] = value
        pass
    async def get(self, key: str) -> Union[Awaitable[Any],None]:
        key = self.build_key(key)
        return self._state.get(key, None)
    async def get(self, key: str, default: Callable) -> Awaitable[Any]:
        key = self.build_key(key)
        return self._state.get(key, default)

    def build_key(self, key: str) -> str:
        return f"{self._scopedId}::{key}"
    
    def to_dict(self):
        return self._state
    
    @staticmethod
    def load(scopedId:str, state:dict):
        client = ScopedDurableStateClient(scopedId)
        client._state = state
        return client

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
    
    @staticmethod
    async def loads(key):
        redis_client = redis.Redis(host='redis', port=6379, db=0)
        redis_value = redis_client.get(key)
        if redis_value == None:
            print(f"[STATE] first call: redis key {key}")
            client = ScopedDurableStateClient(key)
            state = DurableFunctionState.load(client)
            return (state,client)
        print(f"[STATE] redis key {key} exists")
        serializedState = json.loads(redis_value)

        functionId = serializedState['functionId']
        funcStates = serializedState['funcstates']
        client = ScopedDurableStateClient.load(functionId, json.loads(funcStates))
        
        actions = serializedState['actions']
        state = DurableFunctionState()
        state._actions = [Action(**action) for action in actions]
        print(f"[ACTIONS]: {state._actions}")
        return (state,client)
    
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
    
    def to_dict(self, client: ScopedDurableStateClient):
        status = 'running'
        if client.get('isFinished', False) == True:
            status = 'finished'
        result = None
        if status == 'finished':
            result = client.get('result')
        return {
            'functionId': client._scopedId,
            'actions': [action.dict() for action in self._actions],
            'funcstates': client.to_dict(),
            'status': status,
            'result': result
        }
    
    def to_redis(self,client:ScopedDurableStateClient):
        key = client._scopedId
        redis_client = redis.Redis(host='redis', port=6379, db=0)
        redis_client.set(key, json.dumps(self.to_dict(client)))
        redis_client.close()
        return (key, json.dumps(self.to_dict(client)))

class DurableGroupState(DurableState):
    def __init__(self, groupid) -> None:
        super().__init__()
        self.groupId = groupid