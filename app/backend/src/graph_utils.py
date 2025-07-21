import networkx as nx
import graph_tool as gt
import obonet
import io


def convert_to_graph_tool_graph(G_nx: nx.MultiDiGraph) -> tuple[gt.Graph, dict, dict]:
    G_gt = gt.Graph(directed=True)
    vertice_mapping = {}
    node_data = {}
    roots = {} # cc: GO:0000001, mf: GO:0000002, bp: GO:0000003

    for node in G_nx.nodes():
        v = G_gt.add_vertex()
        node_data[v] = G_nx.nodes[node]
        node_data[v]['id'] = node # e.g. GO:0000001
        vertice_mapping[node] = v

    for source, dest in G_nx.edges():
        G_gt.add_edge(vertice_mapping[dest], vertice_mapping[source]) # obo files are in reverse direction

    for node, v in vertice_mapping.items():
        if v.in_degree() == 0:
            namespace = node_data[v].get("namespace", "").lower()
            roots[namespace] = (node_data[v]["id"], v)

    return G_gt, node_data, roots


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


def filter_graph_by_root(G_gt: gt.Graph, root_vertex: gt.Vertex) -> gt.Graph:

    reachable = gt.topology.label_out_component(G_gt, root_vertex)

    subgraph_view = gt.GraphView(G_gt, vfilt=reachable)
    filtered_graph = gt.Graph(subgraph_view, prune=True)

    return filtered_graph