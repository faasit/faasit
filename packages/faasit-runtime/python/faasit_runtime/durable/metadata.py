from faasit_runtime.runtime import FaasitRuntime
from faasit_runtime.runtime import FaasitRuntimeMetadata
from typing import Any, Callable
from pydantic import BaseModel

class OrchestratorMetadata(BaseModel):
    class InitialData(BaseModel):
        input: Any
        metadata: FaasitRuntimeMetadata
    id: str
    initialData: InitialData

class DurableMetadata(BaseModel):
    orchestrator: OrchestratorMetadata = None
    runtimeData: FaasitRuntimeMetadata
    fn: Callable = None