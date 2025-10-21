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


class GraphState:
    def __init__(self):
        self.G_GT: gt.Graph | None = None
        self.ROOT_ID: str | None = None
        self.GODAG = None


GRAPH_STATE = GraphState()

def _normalize_positions_to_space( # should be refactored
    positions: list[tuple[float, float]],
    padding_ratio: float = 0.02,
) -> list[float]:
    if not positions:
        return []

    xs = [x for x, _ in positions]
    ys = [y for _, y in positions]
    xmin, xmax = min(xs), max(xs)
    ymin, ymax = min(ys), max(ys)
    w = (xmax - xmin) or 1.0
    h = (ymax - ymin) or 1.0

    space_size = 8192
    pad = space_size * padding_ratio
    sx = (space_size - 2 * pad) / w
    sy = (space_size - 2 * pad) / h

    out = [0.0] * (2 * len(positions))
    for i, (x, y) in enumerate(positions):
        nx = (x - xmin) * sx + pad
        ny = (y - ymin) * sy + pad

        out[2 * i] = nx
        out[2 * i + 1] = ny

    return out


def build_reponse_json_string_for_make_graph_structure_req(G_gt, canvas_positions):
    points = _normalize_positions_to_space(canvas_positions)
    links = []
    for e in G_gt.edges():
        links.extend([int(e.source()), int(e.target())])
    return points, links


@app.route("/node/<int:node_id>")
def get_node(node_id):
    """Returns information about a node in the graph."""
    G_gt: gt.Graph = GRAPH_STATE.G_GT
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


@app.route("/node_index/<string:node_id>")
def get_node_index(node_id):
    """Returns the index of a node in the graph based on its ID."""
    G_gt: gt.Graph = GRAPH_STATE.G_GT
    if G_gt is None:
        return jsonify({"error": "Graph not loaded"}), 500

    id_prop = G_gt.vertex_properties["id"]

    for v in G_gt.vertices():
        print(id_prop[v])
        if id_prop[v] == node_id:
            return jsonify({"index": int(v)})

    return jsonify({"error": "Node with given ID not found"}), 404


@app.route("/flask_make_graph_structure", methods=["POST"])
def flask_make_graph_structure():
    file = request.files["file"]

    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    print(f"Received request to make graph structure for {file.filename}")
    G_gt: gt.Graph | None = None
    try:
        ext = file.filename.split(".")[-1]
        if ext not in ["obo", "txt"]:
            return jsonify({"error": "Unsupported file type"}), 400

        if ext == "obo":
            G_gt, roots, godag = build_gt_graph_from_obo(file.read().decode("utf-8"))
            print("Constructed graph from obo file")

            root_namespace = request.form.get("root", None)
            if root_namespace is not None:
                root_id, root_vertex = roots.get(
                    root_namespace, None
                )  # returns (id string:GO:XXXX, vertex gt.Vertex:vertex)
                print(f"Root vertex is {root_id}, index {root_vertex}")
                G_gt = filter_graph_by_root(G_gt, root_vertex)

        elif ext == "txt":
            G_gt = build_graph_from_txt(file.read().decode("utf-8"))
            print("Constructed graph from txt file")

        GRAPH_STATE.G_GT = G_gt
        GRAPH_STATE.ROOT_ID = root_id if "root_id" in locals() else None
        GRAPH_STATE.GODAG = godag if "godag" in locals() else None
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
    G_gt = GRAPH_STATE.G_GT
    if not G_gt:
        return jsonify({"error": "Graph not found"}), 404

    hierarchy_levels = compute_hierarchy_levels(G_gt)
    return jsonify({"hierarchy_levels": hierarchy_levels})


@app.route("/search_node", methods=["POST"])
def search_node():
    """Search nodes by field (id, name, namespace, def, synonym, is_a, or all) and query string."""
    G_gt: gt.Graph = GRAPH_STATE.G_GT
    if G_gt is None:
        return jsonify({"error": "Graph not loaded"}), 500

    data = request.get_json()
    field = data.get("field")
    query = data.get("query")
    print(field)
    if not field or not query:
        return (
            jsonify({"error": "Missing parameters: field and query are required"}),
            400,
        )

    prop_map = {
        "id": G_gt.vertex_properties["id"],
        "name": G_gt.vertex_properties["name"],
        "namespace": G_gt.vertex_properties["namespace"],
        "def": G_gt.vertex_properties["def"],
        "synonym": G_gt.vertex_properties["synonym"],
        "is_a": G_gt.vertex_properties["is_a"],
    }

    results = []
    for v in G_gt.vertices():
        match = False

        if field == "all":
            for _, prop in prop_map.items():
                value = prop[v]
                if isinstance(value, (list, tuple)):
                    if any(query.lower() in str(item).lower() for item in value):
                        match = True
                        break
                else:
                    if query.lower() in str(value).lower():
                        match = True
                        break
        else:
            if field not in prop_map:
                return jsonify({"error": f"Invalid field: {field}"}), 400

            value = prop_map[field][v]
            if isinstance(value, (list, tuple)):
                match = any(query.lower() in str(item).lower() for item in value)
            else:
                match = query.lower() in str(value).lower()

        if match:
            results.append(
                {
                    "node_index": int(v),
                    "id": G_gt.vertex_properties["id"][v],
                    "name": G_gt.vertex_properties["name"][v],
                    "namespace": G_gt.vertex_properties["namespace"][v],
                    "def": G_gt.vertex_properties["def"][v].replace('"', ""),
                    "synonym": list(G_gt.vertex_properties["synonym"][v])
                    if G_gt.vertex_properties["synonym"][v]
                    else [],
                    "is_a": list(G_gt.vertex_properties["is_a"][v])
                    if G_gt.vertex_properties["is_a"][v]
                    else [],
                }
            )

    if not results:
        return jsonify({"message": "No matching nodes found"}), 404

    return jsonify(results)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT_NUMBER)
