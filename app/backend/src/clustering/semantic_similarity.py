import graph_tool.all as gt
import numpy as np
from goatools.obo_parser import GODag
from goatools.semantic import TermCounts, semantic_similarity
from sklearn.cluster import AgglomerativeClustering


def find_representative_vertex(
    G: gt.Graph,
    labels: list,
    termcounts: TermCounts,
    sim_matrix: np.ndarray,
    k_top: int = 1,
):
    id_prop = G.vertex_properties["id"]
    representatives = {}

    labels = np.asarray(labels)
    n = G.num_vertices()
    vert_index = np.arange(n)

    for c in np.unique(labels):
        members = vert_index[labels == c]
        if len(members) == 0:
            continue
        if len(members) == 1:
            v = int(members[0])
            term = id_prop[G.vertex(v)]
            representatives[int(c)] = {
                "centroid_terms": [int(term)],
                "centroid_vertices": [v],
                "centroid_scores": [1.0],
                "members": [int(m) for m in members],
                "cluster_size": len(members),
            }
            continue

        S = sim_matrix[np.ix_(members, members)]

        scores = S.mean(axis=1)

        order = np.argsort(scores)[::-1]
        top_idx_local = order[:k_top]
        top_vertices = [int(members[i]) for i in top_idx_local]
        top_terms = [id_prop[G.vertex(v)] for v in top_vertices]
        top_scores = [float(scores[i]) for i in top_idx_local]

        representatives[int(c)] = {
            "centroid_terms": [int(t) for t in top_terms],
            "centroid_vertices": top_vertices,
            "centroid_scores": top_scores,
            "members": [int(m) for m in members],
            "cluster_size": len(members),
        }

    return representatives


def compute_semantic_similarity_matrix(G: gt.Graph, godag: GODag) -> np.ndarray:
    id_prop = G.vertex_properties["id"]
    go_terms = [id_prop[v] for v in G.vertices()]
    termcounts = TermCounts(godag, {})

    n = len(go_terms)
    sim_values = np.zeros((n, n))

    for i in range(n):
        for j in range(i, n):
            sim = semantic_similarity(go_terms[i], go_terms[j], godag, termcounts)
            sim_values[i][j] = sim
            sim_values[j][i] = sim  # symmetric

    return sim_values


def cluster_semantic_similarity(G: gt.Graph, godag: GODag, n_clusters: int) -> list:
    """
    Clusters the graph based on semantic similarity using GO terms.
    Args:
        G (gt.Graph): The graph to be clustered.
        godag (GODag): The GO DAG used for semantic similarity calculations.
        n_clusters (int): The number of clusters to form.
    Returns:
        list: A list of cluster labels for each vertex in the graph.
    """

    sim_values = compute_semantic_similarity_matrix(G, godag)
    termcounts = TermCounts(godag, {})

    clustering = AgglomerativeClustering(
        n_clusters=n_clusters, metric="precomputed", linkage="average"
    )
    labels = clustering.fit_predict(1 - sim_values)
    representatives = find_representative_vertex(termcounts, labels)

    return labels.tolist(), representatives
