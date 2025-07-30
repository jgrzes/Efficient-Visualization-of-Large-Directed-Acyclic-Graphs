import graph_tool.all as gt
from clustering.semantic_similiarity.semantic_similarity import cluster_semantic_similarity

def cluster_graph(G: gt.Graph, n_clusters, godag) -> list:
    return cluster_semantic_similarity(G, godag, n_clusters)