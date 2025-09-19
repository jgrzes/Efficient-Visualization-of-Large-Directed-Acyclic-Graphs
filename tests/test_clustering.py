import os

from app.backend.src.clustering.semantic_similiarity.semantic_similarity import (
    cluster_semantic_similarity,
)
from app.backend.src.graph_utils import build_gt_graph_from_obo


def test_clustering_with_mini_obo():
    obo_path = os.path.join(os.path.dirname(__file__), "data", "mini.obo")
    with open(obo_path, "r") as f:
        obo_contents = f.read()

    G, _, godag = build_gt_graph_from_obo(obo_contents)

    labels, representatives = cluster_semantic_similarity(G, godag, n_clusters=2)

    assert len(labels) == G.num_vertices()
    assert len(set(labels)) <= 2
    assert isinstance(representatives, dict)
    assert set(representatives.keys()).issubset(set(labels))
