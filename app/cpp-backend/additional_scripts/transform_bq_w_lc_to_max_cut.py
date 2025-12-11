import numpy as np
from scipy.linalg import null_space
from numbers import Number
from typing import Tuple

from util_functions import mc_psd, random_cut, mc_gwz, perform_max_cut_cutting_plane_and_bundle_loop


def get_graph(A, filename):
    n = A.shape[0]
    B = np.abs(A) > 0
    m = np.sum(np.triu(B, 0))

    e = []
    w = []

    for i in range(n):
        for j in range(i, n):
            if A[i, j] != 0:
                e.append([i + 1, j + 1])
                w.append(A[i, j])

    e = np.array(e, dtype=int)
    w = np.array(w, dtype=float)

    import os
    os.makedirs('./data', exist_ok=True)
    filepath = f'./data/{filename}'
    with open(filepath, 'w') as f:
        f.write(f"{n} {m}\n")
        for edge, weight in zip(e, w):
            f.write(f"{edge[0]} {edge[1]} {weight:.6f}\n")  # 6 decimals

    return e, w


def transform_bq_w_lc_to_max_cut(
    A: np.ndarray, b: np.ndarray, c: np.ndarray, F: np.ndarray, filename: str
) -> Tuple[Number, int, int]:
    m, n = A.shape 
    c = c.reshape(1, -1)
    b1 = b - np.sum(A, axis=1) * 0.5
    A1 = 0.5 * A 
    c1 = 0.5 * (c + np.sum(F, axis=0))
    F1 = 0.25 * F 
    alpha = np.sum(c * 0.5) + np.sum(F1)
    alpha = alpha.reshape(1, 1)

    # print(alpha.shape, c1.shape, c1.shape, F1.shape)

    objective = np.block([[alpha, c1 * 0.5], [0.5 * c1.reshape(-1, 1), F1]])
    A2 = A1.T @ A1 
    b2 = b1.T @ b1 
    lin = -A1.T @ b1 
    constraint = np.block([[b2, lin.reshape(1,- 1)], [lin.reshape(-1, 1), A2]])
    
    pen_triv = 2*np.sum(np.abs(F))
    Ql = objective + pen_triv*constraint
    Dl = np.diag(np.sum(Ql, axis=1))
    Gw = Dl - Ql

    Xs, _ = mc_psd(Gw, 5, 1)
    cut = random_cut(n+1) 
    bnd, cut = mc_gwz(Gw, Xs, cut)

    feasibility = None
    if cut.T @ constraint @ cut == 0:
        ub = -bnd + np.sum((Dl))
        feasibility = 1
    else:
        # We cannot do anything otherwise
        feasibility = 0

    aus = np.diag(np.sum(objective, axis=1))
    mat = objective - aus 
    bnd = perform_max_cut_cutting_plane_and_bundle_loop(-mat, 5)
    lb = -bnd + np.sum(aus)

    pen = int(np.floor(ub - lb)) + 1
    objective_t = np.block([[F1, 0.5*c1], [c1.reshape(-1, 1) * 0.5, alpha]])
    constraint_t = np.block([[A2, lin.reshape(-1, 1)], [lin.reshape(1, -1), b2]])
    lower = int(np.floor(lb)) 
    upper = int(np.ceil(ub))
    L = objective_t + pen*constraint_t
    value = np.sum(L)
    Bm = L -np.diag(np.diag(L))
    get_graph(4*Bm, filename)

    return value, upper, feasibility


def generate_example_data():
    n = 7
    F_sparse = [
        (4, 5, 3), (1, 5, 5), (1, 7, 4), 
        (2, 7, 6), (2, 6, 5), (3, 6, 7), 
        (4, 7, 1), (5, 7, 1), (1, 2, 1), 
        (2, 3, 2)
    ]

    A = np.zeros((2*n, n**2))
    for row in range(0, n):
        column_offset = row*n
        for j in range(0, n):
            A[row, column_offset+j] = 1

    for row in range(n, 2*n):
        k = row - n
        for j in range(0, n):
            A[row, j*n + k] = 1 

    b = np.ones(2*n)
    F = np.zeros((n**2, n**2))
    for i, j, value in F_sparse:
        i, j = i-1, j-1
        if i > j:
            i, j = j, i

        for k in range(n):
            for l in range(n):
                if k == l: continue 
                F[i*n + k, j*n + l] = value * abs(k-l)

    return A, b, F, np.zeros(n**2)            


if __name__ == "__main__":
    A, b, F, c = generate_example_data()
    transform_bq_w_lc_to_max_cut(
        A, b, c, F, "/app/additional_scripts/output_data.txt"
    )