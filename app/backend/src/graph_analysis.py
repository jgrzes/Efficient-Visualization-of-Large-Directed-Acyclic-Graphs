import graph_tool as gt
import graph_tool.topology as gt_top
from collections import defaultdict
from typing import Dict

INFINITY = 2_147_483_647

def compute_hierarchy_levels(G: gt.Graph) -> dict[int, int]:
    levels = defaultdict(int)

    roots = [v for v in G.vertices() if v.in_degree() == 0]

    for root in roots:
        dist_map = gt_top.shortest_distance(G, source=root)
        for v in G.vertices():
            d = int(dist_map[v])
            if d != INFINITY:
                levels[d] += 1

    return dict(levels)