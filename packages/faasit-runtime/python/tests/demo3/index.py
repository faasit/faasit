from faasit_runtime.runtime import FaasitRuntime
from faasit_runtime import function, durable, create_handler

@durable
@function
def f(frt: FaasitRuntime):
    return frt.output()

handler = create_handler(f)