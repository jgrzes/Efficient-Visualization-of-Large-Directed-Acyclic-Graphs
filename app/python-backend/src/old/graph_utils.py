import networkx as nx
import graph_tool as gt
import obonet
import io


def convert_to_graph_tool_graph(G_nx: nx.MultiDiGraph) -> gt.Graph:
    G_gt = gt.Graph(directed=True)
    vertice_mapping = {}

    for node in G_nx.nodes():
        v = G_gt.add_vertex()
        vertice_mapping[node] = v

    for source, dest in G_nx.edges():
        G_gt.add_edge(vertice_mapping[source], vertice_mapping[dest])

    return G_gt


def build_gt_graph_from_obo(obo_file_contents: str) -> gt.Graph:
    obo_file_wrapper = io.StringIO(obo_file_contents)
    return convert_to_graph_tool_graph(obonet.read_obo(obo_file_wrapper))


def build_graph_from_txt(txt_file_contents: str) -> gt.Graph:
    elems = txt_file_contents.split(sep=None)
    if len(elems) == 0: return gt.Graph(directed=True)
    elems = [int(elem) for elem in elems]
    print(elems)
    n = elems[0]
    G_gt = gt.Graph(directed=True)

    V = [G_gt.add_vertex() for _ in range (0, n)]
    for i in range (1, len(elems), 2):
        u, v = elems[i], elems[i+1]
        G_gt.add_edge(V[u], V[v])

    return G_gt    


