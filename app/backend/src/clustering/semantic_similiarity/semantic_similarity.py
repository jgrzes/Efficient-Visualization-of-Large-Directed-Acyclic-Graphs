from goatools.semantic import semantic_similarity
from goatools.obo_parser import GODag
from goatools.semantic import TermCounts, get_info_content
import numpy as np
import graph_tool.all as gt
from sklearn.cluster import AgglomerativeClustering

def cluster_semantic_similarity(G: gt.Graph, godag: GODag, n_clusters: int) -> list:
    ''' 
    Clusters the graph based on semantic similarity using GO terms. 
    Args:
        G (gt.Graph): The graph to be clustered.
        godag (GODag): The GO DAG used for semantic similarity calculations.
        n_clusters (int): The number of clusters to form.
    Returns:
        list: A list of cluster labels for each vertex in the graph.
    '''

    id_prop = G.vertex_properties["id"]

    go_terms = [id_prop[v] for v in G.vertices()]

    termcounts = TermCounts(godag, {})

    n = len(go_terms)
    sim_values = np.zeros((n, n))

    for i in range(n):
        for j in range(i, n):
            sim = semantic_similarity(go_terms[i], go_terms[j], godag, termcounts)
            sim_values[i][j] = sim
            sim_values[j][i] = sim  # symetryczna

    clustering = AgglomerativeClustering(n_clusters=n_clusters, metric='precomputed', linkage='average')
    labels = clustering.fit_predict(1 - sim_values)

    return labels.tolist()

def find_representative_vertex(termcounts: TermCounts, cluster_labels: list):
    representatives = {} # cluster_id -> best_term

    for cluster in set(cluster_labels):
        cluster_terms = [i for i, label in enumerate(cluster_labels) if label == cluster]
        # highest IC
        best_term = max(cluster_terms, key=lambda term: get_info_content(term, termcounts))
        representatives[cluster] = best_term

    return representatives