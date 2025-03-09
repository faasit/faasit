from faasit_runtime import function, create_handler#, with_timestamp
from faasit_runtime.runtime import FaasitRuntime
import time
from os import path
from random import randint
import asyncio

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

    n = 200  # 并发执行次数
    start_times = []  # 记录每次任务的开始时间
    end_times = []  # 记录每次任务的结束时间

    # 包装函数，用于记录时间
    async def wrapper():
        start_time = round(time.time()*1000)  # 记录任务开始时间
        start_times.append(start_time)
        result = await frt.call(ff, {"x": randint(0, 100)})  # 执行任务
        end_time = round(time.time()*1000)  # 记录任务结束时间
        end_times.append(end_time)
        return result

    # 创建 n 个任务
    tasks = [wrapper() for _ in range(n)]
    results = await asyncio.gather(*tasks)  # 并发执行任务

    # 计算每次任务的执行时间
    execution_times = [end_times[i] - start_times[i] for i in range(n)]
    avg_time = sum(execution_times) // (2 * n)  # 计算平均用时

    _end = round(time.time()*1000)

    _out = {
        "_begin":_start,
        "_end":_end,
        "_return":avg_time
    }
    return frt.output(_out)


handler = create_handler(f)

