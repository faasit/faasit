from typing import Callable
from faasit_runtime.runtime.faasit_runtime import FaasitRuntime, FaasitResult
from faasit_runtime.utils import config



class WorkFlowFunc:
    def __init__(self, name: str, handler: Callable[[FaasitRuntime], FaasitResult] = None) -> None:
        self.name = name
        self.handler = handler

    def set_handler(self, 
                    handler: Callable[[FaasitRuntime], FaasitResult]):
        self.handler = handler

class WorkFlowExecutor(WorkFlowFunc):
    def __init__(self, name: str, handler: Callable[[FaasitRuntime], FaasitResult] = None) -> None:
        super().__init__(name, handler)

    def set_handler(self, 
                    handler: Callable[[FaasitRuntime], FaasitResult]):
        super().set_handler(handler)

class WorkFlow:
    def __init__(self, 
                 functions: list[WorkFlowFunc],
                 executor: WorkFlowExecutor) -> None:
        self.functions = functions
        self.executor = executor
        pass

class WorkFlowBuilder:
    def __init__(self) -> None:
        self.funcs: list[WorkFlowFunc] = []
        self.executor_func: WorkFlowExecutor = None
        pass

    # This method is used to add a function to the workflow
    def func(self, funcName:str) -> WorkFlowFunc:
        # create a new function
        newFunc = WorkFlowFunc(funcName)
        self.funcs.append(newFunc)
        return newFunc

    # get all the funcs in the workflow
    def get_funcs(self) -> list[WorkFlowFunc]:
        return self.funcs()

    # add an executor to the workflow
    def executor(self) -> WorkFlowExecutor:
        exe_func = WorkFlowFunc('__executor')
        # self.funcs.append(exe_func)
        self.executor_func = exe_func
        return exe_func

    # build the workflow
    def build(self) -> WorkFlow:
        if self.executor_func == None:
            raise ValueError('Executor function not set')
        return WorkFlow(self.funcs, self.executor_func)
    
class WorkFlowRunner:
    def __init__(self, workflow: WorkFlow) -> None:
        self.conf = config.get_function_container_config()
        self.workflow = workflow
        pass

    def run(self, frt: FaasitRuntime, *args) -> FaasitResult:
        funcName = self.conf['funcName']
        fn = self.route(funcName)
        return fn(frt, *args)
    
    def route(self, name: str) -> Callable[[FaasitRuntime], FaasitResult]:
        if name == '__executor':
            return self.workflow.executor.handler
        for func in self.workflow.functions:
            if func.name == name:
                return func.handler
        raise ValueError(f'Function {name} not found in workflow')