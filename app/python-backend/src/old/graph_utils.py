import io
import tempfile
from typing import Dict, Tuple, Any, Optional
import re
import numpy as np

import graph_tool as gt
import networkx as nx
import obonet
from goatools.obo_parser import GODag
import json
from flask import request


# TODO: Add json as an allowed extension
ALLOWED_FILE_FORMATS = ["obo", "txt"]
EMPTY_PROPERTY_FIELD = "$N/A$"


def read_type_in_gt_compatible_way(value: Any) -> Any:
    if isinstance(value, str):
        return "string"
    elif isinstance(value, int):
        return "int"
    elif isinstance(value, float):
        return "float"
    elif isinstance(value, bool):
        return "bool"
    elif isinstance(value, list):
        underlying_data = "string"
        if len(value) != 0:
            underlying_data = read_type_in_gt_compatible_way(value[0])
        return f"vector<{underlying_data}>"


def convert_to_json_parsable_representation(gt_value: Any) -> Any:
    gt_value_type_hint = str(type(gt_value))
    # gt_value_type_hint = gt_value_type_hint.rstrip()
    # gt_value_type_hint = gt_value_type_hint.lstrip()

    # gt_value_type_hint = gt_value_type_hint.rstrip("'>")
    # gt_value_type_hint = gt_value_type_hint.lstrip("<class '")
    if len(re.findall(r".+Vector.*", gt_value_type_hint)) != 0:
        return list(gt_value)
    # elif len(re.findall(r"(np|numpy)\.int.*", gt_value_type_hint)) != 0:
    #     return int(gt_value)
    # elif len(re.findall(r"(np|numpy)\.float.*", gt_value_type_hint)) != 0:
    #     return float(gt_value)
    elif isinstance(gt_value, (np.integer,)):
        return int(gt_value)
    elif isinstance(gt_value, (np.floating,)):
        return float(gt_value)
    elif isinstance(gt_value, str):
        return gt_value.replace("'", "").replace('"', '')
    else:
        return gt_value



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

def build_gt_graph_from_graph_dict(graph_data: Dict[str, Any]) -> gt.Graph:
    """Builds a graph-tool Graph from a dict in the same format as stored in MongoDB."""

    if "num_of_vertices" not in graph_data:
        raise ValueError("Missing 'num_of_vertices' field in graph data")

    if "vertices" not in graph_data:
        raise ValueError("Missing 'vertices' field in graph data")

    n = graph_data["num_of_vertices"]
    vertices_data = graph_data["vertices"]

    # check if all vertices have "name" field
    for vertex_data in vertices_data:
        if "name" not in vertex_data:
            raise ValueError("Vertex data missing 'name' field")

    G_gt = gt.Graph(directed=True)
    V = [G_gt.add_vertex() for _ in range(n)]

    for v in range(n):
        Nv = vertices_data[v]["N"]
        for w in Nv:
            G_gt.add_edge(V[v], V[w])

    vertex_metadata_keys = set()
    for vertex_data_entry in vertices_data:
        for field in vertex_data_entry.keys():
            if field in {"index", "N", "pos"}:
                continue
            vertex_metadata_keys.add(field)

    for p in vertex_metadata_keys:
        G_gt.vertex_properties[p] = G_gt.new_vertex_property(
            read_type_in_gt_compatible_way(p)
        )

    for i, vertex_data_entry in enumerate(vertices_data):
        for p in vertex_metadata_keys:
            if p not in vertex_data_entry:
                G_gt.vertex_properties[p][i] = EMPTY_PROPERTY_FIELD
            else:
                val = vertex_data_entry[p]
                if isinstance(
                    val, (list, dict, tuple)
                ):  # if it's complex, store as JSON string
                    G_gt.vertex_properties[p][i] = json.dumps(val)
                else:
                    G_gt.vertex_properties[p][i] = str(val)

    return G_gt


def build_graph_from_json_contents(raw_contents: str) -> gt.Graph:
    """Builds a graph-tool Graph from a JSON string in the same format as stored in MongoDB."""
    graph_data = json.loads(raw_contents)
    return build_gt_graph_from_graph_dict(graph_data)


def load_graph_from_uploaded_file(file) -> Tuple[gt.Graph, Optional[str], Any]:
    """
    Accepts a file from the request, builds a graph-tool Graph based on the extension,
    and returns: (G_gt, root_id, godag).

    - OBO: uses build_gt_graph_from_obo + optional filtering by root namespace.
    - JSON: parses a saved graph (format as in the database/export).
    """
    ext = file.filename.rsplit(".", 1)[-1].lower()
    raw_contents = file.read().decode("utf-8")

    root_id: Optional[str] = None
    godag: Any = None

    if ext == "obo":
        G_gt, roots, godag = build_gt_graph_from_obo(raw_contents)

        root_namespace = request.form.get("root", None)
        if root_namespace is not None:
            root_id, root_vertex = roots.get(root_namespace, (None, None))
            if root_vertex is not None:
                G_gt = filter_graph_by_root(G_gt, root_vertex)

        return G_gt, root_id, godag

    elif ext == "json":
        G_gt = build_graph_from_json_contents(raw_contents)
        return G_gt, None, None

    elif ext == "txt":  # maybe we should get rid of this format?
        G_gt = build_graph_from_txt(raw_contents)
        return G_gt, None, None

    raise ValueError(f"Unsupported file type: {ext}")