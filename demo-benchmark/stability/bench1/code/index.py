from faasit_runtime import function, create_handler#, with_timestamp
from faasit_runtime.runtime import FaasitRuntime
import time
import psutil

def get_cpu_load():
    cpu_load = psutil.cpu_percent(interval=1)
    return cpu_load

# @with_timestamp
@function
def f(frt: FaasitRuntime):
    _start = round(time.time()*1000)
    
    _out = {
        "_begin":_start,
        "_end":round(time.time()*1000),
        "_return":get_cpu_load()
    }

    return frt.output(_out)

handler = create_handler(f)

