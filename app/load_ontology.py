import obonet
from graph_tool.all import Graph

def load_go_graph(obo_path, verbose=True):
    # Returns a graph-tool graph from an OBO file.
    if verbose: print(f"Loading ontology from {obo_path}...")

    networkx_graph = obonet.read_obo(obo_path)

    g = Graph(directed=True)
    node_mapping = {}

    for node in networkx_graph.nodes():
        v = g.add_vertex()
        node_mapping[node] = v

    for source, target in networkx_graph.edges():
        g.add_edge(node_mapping[source], node_mapping[target])

    if verbose: print(f"Graph loaded: {g.num_vertices()} vertices, {g.num_edges()} edges\n")
    return g