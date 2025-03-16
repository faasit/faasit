from faasit_runtime import function, create_handler#, with_timestamp
from faasit_runtime.runtime import FaasitRuntime
import time
import os


# I/O 密集型函数：模拟文件写入和读取（注意文件大小可调）
def io_bound_task(filename, size_in_mb=1):
    data = "x" * 1024  # 每次写入 1KB 的数据
    iterations = (size_in_mb * 1024)  # 1MB = 1024 KB
    # 写入文件
    with open(filename, 'w') as f:
        for _ in range(iterations):
            f.write(data)
    # 读取文件
    with open(filename, 'r') as f:
        _ = f.read()
    # 删除临时文件
    os.remove(filename)
    return 1

# @with_timestamp
@function
def f(frt: FaasitRuntime):
    _start = round(time.time()*1000)
    _in = frt.input()

    # 对大小为 n MB的文件进行读写，以此作为一个工作负载函数
    # 获取 n
    n = _in.get('n', 4)  # 默认大小为 4
    
    # 模拟读写
    result = io_bound_task("temp.txt", n)

    _out = {
        "_begin":_start,
        "_end":round(time.time()*1000),
        "_return":result
    }

    return frt.output(_out)

handler = create_handler(f)

