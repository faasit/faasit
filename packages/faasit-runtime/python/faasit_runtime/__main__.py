from faasit_runtime.runtime import (
    FaasitRuntime, 
    FaasitResult,
    AliyunRuntime,
    LocalOnceRuntime,
    LocalRuntime,
    KnativeRuntime,
    createFaasitRuntimeMetadata,
    FaasitRuntimeMetadata
)
from faasit_runtime.utils.config import get_function_container_config
import faasit_runtime.workflow as rt_workflow
from typing import Callable, Set, Any

type_Function = Callable[[Any], FaasitResult]
type_WorkFlow = Callable[[rt_workflow.WorkFlowBuilder], rt_workflow.WorkFlow]

def function(fn: type_Function):
    # Read Config for different runtimes
    containerConf = get_function_container_config()

    match containerConf['provider']:
        case 'local':
            async def local_function(event,metadata:FaasitRuntimeMetadata = None) -> FaasitResult:
                frt = LocalRuntime(event,metadata)
                return await fn(frt)
            return local_function
        case 'aliyun':
            def aliyun_function(arg0, arg1):
                frt = AliyunRuntime(arg0, arg1)
                return fn(frt)
            return aliyun_function
        case 'knative':
            async def kn_function(event) -> FaasitResult:
                frt = KnativeRuntime(event)
                return await fn(frt)
            return kn_function
        case 'aws':
            frt = FaasitRuntime(containerConf)
        case 'local-once':
            async def local_function(event, 
                               workflow_runner = None,
                               metadata: FaasitRuntimeMetadata = None
                               ):
                frt = LocalOnceRuntime(event, workflow_runner, metadata)
                result = await fn(frt)
                return result
            return local_function
        case _:
            raise ValueError(f"Invalid provider {containerConf['provider']}")

def workflow(fn: type_WorkFlow) -> rt_workflow.WorkFlow:
    builder = rt_workflow.WorkFlowBuilder()
    workflow = fn(builder)
    return workflow
        

def create_handler(fn : type_Function | rt_workflow.WorkFlow):
    if type(fn) == rt_workflow.WorkFlow:
        runner = rt_workflow.WorkFlowRunner(fn)
        container_conf = get_function_container_config()
        match container_conf['provider']:
            case 'local':
                async def handler(event:dict, metadata=None):
                    nonlocal runner
                    metadata = createFaasitRuntimeMetadata(container_conf['funcName']) if metadata == None else metadata
                    return await runner.run(event, metadata)
                return handler
            case 'aliyun'| 'aws'| 'knative':
                async def handler(event:dict):
                    nonlocal runner
                    return await runner.run(event)
                return handler
            case 'local-once':
                async def handler(event: dict):
                    nonlocal runner
                    return await runner.run(event, runner, createFaasitRuntimeMetadata(container_conf['funcName']))
                return handler
        return handler
    else: #type(fn) == type_Function:
        async def handler(event: dict, *args):
            return await fn(event, *args)
        return handler
    