from faasit_runtime import function, FaasitRuntime, workflow, Workflow

@function
def hello1(frt: FaasitRuntime):
    return frt.output({
        "Hello": "function1"
    })

@function
def hello2(frt: FaasitRuntime):
    return frt.output({
        "Hello": "function2"
    })

@workflow
def hello(wf: Workflow):
    def reduce(r1,r2):
        return {
            'r1': r1,
            'r2': r2
        }
    r1 = wf.call("hello1", {})
    r2 = wf.call("hello2", {})
    return wf.func(reduce, r1, r2)

hello1 = hello1.export()
hello2 = hello2.export()
hello = hello.export()