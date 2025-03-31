from faasit_runtime import function, FaasitRuntime

@function
def func1(frt: FaasitRuntime):
    result = frt.tell("funcb", {"hello": "world"})
    return frt.output(result)

@function
def func2(frt: FaasitRuntime):
    return frt.output({
        "Hello": "func2"
    })

func1 = func1.export()
func2 = func2.export()