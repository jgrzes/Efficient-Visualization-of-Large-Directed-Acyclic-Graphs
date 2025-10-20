import io
import tempfile
from typing import Dict, Tuple

import graph_tool as gt
import networkx as nx
import obonet
from goatools.obo_parser import GODag


def convert_to_graph_tool_graph(
    G_nx: nx.MultiDiGraph,
) -> Tuple[gt.Graph, Dict[str, list[tuple[str, gt.Vertex]]]]:
    """Convert a NetworkX MultiDiGraph (from obonet) into a graph-tool Graph."""
    G_gt = gt.Graph(directed=True)
    vertex_mapping: dict[str, gt.Vertex] = {}
    roots: dict[str, list[tuple[str, gt.Vertex]]] = {}

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
        vertex_mapping[node] = v

    for source, dest in G_nx.edges():
        # obonet edges are reversed
        G_gt.add_edge(vertex_mapping[dest], vertex_mapping[source])

    G_gt.vertex_properties["id"] = id_prop
    G_gt.vertex_properties["name"] = name_prop
    G_gt.vertex_properties["namespace"] = namespace_prop
    G_gt.vertex_properties["def"] = def_prop
    G_gt.vertex_properties["synonym"] = synonym_prop
    G_gt.vertex_properties["is_a"] = isa_prop

    for _, v in vertex_mapping.items():
        if v.in_degree() == 0:
            namespace = namespace_prop[v].lower()
            roots[namespace] = (id_prop[v], v)

    return G_gt, roots


def build_gt_graph_from_obo(
    obo_file_contents: str,
) -> Tuple[gt.Graph, dict, GODag]:
    """Build a graph-tool Graph from an OBO file's contents."""
    obo_file_wrapper = io.StringIO(obo_file_contents)
    with tempfile.NamedTemporaryFile(suffix=".obo", mode="w") as tmp:
        tmp.write(obo_file_contents)
        tmp.flush()
        godag = GODag(tmp.name)  # useful for clustering and other analyses

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
    """Filter a graph to the subgraph reachable from the given root vertex."""
    reachable = gt.topology.label_out_component(G_gt, root_vertex)
    subgraph_view = gt.GraphView(G_gt, vfilt=reachable)
    return gt.Graph(subgraph_view, prune=True)
