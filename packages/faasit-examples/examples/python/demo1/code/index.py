from faasit_runtime import function 
from faasit_runtime.runtime import FaasitRuntime

@function
def f(frt: FaasitRuntime):
    _in = frt.input()
    _out = {
        "hello":"world"
    }
    print(frt.output(_out))



