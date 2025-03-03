from faasit_runtime import function, create_handler#, with_timestamp
from faasit_runtime.runtime import FaasitRuntime
import time
from os import path
from random import randint

@function
async def ff(frt: FaasitRuntime):
    
    _in = frt.input()
    x = _in.get('x', 0)
    _end = round(time.time()*1000)
    _out = {
        "x": x,
        "_end":_end
    }
    
    return frt.output(_out)

# @with_timestamp
@function
async def f(frt: FaasitRuntime):
    _start = round(time.time()*1000)
    
    v = await frt.call(ff, {"x": randint(0, 100)})

    _end = v.get('_end', round(time.time()*1000))

    _out = {
        "_begin":_start,
        "_end":_end
    }
    return frt.output(_out)

handler = create_handler(f)

