from faasit_runtime import function, FaasitRuntime

@function
def funca(frt: FaasitRuntime):
    store = frt.storage
    store.put("hello", "funca")
    return frt.output({"hello": "funca"})

@function
def funcb(frt: FaasitRuntime):
    store = frt.storage
    result = store.get("hello")
    return frt.output({
        "funcb": result
    })

funca = funca.export()
funcb = funcb.export()