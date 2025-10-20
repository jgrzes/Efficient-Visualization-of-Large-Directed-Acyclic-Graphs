# Based on Force-directed layout by Stephen G. Kobourov.

import math
import random
from typing import Dict, Iterable, List, Optional, Tuple

from .create_layout import LayoutCreator
from .graph import Graph

Vec2 = Tuple[float, float]


def euclidean_distance(p1: Vec2, p2: Vec2) -> float:
    dx = p1[0] - p2[0]
    dy = p1[1] - p2[1]
    return math.hypot(dx, dy)


def bounding_box_area(points: Iterable[Optional[Vec2]]) -> float:
    # Calculates area of bounding box around given points. Necessary for FR calculations.
    xs, ys = [], []
    for p in points:
        if p is None:
            continue
        xs.append(p[0])
        ys.append(p[1])
    if not xs:
        return 1.0
    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)
    w = max(max_x - min_x, 1e-6)
    h = max(max_y - min_y, 1e-6)
    return w * h


def graph_edges(G: Graph) -> set[Tuple[int, int]]:
    # Returns set of undirected edges (no duplicates)
    edges: set[Tuple[int, int]] = set()
    for u in range(len(G.V)):
        for v in G.N(u):
            a, b = (u, v) if u < v else (v, u)
            edges.add((a, b))
    return edges


def fr_net_force(
    G: Graph,
    P: List[Optional[Tuple[float, float]]],
    C: float = 1.0,
) -> float:
    """
    Sum of squared net forces on nodes according to Fruchterman-Reingold model.
    Takes:
        - G: graph
        - P: list of node positions (None for unpositioned nodes)
        - C: constant multiplier for ideal edge length
    Returns:
        - sum of squared net forces
    """
    EPS_D = 1e-6

    idx = [i for i, p in enumerate(P) if p is not None]
    n = len(idx)
    if n <= 1:
        return 0.0

    area = bounding_box_area(P)

    k = C * math.sqrt(area / n)

    Fx = [0.0] * len(P)
    Fy = [0.0] * len(P)

    # Repulsion between all pairs of nodes
    for a in range(n - 1):
        i = idx[a]
        xi, yi = P[i]
        for b in range(a + 1, n):
            j = idx[b]
            xj, yj = P[j]

            dx = xi - xj
            dy = yi - yj
            dist = math.hypot(dx, dy)
            if dist < EPS_D:
                dist = EPS_D

            inv = 1.0 / dist
            ux = dx * inv
            uy = dy * inv
            Fr = math.pow(k, 2) * inv  # |Fr| = k^2 / dist

            Fx[i] += ux * Fr
            Fy[i] += uy * Fr
            Fx[j] -= ux * Fr
            Fy[j] -= uy * Fr

    # Attraction along edges
    for u, v in graph_edges(G):
        pu = P[u]
        pv = P[v]
        if pu is None or pv is None:
            continue

        dx = pv[0] - pu[0]
        dy = pv[1] - pu[1]
        dist = math.hypot(dx, dy)
        if dist < EPS_D:
            dist = EPS_D

        inv = 1.0 / dist
        ux = dx * inv
        uy = dy * inv
        Fa = math.pow(dist, 2) / k  # |Fa| = dist^2 / k

        Fx[u] += ux * Fa
        Fy[u] += uy * Fa
        Fx[v] -= ux * Fa
        Fy[v] -= uy * Fa

    return sum(Fx[i] * Fx[i] + Fy[i] * Fy[i] for i in idx)


def barycentric_residual(G: Graph, P: List[Optional[Vec2]]) -> float:
    """
    Sum of squared distances between each node and the barycenter of its neighbors.
    Ignores nodes without positions or without positioned neighbors.
    Takes:
        - G: graph
        - P: list of node positions (None for unpositioned nodes)
    Returns:
        - sum of squared distances to barycenters
    """

    res = 0.0
    for v in range(len(G.V)):
        pv = P[v]
        if pv is None:
            continue
        sx = sy = 0.0
        m = 0
        for u in G.N(v):
            pu = P[u]
            if pu is None:
                continue
            sx += pu[0]
            sy += pu[1]
            m += 1
        if m == 0:
            continue
        bx = sx / m
        by = sy / m
        dx = pv[0] - bx
        dy = pv[1] - by
        res += dx * dx + dy * dy
    return res


def edge_length_variance(G: Graph, P: List[Optional[Vec2]]) -> float:
    """
    Variance of edge lengths.
    """
    lengths: List[float] = []
    for u, v in graph_edges(G):
        pu, pv = P[u], P[v]
        if pu is None or pv is None:
            continue
        dx = pu[0] - pv[0]
        dy = pu[1] - pv[1]
        lengths.append(math.hypot(dx, dy))
    if len(lengths) < 2:
        return 0.0
    mean = sum(lengths) / len(lengths)
    return sum((l - mean) * (l - mean) for l in lengths) / len(lengths)


def overlap_penalty(P: List[Optional[Vec2]], min_dist: float = 8.0) -> float:
    """
    Penalty for nodes being closer than min_dist.
    For each pair of points closer than min_dist, adds (min_dist - d)^2 to the penalty.
    0.0 = no overlap.
    """
    pts = [p for p in P if p is not None]
    pen = 0.0
    for i in range(len(pts) - 1):
        x1, y1 = pts[i]
        for j in range(i + 1, len(pts)):
            x2, y2 = pts[j]
            d = math.hypot(x1 - x2, y1 - y2)
            if d < min_dist:
                diff = min_dist - d
                pen += diff * diff
    return pen


def quality_score(
    G: Graph,
    P: List[Optional[Vec2]],
    *,
    w_fr: float = 1.0,
    w_bary: float = 1.0,
    w_var: float = 0.15,
    w_overlap: float = 2.0,
) -> float:
    """
    Calculates quality score of layout P for graph G:
        score = w_fr*FR + w_bary*Bary + w_var*Var + w_overlap*Overlap
    Lower score = better layout.
    """
    fr = fr_net_force(G, P, C=1.0)  # 12.2
    bary = barycentric_residual(G, P)  # 12.3
    var = edge_length_variance(G, P)
    ovl = overlap_penalty(P, min_dist=8.0)
    return w_fr * fr + w_bary * bary + w_var * var + w_overlap * ovl


# Parameter optimization

ParamSpace = Dict[str, Tuple[float, float]]

_DEFAULT_SPACE: ParamSpace = {
    "alpha_p": (0.1, 2.0),
    "beta_p": (0.5, 4.0),
    "s_coeff": (0.8, 2.0),
    "k_init_layout_coeff": (0.5, 4.0),
    "pull_up_coeff": (0.0, 1.5),
    "l_interspring_transfer": (0.0, 1.2),
    "vertice_weight": (0.5, 2.5),
    "add_children_weight_coeff": (0.0, 1.0),
    "g_acc": (5.0, 25.0),
    "box_width_coeff": (2.0, 8.0),
    "padding": (2.0, 20.0),
    "margin_padding_coeff": (0.0, 0.2),
}


def _sample(space: ParamSpace) -> Dict[str, float]:
    return {k: random.uniform(lo, hi) for k, (lo, hi) in space.items()}


def _mutate(
    params: Dict[str, float], space: ParamSpace, scale: float = 0.2
) -> Dict[str, float]:
    out = dict(params)
    for k, (lo, hi) in space.items():
        span = hi - lo
        sigma = scale * span
        out[k] = min(hi, max(lo, random.gauss(out[k], sigma)))
    return out


def _build_creator(params: Dict[str, float]) -> LayoutCreator:
    return LayoutCreator(
        padding=params["padding"],
        box_width_coeff=params["box_width_coeff"],
        margin_padding_coeff=params["margin_padding_coeff"],
        alpha_p=params["alpha_p"],
        beta_p=params["beta_p"],
        s_coeff=params["s_coeff"],
        l_interspring_transfer=params["l_interspring_transfer"],
        vertice_weight=params["vertice_weight"],
        add_children_weight_coeff=params["add_children_weight_coeff"],
        g_acc=params["g_acc"],
        k_init_layout_coeff=params["k_init_layout_coeff"],
        pull_up_coeff=params["pull_up_coeff"],
    )


def optimize_params(
    G: Graph,
    *,
    space: ParamSpace = None,
    iters: int = 80,
    hill_climb_steps: int = 40,
    seed: int = 42,
    quality_weights: Tuple[float, float, float, float] = (1.0, 1.0, 0.15, 2.0),
) -> Tuple[Dict[str, float], float]:
    """
    Minimizes quality score of layout for graph G by optimizing parameters of LayoutCreator.
    Uses random sampling followed by hill climbing.
    Takes:
        - G: graph
        - space: parameter space (name -> (min, max))
        - iters: number of random samples
        - hill_climb_steps: number of hill climbing steps
        - seed: random seed
        - quality_weights: weights for quality score components (w_fr, w_bary, w_var, w_overlap)
    Returns:
        - best parameters found
        - best score achieved
    """
    random.seed(seed)
    space = space or _DEFAULT_SPACE
    w_fr, w_bary, w_var, w_overlap = quality_weights

    def _score_for(creator: LayoutCreator) -> float:
        P = creator.create(G)
        return quality_score(
            G, P, w_fr=w_fr, w_bary=w_bary, w_var=w_var, w_overlap=w_overlap
        )

    best = _sample(space)
    best_creator = _build_creator(best)
    best_score = _score_for(best_creator)

    for _ in range(iters):
        cand = _sample(space)
        creator = _build_creator(cand)
        s = _score_for(creator)
        if s < best_score:
            best, best_score = cand, s
            best_creator = creator

    step_scale = 0.25
    for _ in range(hill_climb_steps):
        cand = _mutate(best, space, scale=step_scale)
        creator = _build_creator(cand)
        s = _score_for(creator)
        if s < best_score:
            best, best_score = cand, s
            best_creator = creator
        step_scale *= 0.95

    return best, best_score
