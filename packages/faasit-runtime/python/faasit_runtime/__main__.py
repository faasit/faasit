from faasit_runtime.runtime.faasit_runtime import FaasitRuntime, FaasitResult
from faasit_runtime.runtime.aliyun_runtime import AliyunRuntime
from faasit_runtime.runtime.local_runtime import LocalRuntime
from faasit_runtime.runtime.local_once_runtime import LocalOnceRuntime
from faasit_runtime.utils.config import get_function_container_config
import faasit_runtime.workflow as rt_workflow
from typing import Callable, Set

type_Function = Callable[[FaasitRuntime], FaasitResult]
type_WorkFlow = Callable[[rt_workflow.WorkFlowBuilder], rt_workflow.WorkFlow]

def function(fn: type_Function):
    # Read Config for different runtimes
    containerConf = get_function_container_config()

    match containerConf['provider']:
        case 'local':
            def local_function(event) -> FaasitResult:
                frt = LocalRuntime(event)
                return fn(frt)
            return local_function
        case 'aliyun':
            def aliyun_function(arg0, arg1):
                frt = AliyunRuntime(arg0, arg1)
                return fn(frt)
            return aliyun_function
        case 'knative':
            frt = FaasitRuntime(containerConf)
        case 'aws':
            frt = FaasitRuntime(containerConf)
        case 'local-once':
            def local_function(event):
                frt = LocalOnceRuntime(event)
                return fn(frt)
            return local_function
        case _:
            raise ValueError(f"Invalid provider {containerConf['provider']}")

def workflow(fn: type_WorkFlow) -> rt_workflow.WorkFlow:
    # Read Config for different runtimes
    # containerConf = get_function_container_config()
    builder = rt_workflow.WorkFlowBuilder()
    workflow = fn(builder)
    return workflow
    # match containerConf['provider']:
    #     case 'local-once':
    #         def local_once_workflow(event):
    #             builder = rt_workflow.WorkFlowBuilder()
    #             return fn(builder)
    #         return local_once_workflow
    #     case 'local','aliyun','knative','aws':
    #         deploy_func_name = containerConf['funcName']
    #         if deploy_func_name == 'executor':
    #             return function(workflow.executor.handler)
    #         else:
    #             for func in workflow.functions:
    #                 if func.name == deploy_func_name:
    #                     return function(func.handler)
    #             raise ValueError(f"Function {deploy_func_name} not found in workflow")
    #     case _:
    #         raise ValueError(f"Invalid provider {containerConf['provider']}")
        

def create_handler(fn : type_Function | type_WorkFlow):
    if type(fn) == type_Function:
        return fn
    if type(fn) == type_WorkFlow:
        builder = rt_workflow.WorkFlowBuilder()
        workflow = fn(builder)
        runner = rt_workflow.WorkFlowRunner(workflow)

        @function
        def handler(frt):
            return runner.run(frt)
        return handler
    
    raise ValueError(f"Invalid function type {type(fn)}")