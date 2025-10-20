from numbers import Number

import graph_tool as gt
import graph_tool.topology as gt_top
import numpy as np
from layout_algorithm.assign_levels import assign_levels
from layout_algorithm.create_L_sets import LSetCreator
from layout_algorithm.create_layout import LayoutCreator
from layout_algorithm.graph import Graph as PyGraph
from layout_algorithm.param_optimizer import optimize_params


def _gt_to_pygraph(G_gt: gt.Graph) -> PyGraph:
    N = int(G_gt.num_vertices())
    E_adj = [set() for _ in range(N)]
    for e in G_gt.edges():
        u = int(e.source())
        v = int(e.target())
        if u != v:
            E_adj[u].add(v)
    return PyGraph(num_of_vertex=N, E=E_adj, is_directed=True)


MinDistsEntry = tuple[Number, gt.Vertex | None]

INFINITY = 2_147_483_647
PI = np.pi


RADIUS = 10


def find_roots(G: gt.Graph) -> list[gt.Vertex]:
    # print([v for v in G.vertices() if v.in_degree() == 0])
    return [v for v in G.vertices() if v.in_degree() == 0]


def update_min_dists(
    current: np.ndarray[MinDistsEntry], newly_found: np.ndarray[MinDistsEntry]
) -> np.ndarray[MinDistsEntry]:
    result_pattern = np.array(current)[:, 0] < np.array(newly_found)[:, 0]
    return np.where(result_pattern[:, np.newaxis], current, newly_found)


def build_newly_found(
    dist_map: gt.VertexPropertyMap, pred_map: gt.VertexPropertyMap
) -> np.ndarray[MinDistsEntry]:
    built = [None for _ in range(0, len(dist_map))]
    for i, (d, p) in enumerate(zip(dist_map, pred_map)):
        built[i] = (d, p)

    return np.array(built)


def compute_min_distances_after_finding_roots(
    G: gt.Graph, roots: list[gt.Vertex]
) -> list[MinDistsEntry]:
    min_dists: np.ndarray[MinDistsEntry] = np.array(
        [(INFINITY, None) for _ in range(0, len(G))]
    )
    pred_map = G.vertex_index.copy()

    print(
        f"Preparing to compute min distances starting in each root, number of roots = {len(roots)}"
    )
    for i in range(0, len(roots)):
        root = roots[i]
        # print(f"For root: {root}")
        min_dists_for_root, pred_map = gt_top.shortest_distance(
            G, source=root, directed=True, pred_map=pred_map
        )
        # print("Finding distances concluded")
        min_dists = update_min_dists(
            current=min_dists,
            newly_found=build_newly_found(min_dists_for_root, pred_map),
        )

    return min_dists


def compute_min_distances(G: gt.Graph) -> list[MinDistsEntry]:
    return compute_min_distances_after_finding_roots(G, find_roots(G))


def fix_for_vertices_with_inf_distance(
    G: gt.Graph, min_distances: list[tuple[int, int]]
) -> list[tuple[int, int]]:
    pred_map = G.vertex_index.copy()
    for i in range(0, len(min_distances)):
        if min_distances[i][0] == INFINITY:
            min_dists_for_root, pred_map = gt_top.shortest_distance(
                G, source=i, directed=True, pred_map=pred_map
            )
            min_distances = update_min_dists(
                current=min_distances,
                newly_found=build_newly_found(
                    dist_map=min_dists_for_root, pred_map=pred_map
                ),
            )

    return min_distances


def make_graph_structure(
    G_gt: gt.Graph,
    *,
    use_optimizer: bool = True,
    iters: int = 60,
    hill_climb_steps: int = 40,
    seed: int = 123,
    w_fr: float = 1.0,
    w_bary: float = 1.0,
    w_var: float = 0.15,
    w_overlap: float = 2.0,
    normalize_to_positive: bool = True,
    invert_y_for_canvas: bool = False,
) -> list[tuple[float, float]]:
    G = _gt_to_pygraph(G_gt)
    assign_levels(G)
    L_sets = LSetCreator().create_initial_L_sets(G)
    for c, nodes in enumerate(L_sets):
        for u in nodes:
            G.V[u].L_set_index = c

    if use_optimizer:
        best_params, _ = optimize_params(
            G,
            iters=iters,
            hill_climb_steps=hill_climb_steps,
            seed=seed,
            quality_weights=(w_fr, w_bary, w_var, w_overlap),
        )
        lc = LayoutCreator(**best_params)
    else:
        lc = LayoutCreator()

    P = lc.create(G)

    if invert_y_for_canvas:
        for i, p in enumerate(P):
            if p is not None:
                x, y = p
                P[i] = (x, -y)

    if normalize_to_positive:
        xs = [p[0] for p in P if p is not None]
        ys = [p[1] for p in P if p is not None]
        shift_x = -min(xs) if xs else 0.0
        shift_y = -min(ys) if ys else 0.0
        out = []
        for p in P:
            if p is None:
                out.append((0.0, 0.0))
            else:
                out.append((p[0] + shift_x, p[1] + shift_y))
        return out
    else:
        return [(0.0, 0.0) if p is None else p for p in P]
