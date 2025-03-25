from faasit_runtime import function, create_handler#, with_timestamp
from faasit_runtime.runtime import FaasitRuntime
import time
import psutil
import os
import random

def init_resources():
    # init resources
    psutil.cpu_percent(interval=None)
    psutil.virtual_memory()
    psutil.Process(os.getpid()).cpu_percent(interval=None)
    psutil.Process(os.getpid()).memory_info()

def monitor_resources(process : psutil.Process):
    # monitor resources of the process about CPU and memory in real-time
    return {
        "cpu": process.cpu_percent(interval=0), # CPU usage
        "mem_mb": process.memory_info().rss // 1024 // 1024  # memory usage(MB)
    }

def compute_intensive():
    # compute-intensive task
    process = psutil.Process(os.getpid())
    data = []
    SAMPLING_INTERVAL_1 = 1000
    
    result = 0
    for i in range(10**5):
        result += i * i
        # monitor resources every SAMPLING_INTERVAL times of computation
        if i % SAMPLING_INTERVAL_1 == 0:
            data.append(monitor_resources(process))
    return {"type": "CPU", "result": result, "metrics": data}

def memory_intensive():
    # memory-intensive task
    process = psutil.Process(os.getpid())
    data = []
    SAMPLING_INTERVAL_2 = 5
    big_objects = []

    for i in range(50): 
        # create 50 objects, each object is 1MB
        big_objects.append(' ' * (1024 * 1024))  # 1MB
        # monitor resources every SAMPLING_INTERVAL times of creating objects
        if i % SAMPLING_INTERVAL_2 == 0:
            data.append(monitor_resources(process))

    return {"type": "Memory", "metrics": data}

def random_workload():
    # randomly choose a workload
    if random.random() < 0.5:
        return compute_intensive()
    else:
        return memory_intensive()

@function
def f(frt: FaasitRuntime):
    init_resources()

    _start = round(time.time()*1000)
    report = random_workload()
    _end = round(time.time()*1000)

    cpu_samples = [m["cpu"] for m in report["metrics"]]
    mem_samples = [m["mem_mb"] for m in report["metrics"]]

    cpu_usage = sum(cpu_samples) / len(cpu_samples) if cpu_samples else 0
    logical_cores = psutil.cpu_count(logical=True)
    mem_usage = sum(mem_samples) / len(mem_samples) if mem_samples else 0
    max_mem_usage = max(mem_samples) if mem_samples else 0

    _out = {
        "_begin":_start,
        "_end":_end,
        "_cpu_usage":cpu_usage,
        "_logical_cores":logical_cores,
        "_mem_usage":mem_usage,
        "_max_mem_usage":max_mem_usage
    }

    return frt.output(_out)

# # @with_timestamp
# @function
# def f(frt: FaasitRuntime):
#     init_resources()

#     process = psutil.Process(os.getpid())
#     cpu_log = []
#     mem_log = []

#     _start = round(time.time()*1000)
    
#     result = 0
#     for i in range(10**5):  # 控制运算次数在 10^5 以内
#         result += i * i
        
#         # 每 1000 次运算采样一次 CPU
#         if i % 1000 == 0:
#             cpu_usage = process.cpu_percent(interval=0)  # 立即采样
#             cpu_log.append(cpu_usage)
#             mem_usage = process.memory_info().rss // 1024 // 1024
#             mem_log.append(mem_usage)
    
#     process_cpu = sum(cpu_log) / len(cpu_log) if cpu_log else 0
#     process_mem = sum(mem_log) / len(mem_log) if mem_log else 0

#     _end = round(time.time()*1000)

#     cpu_usage = psutil.cpu_percent(interval=0)
#     mem_usage = psutil.virtual_memory().percent
    
#     _out = {
#         "_begin":_start,
#         "_end":_end,
#         "cpu_usage":cpu_usage,
#         "mem_usage":mem_usage,
#         "process_cpu":process_cpu,
#         "process_mem":process_mem
#     }

#     return frt.output(_out)

handler = create_handler(f)

