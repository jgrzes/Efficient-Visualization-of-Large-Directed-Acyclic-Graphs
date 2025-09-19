import os

from clustering.hybrid_clustering import hybrid_clustering
from clustering.semantic_similarity import cluster_semantic_similarity
from graph_utils import build_gt_graph_from_obo


def test_semantic_clustering():
    obo_path = os.path.join(os.path.dirname(__file__), "data", "mini.obo")
    with open(obo_path, "r") as f:
        obo_contents = f.read()

    G, _, godag = build_gt_graph_from_obo(obo_contents)

    labels, representatives = cluster_semantic_similarity(G, godag, n_clusters=2)

    assert len(labels) == G.num_vertices()
    assert len(set(labels)) <= 2
    assert isinstance(representatives, dict)
    assert set(representatives.keys()).issubset(set(labels))

    for rep in representatives.values():
        assert "best_term" in rep
        assert "members" in rep
        assert "cluster_size" in rep


def test_hybrid_clustering():
    obo_path = os.path.join(os.path.dirname(__file__), "data", "mini.obo")
    with open(obo_path, "r") as f:
        obo_contents = f.read()

    G, _, godag = build_gt_graph_from_obo(obo_contents)

    labels, representatives = hybrid_clustering(G, godag, n_clusters=2, alpha=0.5)

    assert len(labels) == G.num_vertices()
    assert len(set(labels)) <= 2
    assert isinstance(representatives, dict)
    assert set(representatives.keys()).issubset(set(labels))

    for rep in representatives.values():
        assert "best_term" in rep
        assert "members" in rep
        assert "cluster_size" in rep
