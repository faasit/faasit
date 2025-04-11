import random
import string
import os
import sys
import tqdm
# 定义生成随机单词的函数
def generate_random_word():
    length = 3
    return ''.join(random.choice(string.ascii_letters) for _ in range(length))

file_size = int(sys.argv[1])

# 目标文件大小（以字节为单位）
target_size = file_size * 1024 * 1024  # 100MB

# 初始化一个空字符串用于存储生成的单词
current_size = 0

with open('data.txt', 'w', encoding='utf-8') as file:
    # 增加进度条
    pbar = tqdm.tqdm(total=target_size, unit='B', unit_scale=True, desc="Generating data")
    while current_size < target_size:
        word = generate_random_word()
        # 如果不是第一个单词，添加一个空格
        if current_size > 0:
            file.write(' ')
        file.write(word)
        current_size += len(word) + 1  # +1 for the space
        pbar.update(len(word) + 1)  # 更新进度条

print(f"Generate {file_size}MB data file successfully.")
