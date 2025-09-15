from dataclasses import dataclass

import graph_tool as gt
from flask import Flask, jsonify, request
from flask_cors import CORS
from generate_graph_structure import make_graph_structure
from graph_analysis import compute_hierarchy_levels
from graph_utils import (
    build_graph_from_txt,
    build_gt_graph_from_obo,
    filter_graph_by_root,
)

PORT_NUMBER = 30_301
app = Flask(__name__)
CORS(app)


@dataclass
class GraphState:
    def __init__(self):
        self.G_GT: gt.Graph | None = None
        self.ROOT_ID: str | None = None
        self.GODAG = None


GRAPH_STATE = GraphState()


def build_reponse_json_string_for_make_graph_structure_req(
    G_gt: gt.Graph, canvas_positions: list[tuple[float, float]]
) -> str:
    transformed_canvas_positions = [0 for _ in range(0, 2 * len(canvas_positions))]
    for i in range(0, len(canvas_positions)):
        x, y = canvas_positions[i]
        transformed_canvas_positions[2 * i] = x
        transformed_canvas_positions[2 * i + 1] = y

    links = []
    for e in G_gt.edges():
        u, v = int(e.source()), int(e.target())
        links.append(u)
        links.append(v)

    return transformed_canvas_positions, links


@app.route("/node/<int:node_id>")
def get_node(node_id):
    """Returns information about a node in the graph."""
    G_gt: gt.Graph = GRAPH_STATE.get("G_GT", None)
    if G_gt is None or node_id >= G_gt.num_vertices():
        return jsonify({"error": "Node not found"}), 404

    v = G_gt.vertex(node_id)

    id_prop = G_gt.vertex_properties["id"]
    name_prop = G_gt.vertex_properties["name"]
    namespace_prop = G_gt.vertex_properties["namespace"]
    def_prop = G_gt.vertex_properties["def"]
    synonym_prop = G_gt.vertex_properties["synonym"]
    isa_prop = G_gt.vertex_properties["is_a"]

    return jsonify(
        {
            "id": id_prop[v],
            "name": name_prop[v],
            "namespace": namespace_prop[v],
            "def": def_prop[v].replace('"', ""),
            "synonym": list(synonym_prop[v]) if synonym_prop[v] else [],
            "is_a": list(isa_prop[v]) if isa_prop[v] else [],
        }
    )


@app.route("/flask_make_graph_structure", methods=["POST"])
def flask_make_graph_structure():
    file = request.files["file"]

    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    print(f"Received request to make graph structure for {file.filename}")
    G_gt: gt.Graph | None = None
    try:
        if file.filename.split(".")[-1] == "obo":
            G_gt, roots, godag = build_gt_graph_from_obo(file.read().decode("utf-8"))
            print("Constructed graph from obo file")

            root_namespace = request.form.get("root", None)
            if root_namespace is not None:
                root_id, root_vertex = roots.get(
                    root_namespace, None
                )  # returns (id string:GO:XXXX, vertex gt.Vertex:vertex)
                print(f"Root vertex is {root_id}, index {root_vertex}")
                G_gt = filter_graph_by_root(G_gt, root_vertex)

        elif file.filename.split(".")[-1] == "txt":
            G_gt = build_graph_from_txt(file.read().decode("utf-8"))
            print("Constructed graph from txt file")

        GRAPH_STATE.graph = G_gt
        GRAPH_STATE.godag = godag
        GRAPH_STATE.root_id = root_id
        GRAPH_STATE.roots = roots

        print(
            f"Loaded graph, it has: {len(G_gt.get_vertices())} vertices and {len(G_gt.get_edges())} edges"
        )

    except Exception as e:
        print("Something went wrong when trying to construct the graph: ", e)

    if G_gt is not None:
        canvas_positions = make_graph_structure(G_gt)
        print("Found canvas positions")
        (
            transformed_canvas_positions,
            links,
        ) = build_reponse_json_string_for_make_graph_structure_req(
            G_gt=G_gt, canvas_positions=canvas_positions
        )
        print("Built data to return to frontend")

        return jsonify(
            {"canvas_positions": transformed_canvas_positions, "links": links}
        )


@app.route("/analyze_graph", methods=["POST"])
def analyze_graph():
    G_gt = GRAPH_STATE.graph
    if not G_gt:
        return jsonify({"error": "Graph not found"}), 404

    hierarchy_levels = compute_hierarchy_levels(G_gt)
    return jsonify({"hierarchy_levels": hierarchy_levels})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT_NUMBER)
