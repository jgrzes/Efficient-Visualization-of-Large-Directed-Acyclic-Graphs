import argparse
from collections import Counter

import graph_tool.all as gt
import matplotlib.pyplot as plt

from app.backend.src.graph_utils import build_gt_graph_from_obo


def dfs_path_lengths(G, v, max_depth, depth=0, counter=None):
    if counter is None:
        counter = Counter()

    if depth > 0:
        counter[depth] += 1
    if depth == max_depth:
        return
    for w in v.out_neighbors():
        dfs_path_lengths(G, w, max_depth, depth + 1, counter)

    return counter


def compute_path_length_distribution(G: gt.Graph, max_length, roots):
    counters = {}
    for _, root_vertex in roots.values():
        counter = dfs_path_lengths(G, root_vertex, max_length)
        namespace = G.vp["namespace"][root_vertex].lower()

        if namespace not in counters:
            counters[namespace] = Counter()

        counters[namespace] += counter

    return counters


def plot_counters(counters, MAX_PATH_LENGTH):
    plt.figure(figsize=(10, 6))

    for namespace, counter in counters.items():
        lengths = list(counter.keys())
        counts = list(counter.values())
        plt.plot(lengths, counts, label=namespace.replace("_", " ").upper())

    plt.xticks(range(1, MAX_PATH_LENGTH + 1))
    plt.title("Path Length Distribution")
    plt.xlabel("Path Length")
    plt.ylabel("Count")
    plt.legend()
    plt.savefig("path_length_distribution.png")
    plt.show()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Graph processing from OBO file")
    parser.add_argument(
        "--obo-path",
        type=str,
        default="app/backend/data/go-basic.obo",
        help="Path to the OBO file",
    )
    parser.add_argument(
        "--max-path-length",
        type=int,
        default=20,
        help="Maximum path length to consider",
    )
    args = parser.parse_args()

    with open(args.obo_path, "r") as f:
        obo_contents = f.read()
        graph, roots, godag = build_gt_graph_from_obo(obo_contents)
        path_length_distribution = compute_path_length_distribution(
            graph, args.max_path_length, roots
        )
        plot_counters(path_length_distribution)
