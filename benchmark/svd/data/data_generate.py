import numpy as np
import sys
import io
def generate_random_matrix(m,n):
    return np.random.uniform(low=0, high=1, size=(m,n))

m = int(sys.argv[1])
n = int(sys.argv[2])

# 生成随机矩阵
print(f"Generating a random matrix of size {m}x{n}...")
matrix = generate_random_matrix(m, n)
# 保存到文件
np.save('data', matrix)
print(f"Matrix generated and saved to data.txt")
# 读取文件
with open('data.npy', 'rb') as f:
    content = f.read()
# load content
loaded_matrix = np.load(io.BytesIO(content)).tolist()
print(loaded_matrix)