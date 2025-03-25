import json
import math
from faasit_runtime import function, FaasitRuntime


@function
def split(frt: FaasitRuntime):
    """
    将矩阵分块，并转换为 JSON 兼容的格式
    :param matrix: 输入矩阵（JSON 兼容的嵌套列表）
    :param block_size: 分块大小
    :return: 分块后的矩阵列表（JSON 兼容）
    """
    _in = frt.input()
    matrix = _in["matrix"]
    block_size = _in["block_size"]
    blocks = []
    rows = len(matrix)
    for i in range(0, rows, block_size):
        block = [row[i:i+block_size] for row in matrix[i:i+block_size]]
        blocks.append(block)
    return blocks

@function
def compute(frt: FaasitRuntime):
    """
    计算单个矩阵块的 Cholesky 分解
    :param A_block: 矩阵块（JSON 兼容的嵌套列表）
    :return: Cholesky 分解的下三角矩阵块（JSON 兼容的嵌套列表）
    """
    _in = frt.input()
    A_block = _in["A_block"]
    n = len(A_block)
    L_block = [[0.0] * n for _ in range(n)]  # 初始化下三角矩阵块

    for i in range(n):
        for j in range(i + 1):
            # 计算 L[i][j]
            sum_val = sum(L_block[i][k] * L_block[j][k] for k in range(j))
            if i == j:
                # 对角线元素
                if A_block[i][i] - sum_val <= 0:
                    raise ValueError("矩阵不是对称正定矩阵，无法进行 Cholesky 分解")
                L_block[i][j] = math.sqrt(A_block[i][i] - sum_val)
            else:
                # 非对角线元素
                L_block[i][j] = (A_block[i][j] - sum_val) / L_block[j][j]
    return L_block

@function
def merge(frt: FaasitRuntime):
    """
    将分块的结果合并为完整矩阵
    :param blocks: 分块结果列表（JSON 兼容的嵌套列表）
    :param original_shape: 原始矩阵的形状 (rows, cols)
    :param block_size: 分块大小
    :return: 合并后的完整矩阵（JSON 兼容的嵌套列表）
    """
    _in = frt.input()
    blocks = _in["blocks"]
    original_shape = _in["original_shape"]
    block_size = _in["block_size"]
    rows = original_shape[0]
    cols = original_shape[1]
    result = [[0.0 for _ in range(cols)] for _ in range(rows)]  # 初始化结果矩阵
    block_index = 0
    for i in range(0, rows, block_size):
        block = blocks[block_index]
        for bi, row in enumerate(block):
            for bj, val in enumerate(row):
                result[i + bi][i + bj] = val
        block_index += 1
    return result

@function
def cholesky(frt: FaasitRuntime):
    """
    分块 Cholesky 分解实现
    :param A: 输入矩阵（JSON 兼容的嵌套列表）
    :param block_size: 分块大小
    :return: Cholesky 分解的下三角矩阵（JSON 兼容的嵌套列表）
    """
    _in = frt.input()
    A = _in["A"]
    block_size = _in["block_size"]
    # 1. Split 分块
    A_blocks = frt.call('split', {'matrix': A, 'block_size': block_size})
    
    # 2. Compute 计算
    L_blocks = []
    for block in A_blocks:
        L_block = frt.call('compute', {'A_block': block})
        L_blocks.append(L_block)
    
    # 3. Merge 合并
    original_shape = [len(A), len(A[0])]
    L = frt.call('merge', {'blocks': L_blocks, 'original_shape': original_shape, 'block_size': block_size})
    return frt.output({
        "result": L
    })

cholesky = cholesky.export()
split = split.export()
compute = compute.export()
merge = merge.export()
