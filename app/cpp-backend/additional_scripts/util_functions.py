import numpy as np
import time 
from scipy.linalg import cholesky, LinAlgError as ScipyLinAlgError
from scipy.sparse import coo_matrix, csr_matrix
from typing import Tuple, Union, Callable, Optional


# Returns True only if A is strictly positive
# def matlab_cholesky(A: np.ndarray, tol: float = 1e-14) -> Tuple[Optional[np.ndarray], bool]:
#     A = 0.5 * (A + A.T)
#     try:
#         R = cholesky(A, lower=False)
#         return R, True
#     except ScipyLinAlgError:
#         return None, False
    
#     min_pivot = np.min(np.diag(R))
#     if min_pivot < tol:
#         return None, False
    
#     return R, True


def matlab_cholesky(A: np.ndarray, tol: float = 1e-15) -> Tuple[np.ndarray, int]:
    A = np.array(A, dtype=float)
    n = A.shape[0]
    R = np.zeros_like(A)

    for k in range(n):
        pivot = A[k, k] - np.sum(R[:k, k] ** 2)

        if pivot <= tol:
            return R, False

        R[k, k] = np.sqrt(pivot)

        # Compute row k
        for j in range(k + 1, n):
            R[k, j] = (A[k, j] - np.sum(R[:k, k] * R[:k, j])) / R[k, k]

    return R, True


def mc_psd(L: np.ndarray, digits: int = 2, unused_silent: bool = False) -> Tuple[np.ndarray, np.ndarray]:
    # start = time.time()
    L = np.array(L, dtype=float)
    n, n1 = L.shape 
    assert n == n1, "L must be square"
    L = 0.5 * (L + L.T)

    b = np.ones(n)
    X = np.diag(b)
    y = np.sum(np.abs(L), axis=1) + 1.1
    Z = np.diag(y) - L 
    phi = b @ y 
    psi = np.sum(L * X)
    delta = phi - psi 

    mu = np.dot(Z.ravel(), X.ravel()) / (4.0 * n)
    alpha_p = 1.0
    alpha_d = 1.0
    it = 0

    tol = 10.0**(-digits)
    while delta > tol:
        print(f"Delta in mc_psd: {delta}")
        Zi = np.linalg.inv(Z)
        Zi = 0.5 * (Zi + Zi.T)
        dzi = np.diag(Zi)

        M = Zi * X 
        rhs = mu * dzi - b 

        try:
            dy = np.linalg.solve(M, rhs)
        except np.linalg.LinAlgError:
            dy, *_ = np.linalg.lstsq(M, rhs, rcond=None)

        tmp = Zi * dy.reshape(1, -1)
        dX = -(tmp @ X) + mu * Zi - X 
        dX = 0.5 * (dX + dX.T)        

        alpha_p = 1.0
        posdef = False 
        # while True:
        #     R, posdef = matlab_cholesky(X + alpha_p * dX, lower)
        #     posdef = True 
        #     except ScipyLinAlgError:
        #         alpha_p *= 0.8
        #         if alpha_p < 1e-16:
        #             break 
        #         continue 
        #     break 

        R, posdef = matlab_cholesky(X + alpha_p * dX)
        while not posdef:
            alpha_p *= 0.8
            R, posdef = matlab_cholesky(X + alpha_p * dX)

        if alpha_p < 1.0:
            alpha_p *= 0.95 

        X = X + alpha_p * dX 
        X = 0.5 * (X + X.T)      

        alpha_d = 1.0
        dZ = np.diag(dy)
        # while True:
        #     try:
        #         cholesky(Z + alpha_d * dZ, lower=False)
        #     except ScipyLinAlgError:
        #         alpha_d *= 0.8
        #         if alpha_d < 1e-16:
        #             break 
        #         continue
        #     break      
        R, posdef = matlab_cholesky(Z + alpha_d * dZ)
        while not posdef:
            alpha_d *= 0.8
            R, posdef = matlab_cholesky(Z + alpha_d * dZ)

        if alpha_d < 1.0:
            alpha_d *= 0.95 

        y = y + alpha_d * dy 
        Z = Z + alpha_d * dZ 
        Z = 0.5 * (Z + Z.T)

        mu = np.dot(X.ravel(), Z.ravel()) / (2.0 * n)
        if min(alpha_p, alpha_d) < 0.5:
            mu = mu * 1.5 
        if alpha_p + alpha_d > 1.6:
            mu = mu * 0.75
        if alpha_p + alpha_d:
            mu = mu / (1.0 + 0.1 * (it+1))

        phi = b @ y 
        psi = np.sum(L * X)
        delta = phi - psi 

        it += 1
        if it > 10_000:
            break 

    # secs = time.time() - start 
    return X, y     


def random_cut(n: int):
    x = np.ones(n)
    y = np.random.rand(n)
    x[y >= 0.5] = -1 
    return x


def mc_1opt(L: np.ndarray, x: np.ndarray, II = None):
    x = x.copy()
    Lx = L @ x 
    # print(Lx.shape, L.shape)
    d = np.diag(L)
    cost = float(x @ Lx)
    delta = d - x*Lx 
    i = np.argmax(delta)
    best = delta[i]
    
    if II is None:
        II = [np.nonzero(L[: , j])[0] for j in range(L.shape[0])]

    while best > 1e-5:
        I = II[i]
        if x[i] > 0:
            Lx[I] -= (2 * L[I, i]).reshape(-1)
        else:
            Lx[I] += (2 * L[I, i]).reshape(-1)

        x[i] *= -1
        cost += 4*best 
        delta = d - x*Lx 
        i = np.argmax(delta)
        best = delta[i]

    return cost, x     


def mc_gw(L: np.ndarray, v: np.ndarray, trails: int = 20, II = None):
    n = L.shape[0]
    k = v.shape[0]
    cost = -1e10
    cut = None 

    for _ in range(trails):
        r = np.random.rand(k) - 0.5
        y = np.sign(v.T @ r)
        y[y == 0] = 1
        feasibility, x = mc_1opt(L, y, II)
        if feasibility > cost:
            cost = feasibility
            cut = x 

    return cost, cut        


def mc_gwz(L: np.ndarray, X: np.ndarray, xh: np.ndarray) -> Tuple[float, np.ndarray]:
    n = len(xh)
    its = int(np.ceil(0.5 * n))
    I = [np.nonzero(L[: , i]) for i in range(n)]
    fh = float((xh.T @ L) @ xh)
    done = 0 

    while done < 2:
        done += 1
        const = 0.3 + 0.6 * np.random.rand()
        Xs = (1 - const) * X + const * np.outer(xh, xh)
        v = np.linalg.cholesky(Xs)
        f0, cut = mc_gw(L, v, its, I)
        if f0 > fh:
            fh = f0
            xh = cut 
            done = 0

    Xh = cut 
    return fh, Xh   


def triangle_separation(y: np.ndarray, n: int, maxtri: int) -> Tuple[np.ndarray, np.ndarray]:
    y = y.reshape(-1)
    vmax = min(maxtri, 20_000)
    violl = np.full(vmax, -1)
    ind = np.arange(vmax, dtype=int)
    T_tmp = np.zeros((4, vmax), dtype=int)
    cntr = 0
    threshold = 0.01

    for i in range(1, n-1):
        for j in range(i+1, n):
            for k in range(j+1, n+1):
                ii, jj, kk = i-1, j-1, k-1
                yij = y[ii*n + jj]
                yik = y[ii*n + kk]
                yjk = y[jj*n + kk]

                x = yij + yik + yjk - 2.0
                if x > threshold and x > violl[ind[0]]:
                    idx = ind[0]
                    violl[idx] = x
                    T_tmp[0, idx] = i
                    T_tmp[1, idx] = j
                    T_tmp[2, idx] = k
                    T_tmp[3, idx] = 0
                    sort_idx = np.argsort(violl)
                    ind = sort_idx
                    cntr += 1


                x = yij - yik - yjk
                if x > threshold and x > violl[ind[0]]:
                    idx = ind[0]
                    violl[idx] = x
                    T_tmp[0, idx] = i
                    T_tmp[1, idx] = j
                    T_tmp[2, idx] = k
                    T_tmp[3, idx] = 1
                    sort_idx = np.argsort(violl)
                    ind = sort_idx
                    cntr += 1

                x = -yij + yik - yjk
                if x > threshold and x > violl[ind[0]]:
                    idx = ind[0]
                    violl[idx] = x
                    T_tmp[0, idx] = i
                    T_tmp[1, idx] = j
                    T_tmp[2, idx] = k
                    T_tmp[3, idx] = 2
                    sort_idx = np.argsort(violl)
                    ind = sort_idx
                    cntr += 1

                x = -yij - yik + yjk
                if x > threshold and x > violl[ind[0]]:
                    idx = ind[0]
                    violl[idx] = x
                    T_tmp[0, idx] = i
                    T_tmp[1, idx] = j
                    T_tmp[2, idx] = k
                    T_tmp[3, idx] = 3
                    sort_idx = np.argsort(violl)
                    ind = sort_idx
                    cntr += 1

    cntr = min(cntr, vmax)

    valid_idx = np.where(violl > -1)[0]
    m = len(valid_idx)
    if m == 0:
        return np.empty((0,4), dtype=int), np.empty((0,), dtype=float)

    Tn = np.zeros((m,4), dtype=int)
    g_new = np.zeros(m, dtype=float)
    for i_out, j_out in enumerate(valid_idx):
        g_new[i_out] = violl[j_out]
        Tn[i_out, 0] = T_tmp[0,j_out]
        Tn[i_out, 1] = T_tmp[1,j_out]
        Tn[i_out, 2] = T_tmp[2,j_out]
        Tn[i_out, 3] = T_tmp[3,j_out]

    return Tn, g_new


def to_ip(T_g: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
    T_g = np.asarray(T_g)
    m = T_g.shape[0]
    sup = T_g[: , :3].copy()
    el = np.ones((m, 3), dtype=int)
    for i in range(m):
        typ = int(T_g[i, 3])
        if typ == 1:
            el[i, 2] = -1
        elif typ == 2:
            el[i, 1] = -1
        elif typ == 3:
            el[i, 0] = -1

    return sup, el     


def tri_to_a(n: int, sup: np.ndarray, el: np.ndarray) -> Tuple[csr_matrix, np.ndarray]:
    sup = np.asarray(sup)
    el = np.asarray(el)
    m = sup.shape[0]
    data = []
    rows = []
    cols = []

    for i in range(m):
        sup1 = sup[i, :]
        el1 = el[i, :]

        I = np.kron(np.ones(3, dtype=int), sup1)
        J = np.kron(sup1, np.ones(3, dtype=int))
        S = np.kron(el1, el1)
        I -= 1 # ?
        J -= 1 # ?

        linear_index = I * n + J
        data.extend(S)
        rows.extend([i]*9)
        cols.extend(linear_index)

    A = coo_matrix((data, (rows, cols)), shape=(m, n*n)).tocsr()
    b = np.ones(m, dtype=float)
    return A, b


def separation(x: np.ndarray, Told: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
    n = x.shape[0]
    new_ineq = n*10
    X1 = 0.5 * (np.ones_like(x) - x)
    y = X1.reshape(n*n, 1)
    Tn, g_new = triangle_separation(y, n, new_ineq)
    m = len(g_new)
    if m == 0:
        return None, Told, np.ndarray([])
    
    Tn = np.reshape(Tn, (m, 4))
    Told = np.array(Told) if len(Told) > 0 else np.zeros((0, 4), dtype=int)
    mold = Told.shape[0]

    Tall = np.vstack([Told, Tn])
    T1, I_A = np.unique(Tall, axis=0, return_index=True)

    mtot = Tall.shape[0]
    new_index_range = np.arange(mold, mtot)
    Ikeep = np.intersect1d(new_index_range, I_A)
    Ikeep -= mold 

    Tn = Tn[Ikeep , :]
    T = np.vstack([Told, Tn])
    sup, el = to_ip(Tn)
    A, *_ = tri_to_a(n, sup, el)
    # print(A, x)
    # print(x.shape)
    gamma_new = 1 - A @ x.reshape(-1)

    return A, T, gamma_new


def scale_mat(Zi, dy):
    return Zi * dy[:, None]


def scale_matr(dy, X):
    return X * dy[:, None]


def mc_psdpk(L, digits=2, unused_silent=0, X=None, y=None):
    n = L.shape[0]
    b = np.ones(n)

    if X is None or y is None:
        X = np.diag(b)
        y = np.sum(np.abs(L), axis=1) + 1.0
    else:
        if not np.allclose(np.diag(X), b, atol=1e-5):
            raise ValueError("diag(X) not 1 ...")

        try:
            cholesky(X, lower=False)
            cholesky(np.diag(y) - L, lower=False)
        except ScipyLinAlgError:
            raise ValueError("input not PSD ...")

    Z = np.diag(y) - L

    phi = b @ y
    psi = np.sum(L * X)
    delta = phi - psi

    mu = np.sum(Z * X) / (2 * n)

    alphap = 1.0
    alphad = 1.0
    iteration = 0
    cholcnt = 0

    # if unused_silent == 0:
        # print("      iter    alphap    alphad    log(gap)    lower        upper")
        # print(f"{iteration:4d} {alphap:10.3f} {alphad:10.3f} {np.log10(delta):10.5f} {psi:10.3f} {phi:10.3f}")

    while delta > 10 ** (-digits):
        print("Delta in psdpk: ", delta)
        Zi = np.linalg.inv(Z)
        iteration += 1
        dzi = np.diag(Zi)
        Zi = 0.5 * (Zi + Zi.T)

        A1 = Zi * X
        dy1 = np.linalg.solve(A1, -b)

        tmp = scale_mat(Zi, dy1)
        dX1 = -tmp @ X - X
        dX1 = 0.5 * (dX1 + dX1.T)

        # Corrector step
        rhs = mu * dzi - (Zi * dX1) @ dy1
        dy2 = np.linalg.solve(A1, rhs)

        tmp = scale_matr(dy2, X)
        tmp1 = scale_matr(dy1, dX1)

        dX2 = mu * Zi - Zi @ (tmp + tmp1)

        dy = dy1 + dy2
        dX = dX1 + dX2
        dX = 0.5 * (dX + dX.T)

        alphap = 1.0
        # while True:
        #     try:
        #         cholesky(X + alphap * dX, lower=False)
        #         break
        #     except ScipyLinAlgError:
        #         alphap *= 0.8
        #         cholcnt += 1

        R, posdef = matlab_cholesky(X + alphap * dX)
        cholcnt += 1
        while not posdef:
            alphap *= 0.8
            R, posdef = matlab_cholesky(X + alphap * dX)
            cholcnt += 1

        if alphap < 1:
            alphap *= 0.95

        X = X + alphap * dX

        alphad = 1.0
        dZ = np.diag(dy)

        # while True:
        #     try:
        #         print("Alpha_d: ", alphad)
        #         cholesky(Z + alphad * dZ, lower=False)
        #         break
        #     except ScipyLinAlgError:
        #         alphad *= 0.8
        #         cholcnt += 1

        R, posdef = matlab_cholesky(Z + alphad * dZ)
        cholcnt += 1
        while not posdef:
            alphad *= 0.8
            # print(f"Alpha_d: {alphad}")
            R, posdef = matlab_cholesky(Z + alphad * dZ)
            cholcnt += 1

        if alphad < 1:
            alphad *= 0.95

        y = y + alphad * dy
        Z = Z + alphad * dZ

        mu = np.sum(X * Z) / (2 * n)
        if alphap + alphad > 1.6:
            mu *= 0.5
        if alphap + alphad > 1.9:
            mu /= 5

        phi = b @ y
        psi = np.sum(L * X)
        delta = phi - psi

        # if unused_silent == 0:
            # print(f"{iteration:4d} {alphap:10.3f} {alphad:10.3f} {np.log10(delta):10.5f} {psi:10.3f} {phi:10.3f}")

    # secs = time.process_time() - start
    return X, y, iteration, 0


def fct_eval(
    gamma: np.ndarray, L: np.ndarray, b: np.ndarray, 
    A: Union[csr_matrix, coo_matrix]
) -> Tuple[float, np.ndarray, np.ndarray]:
    n = L.shape[0]
    m = len(b) if b is not None else 0

    if m > 0 and A is not None:
        Atg = A.T @ gamma
        Atg = Atg.reshape(n, n)
        Atg = 0.5 * (Atg + Atg.T)
        L0 = L + Atg
    else:
        L0 = L

    x, dual = mc_psdpk(L0, digits=2)
    dualvalue = np.sum(dual)

    if m > 0 and A is not None:
        f = dualvalue - np.dot(b, gamma)
        ax = A @ x.flatten()
        g = -b + ax
    else:
        f = dualvalue
        g = np.array([])

    return f, x, g


def mc_start(L: np.ndarray):
    Xs, *_ = mc_psd(L, 3, 1)
    f = float(Xs.reshape(-1) @ L.reshape(-1))

    n = L.shape[0]
    xh = random_cut(n)
    fh, xh = mc_gwz(L, Xs, xh)

    fopt = f 
    if abs(fopt - fh) < 0.99:
        b = np.array([])
        T = []
        F = np.array([])
        G = np.array([])
        X = Xs 
        bestx = Xs 
        A = np.array([])
        gamma = np.array([])
        t = 0
        bestcut = xh 
        return b, T, F, G, X, A, gamma, fopt, t, bestx, bestcut 
    
    A, T, g = separation(Xs, [])
    b = np.ones((A.shape[0], 1))

    g_vec = g.reshape(-1, 1)
    denom = float(g_vec.T @ g_vec)
    if denom == 0:
        denom = 1e-12
    t = 0.5 * (f - fh) / denom 

    gamma = 0.1 * t * g 
    f, x, g = fct_eval(gamma, L, b, A)
    F = np.array([float(L.reshape(-1) @ x.reshape(-1))])
    G = g.copy()
    X = x.reshape(-1, 1)

    fopt = f 
    bestx = X.copy()
    bestcut = xh 

    return b, T, F, G, X, A, gamma, fopt, t, bestx, bestcut    


def bdl_method(L, b, A, F, G, X, gamma, fopt, t, bestx, itmax, prnt=0, fct_eval_func=None, lam_eta_func=None):
    n = L.shape[0]
    m = len(gamma)
    k = len(F)

    for cnt in range(itmax):
        beta = -F - G.T @ gamma
        dgamma, lam, eta, t = lam_eta_func(beta, G, gamma, t)
        gamma_test = gamma + dgamma
        ftest, xtest, gtest = fct_eval_func(gamma_test, L, b, A)
        xi_lam = X @ lam  
        lmax = np.max(lam)
        del_val = beta @ lam + (dgamma @ dgamma) / (2 * t) + gamma @ eta + fopt

        if ftest < fopt - 0.05 * del_val:
            I = np.where(lam > lmax * 0.001)[0]

            G = np.hstack([G[:, I], gtest[:, np.newaxis]])
            X = np.hstack([X[:, I], xtest.flatten()[:, np.newaxis]])
            F = np.hstack([F[I], [L.flatten() @ xtest.flatten()]])
            gamma = gamma_test
            bestx = xi_lam
            fopt = ftest
            t *= 1.001
        else:
            I = np.where(lam[:k-1] > lmax * 0.001)[0]
            G = np.hstack([G[:, I], gtest[:, np.newaxis], G[:, [k-1]]])
            X = np.hstack([X[:, I], xtest.flatten()[:, np.newaxis], X[:, [k-1]]])
            F = np.hstack([F[I], [L.flatten() @ xtest.flatten()], [F[k-1]]])
            t /= 1.001

        k = len(F)

        if prnt != 0 and (cnt % 1 == 0 or cnt == 0 or cnt == itmax - 1):
            lmax_gamma = np.max(gamma)
            ia = np.sum(gamma > 0.001 * lmax_gamma)
            # print(f"{cnt+1:3d} {fopt:12.3f} {ftest:12.3f} {np.linalg.norm(dgamma/t):8.5f} {t:7.5f} {k:3d} {ia:5d}")

    return F, G, X, gamma, fopt, t, bestx


def bdl_purge(b, A, T, G, gamma):
    maxg = np.max(gamma)
    I = np.where(gamma > 0.0001 * maxg)[0]
    Itri = np.where(gamma[:T.shape[0]] > 0.0001 * maxg)[0]
    gamma = gamma[I]
    b = b[I]
    if isinstance(A, csr_matrix):
        A = A[I, :]
    else:
        A = A[I, :]
    T = T[Itri, :]
    G = G[I, :]

    return b, A, T, G, gamma


def sep_c5(X, qap_simul2_c_func):
    trials = 300

    f = np.zeros(3 * trials)
    I5 = np.zeros((5, 3 * trials), dtype=int)

    e = np.ones(5)
    H1 = np.outer(e, e)
    e1 = e.copy(); e1[0] = -1
    H2 = np.outer(e1, e1)
    e2 = e1.copy(); e2[1] = -1
    H3 = np.outer(e2, e2)

    for i in range(trials):
        perm, val = qap_simul2_c_func(H1, X)
        f[i] = val
        I5[:, i] = perm[:5]

        perm, val = qap_simul2_c_func(H2, X)
        f[trials + i] = val
        perm[0] = -perm[0]
        I5[:, trials + i] = perm[:5]

        perm, val = qap_simul2_c_func(H3, X)
        f[2 * trials + i] = val
        perm[0] = -perm[0]
        perm[1] = -perm[1]
        I5[:, 2 * trials + i] = perm[:5]

    I5keep = I5.copy()
    I5sorted = np.sort(np.abs(I5), axis=0).T
    _, unique_indices = np.unique(I5sorted, axis=0, return_index=True)
    I5 = I5keep[:, unique_indices]
    f = f[unique_indices]

    keep = f < 0.99
    f = f[keep]
    I5 = I5[:, keep]
    sorted_idx = np.argsort(f)
    f = f[sorted_idx]
    I5 = I5[:, sorted_idx]

    return I5, f


def C5_to_a(n, C5):
    m = C5.shape[0]
    data = []
    rows = []
    cols = []

    for i in range(m):
        raw = C5[i, :5]
        sup1 = np.abs(raw)
        el1 = np.sign(raw)

        I = np.repeat(sup1, 5)-1
        J = np.tile(sup1, 5)-1
        S = np.kron(el1, el1)

        rows.extend([i] * 25)
        cols.extend((I - 1) * n + (J - 1))
        data.extend(S)

    A = csr_matrix((data, (rows, cols)), shape=(m, n * n))
    return A


def perform_max_cut_cutting_plane_and_bundle_loop(L: np.ndarray, var: int = 3) -> Tuple[float, np.ndarray]:
    n = L.shape[0]
    b, T, F, G, X, gamma, fopt, t, bestx, bestcut = mc_start(L)
    cutval = float((bestcut.T @ L) @ bestcut)
    bnd = fopt 
    if abs(bnd - cutval) < 0.99:
        return bnd, bestcut 
    
    max_v = max_v5 = max_v7 = 1.0
    max_it = 20
    bdl_it = 10 
    level = 0.01

    it = bdl_it
    f5 = [0]
    f5_old = 0

    for cnt in range(1, max_it+1):
        F, G, X, gamma, fopt, t, bestx = bdl_method(
            L, b, A, F, G, X, gamma, fopt, t, bestx, it
        )

        bnd = fopt 
        bX = X[: , np.argmax(F)].reshape(n, n)
        b, A, T, G, gamma = bdl_purge(b, A, T, G, gamma)
        startcut = random_cut(n)
        fh, xh = mc_gwz(L, bX, startcut)

        if fh > cutval:
            bestcut = xh 
            cutval = fh 

        m = len(b)
        bsize = len(F)

        if var == 3:
            done = (max_v < level)    
        elif var == 5:
            done = (max_v5 < level)
        else:
            done = False 

        if abs(fopt - cutval) < 0.95:
            return bnd, bestcut

        if cnt == max_it or done:
            return bnd, bestcut

        A3_new, T, gammma_new = separation(bX, T)
        A = np.vstack([A, A3_new])
        b = np.ones((A.shape[0], 1))
        t_new = len(gammma_new)
        max_v = max(gammma_new) if t_new > 0 else 0.09

        if max_v < 0.4 and var > 3:
            C5, f5 = sep_c5(bX)
            A5 = C5_to_a(n, C5.T)
            gamma_5 = 1 - A5 @ bX.reshape(-1, 1)
            max_v5 = max(gamma_5)

            A = np.vstack([A, A5])
            b = np.ones((A.shape[0], 1))        

            gamma_new = np.concatenate([gamma_new, gamma_5])

        gamma = np.concatenate([gamma, 0.005*t*gamma_new])
        f, x, g = fct_eval(gamma, L, b, A)
        ng = len(g)
        r = X.shape[1]

        G_new = np.zeros((ng, r+1))
        G = G_new 
        F = np.concatenate([F[:r-1], [float(L.reshape(-1) @ x.reshape(-1))], F[r-1:r]])
        X = np.column_stack([X[:, :r-1], x.reshape(-1), X[:, r-1]])     

        t *= 1.05 

    return bnd, bestcut    