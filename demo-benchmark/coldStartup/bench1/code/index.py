from faasit_runtime import function, create_handler#, with_timestamp
from faasit_runtime.runtime import FaasitRuntime
import time
from os import path

# @with_timestamp
@function
def f(frt: FaasitRuntime):
    _start = round(time.time()*1000)
    _in = frt.input()
    _cold = True
    if path.exists("cold.txt"): 
        _cold = False
    open("cold.txt", "w").close()
    _out = {
        "_cold":_cold,
        "_begin":_start,
        "_end":round(time.time()*1000)
    }
    return frt.output(_out)

handler = create_handler(f)

