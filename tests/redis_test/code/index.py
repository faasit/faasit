from faasit_runtime import function, FaasitRuntime

@function
def func(frt: FaasitRuntime):
    store = frt.storage
    result = store.get('hello')
    return frt.output(result)

func = func.export()