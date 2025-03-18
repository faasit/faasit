from faasit_runtime import function, FaasitRuntime

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

hello1 = hello1.export()
hello2 = hello2.export()