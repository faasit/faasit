from faasit_runtime.runtime import FaasitRuntime
from faasit_runtime.workflow import WorkFlowBuilder
from faasit_runtime import function, durable, create_handler, workflow

@function
async def workeradd(frt: FaasitRuntime):
    input = frt.input()
    lhs = input['lhs']
    rhs = input['rhs']
    return frt.output({
        "res": lhs+ rhs
    })

@durable
async def durLoop(frt: FaasitRuntime):
    r1 = await frt.call('workeradd', {"lhs": 2, "rhs": 3})

    vals = []
    for i in range(r1['res']):
        r2 = await frt.call('workeradd', {"lhs": i, "rhs": i})
        vals.append(r2['res'])
    return frt.output({'res':vals})

@function
async def exetutor(frt: FaasitRuntime):
    r = await frt.call('durLoop',{})
    return r

@workflow
def workflow(builder: WorkFlowBuilder):
    builder.func('workeradd').set_handler(workeradd)
    builder.func('durLoop').set_handler(durLoop)
    builder.executor().set_handler(exetutor)
    return builder.build()

handler = create_handler(workflow)