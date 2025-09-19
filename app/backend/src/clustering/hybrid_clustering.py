import graph_tool.all as gt
import numpy as np
from clustering.semantic_similarity import compute_semantic_similarity_matrix
from goatools.obo_parser import GODag
from goatools.semantic import TermCounts, get_info_content
from sklearn.cluster import AgglomerativeClustering


def compute_structural_similarity_matrix(G: gt.Graph) -> np.ndarray:
    n = G.num_vertices()
    ancestors = []

    for v in G.vertices():
        visited = set()
        stack = [v]
        while stack:
            node = stack.pop()
            if node not in visited:
                visited.add(node)
                stack.extend(node.in_neighbors())
        ancestors.append(visited)

    sim_values = np.zeros((n, n))
    for i in range(n):
        for j in range(i, n):
            inter = len(ancestors[i].intersection(ancestors[j]))
            union = len(ancestors[i].union(ancestors[j]))
            sim = inter / union if union > 0 else 0.0
            sim_values[i, j] = sim
            sim_values[j, i] = sim
    return sim_values


def hybrid_clustering(G: gt.Graph, godag: GODag, n_clusters: int, alpha: float = 0.5):
    """
    Clusters the graph based both on semantic similarity and structural similarity.
    Args:
        G (gt.Graph): The graph to be clustered.
        godag (GODag): The GO DAG used for semantic similarity calculations.
        n_clusters (int): The number of clusters to form.
        alpha (float): Weighting factor between semantic and structural similarity (0 <= alpha <= 1).
    Returns:
        list: A list of cluster labels for each vertex in the graph.
    """

    sem_matrix = compute_semantic_similarity_matrix(G, godag)
    struct_matrix = compute_structural_similarity_matrix(G)

    sim_hybrid = alpha * sem_matrix + (1 - alpha) * struct_matrix

    clustering = AgglomerativeClustering(
        n_clusters=n_clusters, metric="precomputed", linkage="average"
    )
    labels = clustering.fit_predict(1 - sim_hybrid)

    id_prop = G.vertex_properties["id"]
    go_terms = [id_prop[v] for v in G.vertices()]
    termcounts = TermCounts(godag, {})
    representatives = {}
    for cluster in set(labels):
        cluster_terms = [i for i, label in enumerate(labels) if label == cluster]
        best_term = max(
            cluster_terms, key=lambda term: get_info_content(go_terms[term], termcounts)
        )
        representatives[int(cluster)] = {
            "best_term": int(best_term),
            "members": [int(term) for term in cluster_terms],
            "cluster_size": len(cluster_terms),
        }

    return labels.tolist(), representatives
