import io
import tempfile

import graph_tool as gt
import networkx as nx
import obonet
from goatools.obo_parser import GODag


def convert_to_graph_tool_graph(
    G_nx: nx.MultiDiGraph,
) -> tuple[gt.Graph, dict]:
    G_gt = gt.Graph(directed=True)
    vertice_mapping = {}
    roots = {}  # cc: GO:0000001, mf: GO:0000002, bp: GO:0000003

    id_prop = G_gt.new_vertex_property("string")
    name_prop = G_gt.new_vertex_property("string")
    namespace_prop = G_gt.new_vertex_property("string")
    def_prop = G_gt.new_vertex_property("string")
    synonym_prop = G_gt.new_vertex_property("vector<string>")
    isa_prop = G_gt.new_vertex_property("vector<string>")

    for node in G_nx.nodes():
        v = G_gt.add_vertex()
        data = G_nx.nodes[node]
        id_prop[v] = node
        name_prop[v] = data.get("name", "")
        namespace_prop[v] = data.get("namespace", "")
        def_prop[v] = data.get("def", "")
        synonym_prop[v] = data.get("synonym", [])
        isa_prop[v] = data.get("is_a", [])
        vertice_mapping[node] = v

    for source, dest in G_nx.edges():
        G_gt.add_edge(vertice_mapping[dest], vertice_mapping[source])

    G_gt.vertex_properties["id"] = id_prop
    G_gt.vertex_properties["name"] = name_prop
    G_gt.vertex_properties["namespace"] = namespace_prop
    G_gt.vertex_properties["def"] = def_prop
    G_gt.vertex_properties["synonym"] = synonym_prop
    G_gt.vertex_properties["is_a"] = isa_prop

    for _, v in vertice_mapping.items():
        if v.in_degree() == 0:
            namespace = namespace_prop[v].lower()
            roots[namespace] = (id_prop[v], v)

    return G_gt, roots


def build_gt_graph_from_obo(obo_file_contents: str) -> gt.Graph:
    obo_file_wrapper = io.StringIO(obo_file_contents)
    with tempfile.NamedTemporaryFile(delete=False, suffix=".obo", mode="w") as tmp:
        tmp.write(obo_file_contents)
        tmp_path = tmp.name

    godag = GODag(tmp_path)
    G_gt, roots = convert_to_graph_tool_graph(obonet.read_obo(obo_file_wrapper))

    return G_gt, roots, godag


def build_graph_from_txt(txt_file_contents: str) -> gt.Graph:
    elems = txt_file_contents.split(sep=None)
    if len(elems) == 0:
        return gt.Graph(directed=True)
    elems = [int(elem) for elem in elems]
    print(elems)
    n = elems[0]
    G_gt = gt.Graph(directed=True)

    V = [G_gt.add_vertex() for _ in range(0, n)]
    for i in range(1, len(elems), 2):
        u, v = elems[i], elems[i + 1]
        G_gt.add_edge(V[u], V[v])

    return G_gt


def filter_graph_by_root(G_gt: gt.Graph, root_vertex: gt.Vertex) -> gt.Graph:
    reachable = gt.topology.label_out_component(G_gt, root_vertex)
    subgraph_view = gt.GraphView(G_gt, vfilt=reachable)
    return gt.Graph(subgraph_view, prune=True)
