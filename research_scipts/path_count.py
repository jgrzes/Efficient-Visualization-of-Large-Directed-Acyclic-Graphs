import graph_tool.all as gt
from collections import Counter
import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../app/backend/src")))
from graph_utils import build_gt_graph_from_obo
import matplotlib.pyplot as plt

MAX_PATH_LENGTH = 20 

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


def compute_path_length_distribution(G: gt.Graph, max_length, roots, node_data):

    def find_vertex_by_id(G, node_id):
        for v in G.vertices():
            if node_data[v]['id'] == node_id:
                return v
        return None

    counters = {}
    for root in roots.values():
        root_vertex = find_vertex_by_id(G, root)
        if root_vertex is None:
            continue

        counter = dfs_path_lengths(G, root_vertex, max_length)
        namespace = node_data[root_vertex].get("namespace", "").lower()
        
        if namespace not in counters:
            counters[namespace] = Counter()
        
        counters[namespace] += counter

    return counters
    
def plot_counters(counters):
    plt.figure(figsize=(10, 6))

    for namespace, counter in counters.items():
        lengths = list(counter.keys())
        counts = list(counter.values())
        plt.plot(lengths, counts, label=namespace.replace('_', ' ').upper())

    plt.xticks(range(1, MAX_PATH_LENGTH + 1))
    plt.title("Path Length Distribution")
    plt.xlabel("Path Length")
    plt.ylabel("Count")
    plt.legend()
    plt.savefig("path_length_distribution.png")
    plt.show()

if __name__ == "__main__":
    with open("...", "r") as f: # adjust path to your OBO file
        obo_contents = f.read()

    graph, node_data, roots = build_gt_graph_from_obo(obo_contents)
    path_length_distribution = compute_path_length_distribution(graph, MAX_PATH_LENGTH, roots, node_data)

    plot_counters(path_length_distribution)