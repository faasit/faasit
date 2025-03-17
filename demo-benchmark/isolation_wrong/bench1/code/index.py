from faasit_runtime import function, create_handler#, with_timestamp
from faasit_runtime.runtime import FaasitRuntime
import time
import random
import math

def block_sort(arr):
    n = len(arr)
    if n <= 1:
        return arr
    
    # 计算块的大小（n^0.5）
    block_size = int(math.sqrt(n))
    
    # 分块并对每个块进行排序
    blocks = []
    for i in range(0, n, block_size):
        block = arr[i:i + block_size]
        block.sort()  # 对每个块进行排序
        blocks.append(block)
    
    # 合并所有块
    sorted_arr = []
    while blocks:
        # 找到所有块中的最小元素
        min_val = float('inf')
        min_block_idx = 0
        for i, block in enumerate(blocks):
            if block and block[0] < min_val:
                min_val = block[0]
                min_block_idx = i
        
        # 将最小元素加入结果数组
        sorted_arr.append(min_val)
        blocks[min_block_idx].pop(0)  # 移除已加入的元素
        
        # 如果块为空，则移除该块
        if not blocks[min_block_idx]:
            blocks.pop(min_block_idx)
    
    return sorted_arr

def work(n):

    data = [random.randint(1, 10000000) for _ in range(n)]
    sorted_data = block_sort(data)
    return sorted_data

# @with_timestamp
@function
def f(frt: FaasitRuntime):
    _start = round(time.time()*1000)

    n = 100000
    work(n)
    
    _out = {
        "_begin":_start,
        "_end":round(time.time()*1000)
    }

    return frt.output(_out)

handler = create_handler(f)

# from math import isqrt

# def Eratosthenes(n):
#     prime = []
#     is_prime = [False] * (n + 1)
#     is_prime[0] = is_prime[1] = False
#     for i in range(2, n + 1):
#         is_prime[i] = True
#     # 让 i 循环到 <= sqrt(n)
#     for i in range(2, isqrt(n) + 1):  # `isqrt` 是 Python 3.8 新增的函数
#         if is_prime[i]:
#             for j in range(i * i, n + 1, i):
#                 is_prime[j] = False
#     for i in range(2, n + 1):
#         if is_prime[i]:
#             prime.append(i)
#     return prime.__len__()

# def pre(n):
#     pri = []
#     not_prime = [False] * (n + 1)
#     for i in range(2, n + 1):
#         if not not_prime[i]:
#             pri.append(i)
#         for pri_j in pri:
#             if i * pri_j > n:
#                 break
#             not_prime[i * pri_j] = True
#             if i % pri_j == 0:
#                 break
#     return pri.__len__()