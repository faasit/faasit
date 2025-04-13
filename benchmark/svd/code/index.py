from faasit_runtime import function, FaasitRuntime
import numpy as np
import io

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
    s_merged = np.concatenate([np.array(svd["S"]) for svd in Xi_svds])
    U_merged = np.vstack([np.array(svd["U"]) for svd in Xi_svds])
    Vt_merged = np.array(Xi_svds[0]["Vt"])

    # idx = np.argsort(s_merged)[::-1]
    # U_final = U_merged[:, idx]
    # S_final = s_merged[idx]
    # V_final = Vt_merged[idx, :]

    return frt.output({
        "U": U_merged.tolist(), 
        "S": s_merged.tolist(), 
        "V": Vt_merged.tolist()
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

@function
def svd(frt: FaasitRuntime):
    input_data = frt.input()
    file = input_data["file"]
    store = frt.storage
    X = store.get(file)
    X = np.load(io.BytesIO(X)).tolist()
    num_splits = input_data.get("numSplits", 3)
    split_res = frt.call("split", {"X": X, "numSplits": num_splits})
    sub_Xs = split_res["subXs"]
    compute_res = frt.call("compute",{"Xis": sub_Xs})
    Xi_svds = compute_res["result"]
    merge_res = frt.call("merge", {"Xi_svds": Xi_svds})
    return frt.output({
        "message": "ok",
        "data": merge_res
    })

split = split.export()
merge = merge.export()
compute = compute.export()
svd = svd.export()