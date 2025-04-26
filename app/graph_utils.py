import networkx as nx
from graph_tool.all import Graph
import random

def convert_to_networkx(g):
    # Converts a graph-tool graph to a networkx graph.
    G_nx = nx.DiGraph()
    for v in g.vertices():
        G_nx.add_node(int(v))
    for e in g.edges():
        G_nx.add_edge(int(e.source()), int(e.target()))
    return G_nx

def convert_to_graph_tool(G_nx):
    # Converts a networkx graph to a graph-tool graph.
    g = Graph(directed=True)
    node_mapping = {}

    for node in G_nx.nodes():
        v = g.add_vertex()
        node_mapping[node] = v

    for source, target in G_nx.edges():
        g.add_edge(node_mapping[source], node_mapping[target])

    return g

def sample_graph(g, sample_size=500):
    # Return a sampled subgraph from the full graph. Graph-tool type.

    if g.num_vertices() <= sample_size:
        return g

    sampled_vertices = random.sample(list(g.vertices()), sample_size)
    sampled_subgraph = Graph(directed=True)
    v_mapping = {}

    for v in sampled_vertices:
        v_mapping[int(v)] = sampled_subgraph.add_vertex()

    for v in sampled_vertices:
        for e in v.out_edges():
            if int(e.target()) in v_mapping:
                sampled_subgraph.add_edge(v_mapping[int(v)], v_mapping[int(e.target())])

    return sampled_subgraph