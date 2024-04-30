# syntax=docker/dockerfile:1.2

FROM pytorch/pytorch:2.2.0-cuda12.1-cudnn8-runtime
WORKDIR /usr/src/app

COPY requirements.txt requirements.txt

RUN pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple
RUN --mount=type=cache,target=/root/.cache/pip pip install -r requirements.txt

COPY . .

CMD [ "python", "-u", "/usr/src/app/main.py", "run_aliyun" ]
