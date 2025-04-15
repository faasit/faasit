from faasit_runtime import function, FaasitRuntime

@function
def func(frt: FaasitRuntime):
    store = frt.storage
    result = store.get('hello').decode()
    return frt.output({'hello':result})

func = func.export()