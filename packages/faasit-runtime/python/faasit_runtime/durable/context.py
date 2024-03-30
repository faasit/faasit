from faasit_runtime.durable.metadata import OrchestratorMetadata
from pydantic import BaseModel

class DurableCallbackContext(BaseModel):
    kind: str = "durable-orchestrator-callback"
    orchestrator: OrchestratorMetadata
    taskpc: int

def parseDurableCallbackContext(ctx) -> DurableCallbackContext | None:
    if ctx is None:
        return None
    if not isinstance(ctx, DurableCallbackContext):
        return None
    ctx: DurableCallbackContext
    if ctx.kind != "durable-orchestrator-callback":
        return None
    return ctx