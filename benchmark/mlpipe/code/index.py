import os
import io
import socket
import pickle
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.datasets import fetch_openml
# from flask import Flask, jsonify
import sys
import threading
import logging
from faasit_runtime import function, FaasitRuntime, workflow, Workflow
from faasit_runtime.utils.logging import log as logger

# 配置参数
REPLICATION = 5  # 数据复制次数
DATA_SPLIT = 0.6  # 训练测试分割比例


# ===========================
# Data download and preprocess functions
# ===========================
def download_data(frt: FaasitRuntime):
    logger.info("Fetching data...")
    store = frt.storage
    mnist_X = store.get('mnist_X.npy')
    mnist_y = store.get('mnist_y.npy')
    X = np.load(io.BytesIO(mnist_X))
    y = np.load(io.BytesIO(mnist_y))
    # if os.path.exists('mnist_X.npy') and os.path.exists('mnist_y.npy'):
    #     logger.info('Hitting cache. Loading data from local file...')
    #     X = np.load('mnist_X.npy')
    #     y = np.load('mnist_y.npy')
    # else:
    #     mnist = fetch_openml('mnist_784', version=1, as_frame=False, parser="pandas")
    #     X, y = mnist.data, mnist.target.astype(np.int32)
    #     logger.info("Data prepared from openml")
    X = X.reshape(-1, 28, 28)
    return {'X': X, 'y': y}


def preprocess_data(data):
    """
    Preprocess data: flatten images, normalize and split.
    """
    X = data['X'].reshape((-1, 28 * 28)).astype('float32') / 255.0
    y = data['y']
    split = int(DATA_SPLIT * len(X))
    return {'X': X[:split], 'y': y[:split]}, {'X': X[split:], 'y': y[split:]}

def chunked_data_generator(payload, times, chunk_size=8192):
    """
    Generator function for streaming. It repeats the same payload 'times' times,
    and splits each repetition into chunks of size 'chunk_size'.
    """
    # payload: bytes
    # times: int
    # chunk_size: int
    for _ in range(times):
        start = 0
        while start < len(payload):
            yield payload[start:start + chunk_size]
            start += chunk_size


@function
def download_handler(frt: FaasitRuntime):
    raw_data = download_data(frt)
    replicated_data = [raw_data for _ in range(REPLICATION)]
    result = frt.call('preprocess-1', {
        'path': 'receive',
        'data': raw_data,
        'redundant': replicated_data
    })

    return frt.output({"status": "started"})

@function
def preprocess_handler(frt: FaasitRuntime):
    store = frt.storage
    data = store.get('data', active_pull=False, src_stage='download-0', local_cache=True,tcp_direct=False)
    (train_data, test_data) = preprocess_data(data)
    threads = [
        threading.Thread(target=frt.call, args=("train-2", {"train_data": train_data})),
        threading.Thread(target=frt.call, args=("test-3", {"test_data": test_data}))
    ]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()
    # frt.call("train-2", {"train_data": train_data})
    # frt.call("test-3", {"test_data": test_data})
    return frt.output({"status": "started"})

@function
def train_handler(frt: FaasitRuntime):
    store = frt.storage
    data = store.get('train_data',active_pull=False, src_stage='proprocess-1',local_cache=True,tcp_direct=False)
    logging.info("Training data received")
    X = data['X']
    y = data['y']
    model = LogisticRegression(max_iter=10)
    logging.info("Training model...")
    model.fit(X, y)
    serialized_model = pickle.dumps(model)
    logging.info("Model trained")
    frt.call("test-3", {"model": serialized_model})
    return frt.output({"status": "started"})

@function
def test_handler(frt: FaasitRuntime):
    store = frt.storage
    results = {}

    results['model'] = store.get('model',active_pull=False, src_stage='train-2',local_cache=True,tcp_direct=False)
    results['test'] = store.get('test_data',active_pull=False, src_stage='preprocess-1',local_cache=True,tcp_direct=False)
    model = pickle.loads(results['model'])
    accuracy = model.score(results['test']['X'], results['test']['y'])
    return frt.output({"accuracy": accuracy})

download = download_handler.export()
preprocess = preprocess_handler.export()
train = train_handler.export()
test = test_handler.export()

@workflow
def mlpipe(wf: Workflow):
    s0 = wf.call("download-0",{})
    s1 = wf.call("preprocess-1", {"s0": s0})
    s2 = wf.call("train-2", {"s1": s1})
    s3 = wf.call("test-3", {"s2": s2, "s1": s1})
    return s3

mlpipe = mlpipe.export()