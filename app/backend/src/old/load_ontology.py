import obonet
from graph_tool.all import Graph
from graph_utils import convert_to_graph_tool

def load_go_graph(obo_path, verbose=True, to_graph_tool=True):
    # Returns a graph-tool graph from an OBO file.
    if verbose: print(f"Loading ontology from {obo_path}...")

    g = obonet.read_obo(obo_path)

    if to_graph_tool: g = convert_to_graph_tool(g)

    if verbose: print(f"Graph loaded: {g.num_vertices()} vertices, {g.num_edges()} edges\n")
    return g