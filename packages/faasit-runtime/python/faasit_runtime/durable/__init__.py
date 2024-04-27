from faasit_runtime.durable.models import (
    localonce_durable
)
from faasit_runtime.utils import (
    config
)
from faasit_runtime.durable.result import (
    DurableWaitingResult
)

def createOrchestratorScopedId(orcheId:str):
    return f"orchestrator::__state__::{orcheId}"



def durable(fn):
    conf = config.get_function_container_config()
    match conf['provider']:
        case 'local-once':
            return localonce_durable(fn)
        case 'local':
            return
        case _:
            raise Exception(f"Unsupported provider {conf['provider']}")

__all__ = [
    "durable",
    "DurableWaitingResult",
]