from faasit_runtime import function, FaasitRuntime
import numpy as np

@function
def split(frt: FaasitRuntime):
    input_data = frt.input()
    matrix = input_data["matrix"]
    block_size = input_data["block_size"]
    blocks = []
    rows = len(matrix)
    cols = len(matrix[0]) if len(matrix) > 0 else 0
    for i in range(0, rows, block_size):
        for j in range(0, cols, block_size):
            block = [row[j:j+block_size] for row in matrix[i:i+block_size]]
            blocks.append(block)
    return frt.output({
        "blocks": blocks
    })

@function
def compute(frt: FaasitRuntime):
    input_data = frt.input()
    A_blocks = np.array(input_data["A_blocks"])
    B_blocks = np.array(input_data["B_blocks"])
    C_blocks = np.dot(A_blocks, B_blocks)
    return frt.output({
        "C_blocks": C_blocks.tolist()
    })

@function
def merge(frt: FaasitRuntime):
    input_data = frt.input()
    blocks = input_data["blocks"]
    original_size = input_data["original_size"]
    block_size = input_data["block_size"]
    rows = original_size[0]
    cols = original_size[1]
    
    result = [[0 for _ in range(cols)] for _ in range(rows)]
    block_index = 0
    for i in range(0, rows, block_size):
        for j in range(0, cols, block_size):
            block = blocks[block_index]
            for bi, row in enumerate(block):
                for bj, value in enumerate(row):
                    result[i+bi][j+bj] = value
            block_index += 1
    return frt.output({
        "matrix": result
    })

@function
def gemm(frt: FaasitRuntime):
    input_data = frt.input()
    siz = input_data["matrix_size"]
    block_size = input_data["block_size"]
    A = np.random.rand(siz, siz).tolist()
    B = np.random.rand(siz, siz).tolist()
    A_blocks = frt.call('split', {'matrix': A, 'block_size': block_size})['blocks']
    B_blocks = frt.call('split', {'matrix': B, 'block_size': block_size})['blocks']

    C_blocks = []
    for i in range(len(A_blocks)):
        A_block = A_blocks[i]
        B_block = B_blocks[i]
        C_block = frt.call('compute', {'A_blocks': A_block, 'B_blocks': B_block})['C_blocks']
        C_blocks.append(C_block)
    
    original_size = [siz, siz]
    result = frt.call('merge', {'blocks': C_blocks, 'original_size': original_size, 'block_size': block_size})['matrix']
    return frt.output({
        "result": result
    })

split = split.export()
compute = compute.export()
merge = merge.export()
gemm = gemm.export()


