from collections import defaultdict
from statistics import median
from typing import Any

import graph_tool as gt
import graph_tool.topology as gt_top

INFINITY = 2_147_483_647


def compute_hierarchy_levels(G: gt.Graph) -> dict[int, int]:
    levels = defaultdict(int)

    roots = [v for v in G.vertices() if v.in_degree() == 0]

    for root in roots:
        dist_map = gt_top.shortest_distance(G, source=root)
        for v in G.vertices():
            d = int(dist_map[v])
            if d != INFINITY:
                levels[d] += 1

    return dict(levels)

def _pct(x: int, n: int) -> float:
    """Return percentage of x relative to n (safe for n=0)."""
    return (100.0 * x / n) if n > 0 else 0.0


def _stats(xs: list[int]) -> dict[str, float]:
    """Return min / avg / median / max statistics for a list of integers."""
    if not xs:
        return {"min": 0, "avg": 0.0, "median": 0.0, "max": 0}
    return {
        "min": int(min(xs)),
        "avg": float(sum(xs) / len(xs)),
        "median": float(median(xs)),
        "max": int(max(xs)),
    }


def _avg_nonzero(xs: list[int]) -> float:
    """Average of values > 0 (used to ignore roots or sinks)."""
    cnt = sum(1 for d in xs if d > 0)
    return (sum(d for d in xs if d > 0) / cnt) if cnt > 0 else 0.0


def _top_k(xs: list[int], k: int) -> list[tuple[int, int]]:
    """Return top-k (index, value) pairs sorted by value descending."""
    return sorted(enumerate(xs), key=lambda t: t[1], reverse=True)[:k]


def analyze_dag_basic(G: gt.Graph, top_k: int = 5) -> dict[str, Any]:
    """
    Compute lightweight O(V+E) structural metrics for a directed graph (DAG-oriented).

    This function focuses on cheap, descriptive statistics useful for:
    - quick sanity checks,
    - UI summaries,
    - spotting structural patterns (chains, merges, fan-outs).
    """
    # Basic size
    n_v = int(G.num_vertices())
    n_e = int(G.num_edges())

    # Degree data
    in_degs = [int(v.in_degree()) for v in G.vertices()]
    out_degs = [int(v.out_degree()) for v in G.vertices()]

    # Structural counts
    n_roots = sum(1 for d in in_degs if d == 0)
    n_sinks = sum(1 for d in out_degs if d == 0)
    n_isolated = sum(1 for i, o in zip(in_degs, out_degs) if i == 0 and o == 0)

    n_multi_parent = sum(1 for d in in_degs if d > 1)
    n_multi_child = sum(1 for d in out_degs if d > 1)

    n_chain_nodes = sum(1 for i, o in zip(in_degs, out_degs) if i == 1 and o == 1)

    # Aggregates
    avg_nonzero_in = _avg_nonzero(in_degs)
    avg_nonzero_out = _avg_nonzero(out_degs)

    top_in = _top_k(in_degs, top_k)
    top_out = _top_k(out_degs, top_k)

    # Density (DAG upper bound)
    max_possible_edges = (n_v * (n_v - 1) / 2) if n_v > 1 else 1
    density = (n_e / max_possible_edges) if max_possible_edges else 0.0

    return {
        "n_vertices": n_v,
        "n_edges": n_e,

        "roots": {
            "count": n_roots,
            "pct": _pct(n_roots, n_v),
        },
        "sinks": {
            "count": n_sinks,
            "pct": _pct(n_sinks, n_v),
        },

        "isolated_vertices": n_isolated,

        "multi_parent": {
            "count": n_multi_parent,
            "pct": _pct(n_multi_parent, n_v),
        },
        "multi_child": {
            "count": n_multi_child,
            "pct": _pct(n_multi_child, n_v),
        },

        "chain_vertices": {
            "count": n_chain_nodes,
            "pct": _pct(n_chain_nodes, n_v),
        },

        "in_degree": _stats(in_degs),
        "out_degree": _stats(out_degs),

        "avg_nonzero_in_degree": avg_nonzero_in,
        "avg_nonzero_out_degree": avg_nonzero_out,

        "top_in_degree_vertices": [{"vertex": v, "in_degree": d} for v, d in top_in],
        "top_out_degree_vertices": [{"vertex": v, "out_degree": d} for v, d in top_out],

        "max_possible_edges": max_possible_edges,
        "density": density,
    }