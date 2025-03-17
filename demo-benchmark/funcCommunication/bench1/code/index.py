from faasit_runtime import function, create_handler#, with_timestamp
from faasit_runtime.runtime import FaasitRuntime
import time
from os import path
from random import randint
import json

# @with_timestamp
@function
def f(frt: FaasitRuntime):

    text = randint(0, 100)

    cold = True

    # 保证相应函数已启动
    while cold:
        _start = round(time.time()*1000)
        v = frt.call("message_receive", {"x": text})
        cold = v.get("_cold", False)
        _end = round(time.time()*1000)

    elapsed = (_end - _start) // 2

    _out = {
        "_begin":_start,
        "_end":_end,
        "_return":elapsed
    }
    return frt.output(_out)

handler = create_handler(f)

