from faasit_runtime import function, create_handler#, with_timestamp
from faasit_runtime.runtime import FaasitRuntime
import time
from os import path

def fibonacci(n: int):
    if n <= 0:
        return 0
    if n == 1:
        return 1
    return fibonacci(n-1) + fibonacci(n-2)

# @with_timestamp
@function
def f(frt: FaasitRuntime):
    _start = round(time.time()*1000)
    _in = frt.input()

    # 计算斐波那契数列的第n项，以此作为一个工作负载函数
    # 获取 n
    n = _in.get('n', 26)  # 默认大小为 26
    
    # 计算它们的乘积
    result = fibonacci(n)

    _out = {
        "_begin":_start,
        "_end":round(time.time()*1000),
        "_return":result
    }

    return frt.output(_out)

handler = create_handler(f)

