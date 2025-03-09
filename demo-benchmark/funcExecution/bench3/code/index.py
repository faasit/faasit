from faasit_runtime import function, create_handler#, with_timestamp
from faasit_runtime.runtime import FaasitRuntime
import time
from os import path
import numpy as np

def memory_bound_task(n: int):
    data = list(range(n, 0, -1))  # 生成逆序列表
    data.sort()  # 排序操作
    return data[0]

# @with_timestamp
@function
async def f(frt: FaasitRuntime):
    _start = round(time.time()*1000)
    _in = frt.input()

    # 对大小为n的数组进行排序，以此作为一个工作负载函数
    # 获取 n
    n = _in.get('n', 2000000)  # 默认大小为 2000000
    
    # 计算它们的乘积
    result = memory_bound_task(n)

    _out = {
        "_begin":_start,
        "_end":round(time.time()*1000),
        "_return":result
    }

    return frt.output(_out)

handler = create_handler(f)

