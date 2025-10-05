from __future__ import annotations

from typing import Dict, List, Optional, Tuple

import graph_tool.all as gt
import numpy as np
from goatools.semantic import TermCounts, get_info_content


def _pairs_in_cluster(members: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
    """Returns list of tuples (i, j) with i < j (indexes) for all pairs in members"""
    if len(members) < 2:
        return np.array([], dtype=int), np.array([], dtype=int)
    I, J = np.triu_indices(len(members), k=1)  # upper triangle, no diagonal (k=1)
    return members[I], members[J]


def compute_basic_cluster_metrics(
    G: gt.Graph,
    labels: List[int],
    sim_matrix: Optional[np.ndarray] = None,
    godag=None,
) -> Dict:
    """
    Computes various metrics for the clusters defined by `labels` on graph `G`.

    Takes:
        - graph-tool graph
        - list of cluster labels (one per vertex),
        - optional similarity matrix (n x n) and optional GODag for IC calculations.

    Returns:
        - dictionary with cluster metrics and global silhouette score (if sim_matrix provided)
    """
    n = G.num_vertices()
    labels = np.asarray(labels)
    clusters = {}
    uniq = np.unique(labels)  # cluster IDs

    vert_index = np.arange(n)
    edges = [(int(e.source()), int(e.target())) for e in G.edges()]
    edges_undirected = edges + [(v, u) for (u, v) in edges]

    # GO terms and IC
    id_prop = G.vertex_properties.get("id", None)
    termcounts = None
    ic_cache = {}
    if godag is not None and id_prop is not None and TermCounts is not None:
        termcounts = TermCounts(godag, {})

    dist_matrix = None
    if sim_matrix is not None:
        dist_matrix = 1.0 - sim_matrix

    cl_members = {c: vert_index[labels == c] for c in uniq}

    deg_total = np.zeros(n, dtype=int)
    deg_in_cluster = {c: np.zeros(n, dtype=int) for c in uniq}
    for u, _ in edges_undirected:
        deg_total[u] += 1
    for c, members in cl_members.items():
        member_set = set(members.tolist())
        for u, v in edges:
            if u in member_set and v in member_set:
                deg_in_cluster[c][u] += 1
                deg_in_cluster[c][v] += 1

    # Per-cluster metrics
    for c, members in cl_members.items():
        size = len(members)
        meta = {"size": int(size)}

        # Intra/Inter similarity
        if sim_matrix is not None:
            i_idx, j_idx = _pairs_in_cluster(members)
            if len(i_idx) > 0:
                intra_vals = sim_matrix[i_idx, j_idx]
                meta["intra_mean_sim"] = float(np.mean(intra_vals))
                meta["intra_min_sim"] = float(np.min(intra_vals))
                meta["intra_q25_sim"] = float(np.quantile(intra_vals, 0.25))
            else:
                meta["intra_mean_sim"] = meta["intra_min_sim"] = meta[
                    "intra_q25_sim"
                ] = float("nan")

            # Inter
            other = vert_index[labels != c]
            if len(other) > 0:
                inter_vals = sim_matrix[np.ix_(members, other)]
                meta["inter_max_sim"] = float(np.max(inter_vals))
                meta["inter_mean_sim"] = float(np.mean(inter_vals))
            else:
                meta["inter_max_sim"] = meta["inter_mean_sim"] = float("nan")

        members_set = set(members.tolist())
        cut = 0
        for u, v in edges:
            cut += int((u in members_set) ^ (v in members_set))
        cut //= 2
        meta["edge_cut"] = int(cut)

        vol_S = int(np.sum(deg_total[members]))
        vol_notS = int(np.sum(deg_total) - vol_S)
        meta["conductance"] = float(cut / max(1, min(vol_S, vol_notS)))

        # IC
        if termcounts is not None:
            ic_vals = []
            for v in members:
                term = id_prop[G.vertex(v)]
                if term in ic_cache:
                    ic_vals.append(ic_cache[term])
                else:
                    ic = get_info_content(term, termcounts)
                    ic_cache[term] = ic
                    ic_vals.append(ic)
            if ic_vals:
                meta["ic_mean"] = float(np.mean(ic_vals))
                meta["ic_median"] = float(np.median(ic_vals))
                meta["ic_q75"] = float(np.quantile(ic_vals, 0.75))
            else:
                meta["ic_mean"] = meta["ic_median"] = meta["ic_q75"] = float("nan")

        clusters[int(c)] = meta

    # Silhouette
    silhouette = float("nan")
    if dist_matrix is not None and len(uniq) > 1:
        s_vals = []
        for i in range(n):
            c = labels[i]
            in_c = cl_members[c]
            # a(i)
            if len(in_c) > 1:
                a_i = float(np.mean(dist_matrix[i, in_c[in_c != i]]))
            else:
                a_i = 0.0
            # b(i)
            b_i = float("inf")
            for c2, mem2 in cl_members.items():
                if c2 == c or len(mem2) == 0:
                    continue
                b_i = min(b_i, float(np.mean(dist_matrix[i, mem2])))
            s = 0.0 if b_i == float("inf") else (b_i - a_i) / max(a_i, b_i, 1e-12)
            s_vals.append(s)
        silhouette = float(np.mean(s_vals))

    return {"clusters": clusters, "silhouette": silhouette}
