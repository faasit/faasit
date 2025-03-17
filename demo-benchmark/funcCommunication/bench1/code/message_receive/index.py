from faasit_runtime import function, create_handler#, with_timestamp
from faasit_runtime.runtime import FaasitRuntime
import time
from os import path

@function
def message_receive(frt: FaasitRuntime):

    _cold = True
    if path.exists("cold.txt"): 
        _cold = False
    open("cold.txt", "w").close()
    
    _in = frt.input()
    x = _in.get('x', 0)
    
    _end = round(time.time()*1000)
    _out = {
        "x": x,
        "_end":_end,
        "_cold":_cold
    }
    
    return frt.output(_out)

handler = create_handler(message_receive)