from faasit_runtime import function, create_handler#, with_timestamp
from faasit_runtime.runtime import FaasitRuntime
import time

# @with_timestamp
@function
def f(frt: FaasitRuntime):
    _start = round(time.time()*1000)
    
    _out = {
        "_begin":_start,
        "_end":round(time.time()*1000),
        "_return":2
    }

    return frt.output(_out)

handler = create_handler(f)

