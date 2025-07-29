from collections import deque
import graph_tool as gt

def build_ordered_tree(graph: gt.Graph, root):
    # Sprawdź typ root

    queue = deque([(root, [0])])
    ordered_tree = {}

    print(root.is_valid(), "from ")

    return ordered_tree
