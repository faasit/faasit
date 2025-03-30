from faasit_runtime import function, FaasitRuntime

@function
def hello(rt: FaasitRuntime):
    return rt.output(rt.input())

hello1 = hello.export()
hello2 = hello.export()