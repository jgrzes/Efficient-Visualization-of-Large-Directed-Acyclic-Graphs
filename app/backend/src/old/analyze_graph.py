'''
1. Characterizing GO Ontologies
    - Analyze the distribution of path lengths and the total number of paths. Since we are dealing with a DAG, paths can merge and split. DONE
    - Analyze the number of nodes (GO-terms) at each level in the hierarchy (from root to leaves) TODO
'''


from graph_tool.all import Graph, shortest_distance
from collections import Counter
import numpy as np

INFINITY = 2147483647 # graph tool represents infinity as this value, maybe should be moved to another file

def get_roots(g):
    return [v for v in g.vertices() if v.in_degree() == 0]


def compute_min_distances(g, roots):
    # For each node, returns the minimum shortest distance from any root.
    all_distances = []
    for root in roots:
        dist = shortest_distance(g, source=root, directed=True)
        all_distances.append(dist.a)

    min_distances = np.min(all_distances, axis=0)
    return min_distances


def count_nodes_per_level(min_distances):
    level_counter = Counter()
    for d in min_distances:
        d = int(d)
        if d != INFINITY:
            level_counter[d] += 1
    return level_counter


def calculate_nodes_level(g, printing=True):
    # Calculates the number of nodes at each level in the graph. Returns a dictionary with levels as keys and the number of nodes at that level as values.
    roots = get_roots(g)
    if not roots:
        print("No root nodes found in the graph.")
        return

    print(f"Found {len(roots)} roots.")
    print("\nAnalyzing node levels from roots...")

    min_distances = compute_min_distances(g, roots)
    level_counter = count_nodes_per_level(min_distances)
    if printing:
        print("Number of nodes at each level:")
        for level in sorted(level_counter.keys()):
            print(f"   Level {level}: {level_counter[level]} nodes")

    return level_counter