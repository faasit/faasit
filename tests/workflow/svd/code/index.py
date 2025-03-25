from faasit_runtime import function, FaasitRuntime, workflow, Workflow
import numpy as np

def block_matrix_concat(U_matrices):
    U1 = U_matrices[0]  
    U1 = np.array(U1)
    for i in range(1, len(U_matrices)):
        U = U_matrices[i]
        U = np.array(U)
        subyup = np.zeros((U1.shape[0], U.shape[1]))
        x1 = np.hstack((U1, subyup))  
        subydown = np.zeros((U.shape[0], U1.shape[1]))
        subydowncom = np.hstack((subydown, U)) 
        U1 = np.vstack((x1, subydowncom))
    
    return U1

@function
def merge(frt: FaasitRuntime):
    input_data = frt.input()
    Xi_svds = input_data["Xi_svds"]
    Xi_svds = np.array(Xi_svds)
    U_tilde = block_matrix_concat([v["U"] for v in Xi_svds])

    Y = []
    for Xi_svd in Xi_svds:
        d = np.diag(Xi_svd["S"])  # 对角矩阵 S
        yi = np.dot(d, np.array(Xi_svd["Vt"]).T)  # yi = S * V^T
        Y.append(yi)

    Y = np.concatenate(Y, axis=0)

    U_Y, S_Y, V_Y = np.linalg.svd(Y, full_matrices=False)
    U = np.dot(U_tilde, U_Y)
    S = S_Y
    V = V_Y

    return frt.output({
        "U": U.tolist(), 
        "S": S.tolist(), 
        "V": V.tolist()
    })

@function
def split(frt: FaasitRuntime):
    input_data = frt.input()
    X = input_data["X"]
    num_splits = input_data["numSplits"]

    m = len(X)
    row_size = m // num_splits
    sub_Xs = []

    for i in range(num_splits):
        start_idx = i * row_size
        end_idx = (i + 1) * row_size
        sub_Xs.append(X[start_idx:end_idx])

    return frt.output({
        "subXs": sub_Xs
    })


@function
def compute(frt: FaasitRuntime):
    input_data = frt.input()
    Xis = input_data["Xis"]
    result = []
    for Xi in Xis:
        U, S, Vt = np.linalg.svd(Xi,full_matrices=False)
        Xi_svd = {"U": U.tolist(), "S": S.tolist(), "Vt": Vt.tolist()}  # 将 SVD 结果组织成一个字典
        result.append(Xi_svd)

    return frt.output({
        "result": result
    })

@workflow
def svd(wf: Workflow):
    input_data = wf.input()
    X = input_data["X"]
    num_splits = input_data.get("numSplits", 3)
    split_res = wf.call("split", {"X": X, "numSplits": num_splits})
    sub_Xs = split_res["subXs"]
    compute_res = wf.call("compute",{"Xis": sub_Xs})
    Xi_svds = compute_res["result"]
    merge_res = wf.call("merge", {"Xi_svds": Xi_svds})
    return merge_res

split = split.export()
merge = merge.export()
compute = compute.export()
svd = svd.export()