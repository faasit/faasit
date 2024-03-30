from faasit_runtime.runtime import FaasitRuntime
from faasit_runtime.workflow import WorkFlowBuilder
from faasit_runtime import function, durable, create_handler, workflow
import asyncio

@function
async def workeradd(frt: FaasitRuntime):
    input = frt.input()
    lhs = input['lhs']
    rhs = input['rhs']
    return frt.output({
        "res": lhs+ rhs
    })

@durable
async def durParallel(frt: FaasitRuntime):
    vals = [1,2,3,4,5]
    tasks = []
    for i in vals:
        tasks.append(frt.call('workeradd', {"lhs": i, "rhs": i}))
    results = await frt.waitResults(tasks)
    return frt.output({'res':results})

@function
async def exetutor(frt: FaasitRuntime):
    r = await frt.call('durParallel',{})
    return r

@workflow
def workflow(builder: WorkFlowBuilder):
    builder.func('workeradd').set_handler(workeradd)
    builder.func('durParallel').set_handler(durParallel)
    builder.executor().set_handler(exetutor)
    return builder.build()

handler = create_handler(workflow)