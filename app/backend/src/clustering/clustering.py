import graph_tool.all as gt
from clustering.utils import build_ordered_tree

def cluster_graph(G : gt.Graph, vertices, root, n_clusters) -> list:
    ordered_tree = build_ordered_tree(G, root)
    print(ordered_tree)

    #fill clusters with vertex ids
    clusters = [i % n_clusters for i in range(len(vertices))]
    return clusters