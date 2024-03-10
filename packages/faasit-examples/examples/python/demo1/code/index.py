from faasit_runtime import function, create_handler
from faasit_runtime.runtime import FaasitRuntime

@function
def f(frt: FaasitRuntime):
    _in = frt.input()
    _out = {
        "hello":"world"
    }
    return frt.output(_out)

handler = create_handler(f)

