from faasit_runtime.runtime import FaasitRuntime
from faasit_runtime.workflow import WorkFlowBuilder
from faasit_runtime import function, durable, create_handler, workflow


@function
async def workeradd(frt: FaasitRuntime):
    input = frt.input()
    lhs = input['lhs']
    rhs = input['rhs']
    return frt.output({
        "res": lhs + rhs
    })

@durable
async def durChain(frt: FaasitRuntime):
    r1 = await frt.call('workeradd', {"lhs": 1, "rhs": 2})
    r2 = await frt.call('workeradd', {"lhs": r1['res'], "rhs": 3})
    r3 = await frt.call('workeradd', {"lhs": r2['res'], "rhs": 4})
    return frt.output(r3)

@function
async def executor(frt: FaasitRuntime):
    r = await frt.call('durChain', {})
    return frt.output(r)

@workflow
def workflow(builder: WorkFlowBuilder):
    builder.func('workeradd').set_handler(workeradd)
    builder.func('durChain').set_handler(durChain)
    builder.executor().set_handler(executor)
    return builder.build()

handler = create_handler(workflow)