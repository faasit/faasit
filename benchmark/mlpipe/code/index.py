from faasit_runtime import function, FaasitRuntime
from sklearn.linear_model import LogisticRegression
import numpy as np
import io

@function
def preprocess(frt: FaasitRuntime):
    store = frt.storage
    X = store.get('mnist_X.npy')
    y = store.get('mnist_y.npy')
    X = np.load(io.BytesIO(X))
    y = np.load(io.BytesIO(y))

    
    return frt.output({
        'X': X.tolist(),
        'y': y.tolist()
    })

@function
def train(frt: FaasitRuntime):
    _input = frt.input()
    X = np.array(_input['X'])
    y = np.array(_input['y'])
    
    # 这里使用一个简单的模型，实际应用中可以替换为更复杂的模型
    model = LogisticRegression(max_iter=1000)
    model.fit(X, y)
    frt.storage.put('model.pkl', model)
    
    return frt.output({
        'model': 'model.pkl'
    })

@function
def test(frt: FaasitRuntime):
    _input = frt.input()
    model = _input['model']
    model = frt.storage.get(model)
    X = np.array(_input['X'])
    y = np.array(_input['y'])
    
    # 这里使用一个简单的模型，实际应用中可以替换为更复杂的模型
    score = model.score(X, y)
    
    return frt.output({
        'score': score
    })

@function
def mlpipe(frt: FaasitRuntime):
    data_set = frt.call("preprocess",{})
    model = frt.call("train", data_set)
    score = frt.call("test", {
        **data_set,
        **model
    })
    return frt.output(score)

preprocess = preprocess.export()
train = train.export()
test = test.export()
mlpipe = mlpipe.export()
