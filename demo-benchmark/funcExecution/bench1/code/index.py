from faasit_runtime import function, create_handler#, with_timestamp
from faasit_runtime.runtime import FaasitRuntime
import time
from os import path
import numpy as np

# @with_timestamp
@function
def f(frt: FaasitRuntime):
    _start = round(time.time()*1000)
    _in = frt.input()

    # 随机生成两个矩阵，计算它们的乘积，以此作为一个工作负载函数
    # 获取矩阵大小n
    n = _in.get('n', 1000)  # 默认大小为 1000x1000
    
    # 生成两个随机的n*n方阵
    matrix1 = np.random.randint(10, size=(n, n))
    matrix2 = np.random.randint(10, size=(n, n))
    
    # 计算它们的乘积
    product = np.dot(matrix1, matrix2)

    _out = {
        "_begin":_start,
        "_end":round(time.time()*1000),
        "product": product.tolist()
    }

    return frt.output(_out)

handler = create_handler(f)

