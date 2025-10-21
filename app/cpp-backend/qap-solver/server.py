import grpc
from concurrent import futures
from collections import deque
from typing import List, Tuple
from scipy import sparse

import numpy as np

from gurobipy import Model, GRB, quicksum

import cpp_to_py_backend_pb2 as qap_pb2
import cpp_to_py_backend_pb2_grpc as qap_pb2_grpc



# ------------------------------------------------------------
# Reconstruct F matrix from gRPC msg
# ------------------------------------------------------------
def reconstruct_F(preqap: qap_pb2.PreQAPData) -> sparse.coo_matrix:
    """
    Reconstructs F as a sparse matrix from the proto message
    """

    nrows = preqap.rowsF
    ncols = preqap.colsF
    flat = np.array(preqap.linearizedF, dtype=np.uint64)

    if int(nrows) * int(ncols) != flat.size:
        raise ValueError(f"Inconsistent F size: rowsF*colsF={nrows*ncols}, got={flat.size}")

    F_dense = flat.reshape((nrows, ncols))

    # Sparse version
    F_sparse = sparse.coo_matrix(F_dense)
    if F_sparse.shape[0] != F_sparse.shape[1]:
        raise ValueError("F must be square")

    return F_sparse


# ------------------------------------------------------------
# Generate D matrix
# ------------------------------------------------------------
def distance_matrix_line(n: int) -> np.ndarray:
    """
    Creates a 1D linear distance matrix of size n x n:
        D[a,b] = |a - b|
    where positions are arranged along a straight line.
    """
    idx = np.arange(n).reshape(-1, 1)
    D = np.abs(idx - idx.T).astype(np.float64)
    np.fill_diagonal(D, 0.0)
    return D


# ------------------------------------------------------------
# Solve QAP using Gurobi
# ------------------------------------------------------------
def solve_qap_gurobi(F: sparse.coo_matrix, 
                     D: np.ndarray,
                     left_components: List[int] = None,
                     right_components: List[int] = None,
                     fixed_positions: dict = None) -> Tuple[List[int], float]:
    """
    Solves the Quadratic Assignment Problem with optional side constraints.

    Optional arguments:
        left_components: list of indices (or colours) that must stay in the left half
        right_components: list of indices that must stay in the right half
        fixed_positions: dict {i: position} fixing specific elements to exact positions
                         (0-based positions)
    """

    n = F.shape[0]
    m = Model("QAP")

    # Binary decision variables X[i,a]
    X = m.addVars(n, n, vtype=GRB.BINARY, name="X")

    # Each object assigned to exactly one location
    for i in range(n):
        m.addConstr(quicksum(X[i, a] for a in range(n)) == 1, name=f"assign_obj_{i}")

    # Each location hosts exactly one object
    for a in range(n):
        m.addConstr(quicksum(X[i, a] for i in range(n)) == 1, name=f"assign_loc_{a}")

    # Apply side constraints
    if left_components is None:
        left_components = []
    if right_components is None:
        right_components = []
    if fixed_positions is None:
        fixed_positions = {}

    # enforce that left components stay on the left half
    for i in left_components:
        for a in range(n // 2, n):
            X[i, a].ub = 0  # disallow right side

    # enforce that right components stay on the right half
    for i in right_components:
        for a in range(0, n // 2):
            X[i, a].ub = 0  # disallow left side

    # enforce exact fixed positions
    for i, pos in fixed_positions.items():
        for a in range(n):
            if a != pos:
                X[i, a].ub = 0  # only one valid position remains

    # Quadratic objective
    terms = []
    for i, j, val in zip(F.row, F.col, F.data):
        if val != 0:
            for a in range(n):
                for b in range(n):
                    d = D[a, b]
                    if d != 0:
                        terms.append(val * d * X[i, a] * X[j, b])

    m.setObjective(quicksum(terms), GRB.MINIMIZE)

    m.optimize()

    if m.status not in (GRB.OPTIMAL, GRB.TIME_LIMIT):
        raise RuntimeError(f"Gurobi ended with status {m.status}")

    # Extract permutation
    perm = [-1] * n
    for i in range(n):
        for a in range(n):
            if X[i, a].X > 0.5:
                perm[i] = a
                break

    cost = float(m.objVal)
    return perm, cost


# ------------------------------------------------------------
# BFS traversal over ColourHierarchyNode tree
# Each node's children form a local QAP problem
# ------------------------------------------------------------
def bfs_qap_with_gurobi(root: qap_pb2.ColourHierarchyNode, 
                        F: sparse.coo_matrix) -> List[Tuple[int, int]]:
    q = deque([root])
    result_pairs: List[Tuple[int, int]] = []

    while q:
        node = q.popleft()

        for child in node.childrenNodes:
            q.append(child)

        nc = len(node.childrenNodes)
        if nc <= 1:
            continue

        # global children colors
        child_colours = [c.colour for c in node.childrenNodes]

        # submatrix F for these children
        subF = F.tocsr()[np.ix_(child_colours, child_colours)].astype(np.uint64).tocoo()

        # local distances
        D = distance_matrix_line(nc)

        # constraints
        left_components_local = [0]          # first
        right_components_local = [nc - 1]    # last
        fixed_positions_local = {
            0: 0,        
            nc - 1: nc - 1
        }

        # solve local QAP
        perm_local, _ = solve_qap_gurobi(
            subF,
            D,
            left_components=left_components_local,
            right_components=right_components_local,
            fixed_positions=fixed_positions_local,
        )

        # map local index -> glocal color and save (global_colour, local_position)
        for local_idx, position in enumerate(perm_local):
            global_colour = child_colours[local_idx]
            result_pairs.append((global_colour, int(position)))

    return result_pairs



# ------------------------------------------------------------
# gRPC service
# ------------------------------------------------------------
class QAPSolverServicer(qap_pb2_grpc.QAPSolverServicer):
    def SolvePreQAP(self, request: qap_pb2.PreQAPData, context) -> qap_pb2.PostQAPData:
        """
        gRPC endpoint:
            Input: PreQAPData (graphHash, colourHierarchyRoot, F)
            Output: PostQAPData (list of ColourOrderPair)
        """
        try:
            F = reconstruct_F(request)
            root = request.colourHierarchyRoot

            # BFS + Gurobi on each level of the hierarchy
            pairs = bfs_qap_with_gurobi(
                root=root,
                F=F
            )

            # PostQAPData response
            resp = qap_pb2.PostQAPData(graphHash=request.graphHash)
            for colour, order in pairs:
                resp.colourOrdering.append(qap_pb2.ColourOrderPair(colour=colour, order=order))
            return resp

        except Exception as e:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return qap_pb2.PostQAPData()


# ------------------------------------------------------------
# gRPC server
# ------------------------------------------------------------
def serve(port: int = 50123):
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=4))
    qap_pb2_grpc.add_QAPSolverServicer_to_server(QAPSolverServicer(), server)
    server.add_insecure_port(f"[::]:{port}")
    server.start()
    print(f"[QAPSolver] listening on {port}")
    server.wait_for_termination()


if __name__ == "__main__":
    serve()
