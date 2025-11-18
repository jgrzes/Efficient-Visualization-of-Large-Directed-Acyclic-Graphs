import graph_tool as gt
import re
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


@app.route("/node/<int:node_idx>")
def get_node(node_idx):
    """Returns information about a node in the graph."""
    G_gt: gt.Graph = GRAPH_STATE.G_GT
    if G_gt is None or node_idx >= G_gt.num_vertices():
        return jsonify({"error": "Node not found"}), 404

    v = G_gt.vertex(node_idx)

    id_prop = G_gt.vertex_properties["id"]
    name_prop = G_gt.vertex_properties["name"]
    namespace_prop = G_gt.vertex_properties["namespace"]
    def_prop = G_gt.vertex_properties["def"]
    synonym_prop = G_gt.vertex_properties["synonym"]
    isa_prop = G_gt.vertex_properties["is_a"]

    return jsonify(
        {
            "index": int(v),
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
    """Search nodes by field(s) and query string(s)."""
    G_gt: gt.Graph = GRAPH_STATE.G_GT
    if G_gt is None:
        return jsonify({"error": "Graph not loaded"}), 500

    data = request.get_json() or {}

    match_case = bool(data.get("matchCase", False))
    match_words = bool(data.get("matchWords", False))

    filters = data.get("filters")
    field = data.get("field")
    query = data.get("query")

    prop_map = {
        "id": G_gt.vertex_properties["id"],
        "name": G_gt.vertex_properties["name"],
        "namespace": G_gt.vertex_properties["namespace"],
        "def": G_gt.vertex_properties["def"],
        "synonym": G_gt.vertex_properties["synonym"],
        "is_a": G_gt.vertex_properties["is_a"],
    }

    def string_matches(text: str, q: str) -> bool:
        if not match_case:
            text_cmp = text.lower()
            query_cmp = q.lower()
        else:
            text_cmp = text
            query_cmp = q

        if match_words:
            pattern = r"\b{}\b".format(re.escape(query_cmp))
            return re.search(pattern, text_cmp) is not None
        else:
            return query_cmp in text_cmp

    def value_matches(value, q: str) -> bool:
        if isinstance(value, (list, tuple)):
            return any(string_matches(str(item), q) for item in value)
        else:
            return string_matches(str(value), q)

    normalized_filters: list[tuple[str, str]] = []

    # ★ NOWY FORMAT: filters = [{ field, query }, ...]
    if filters and isinstance(filters, list):
        for f in filters:
            raw_field = f.get("field")
            raw_query = f.get("query")

            # field może być pusty / None → wtedy szukamy po wszystkich
            if raw_query is None:
                return jsonify({"error": "Each filter requires 'query'"}), 400

            f_query = str(raw_query).strip()

            # jeśli brak field lub pusty po strip → traktuj jako "all"
            if raw_field is None:
                f_field = "all"
            else:
                f_field = str(raw_field).strip().lower() or "all"

            normalized_filters.append((f_field, f_query))

    # ★ STARY FORMAT: pojedyncze field/query
    else:
        if query is None:
            return jsonify({"error": "Missing parameter: query is required"}), 400

        f_query = str(query).strip()

        # jeśli field brak / pusty → "all"
        if field is None:
            f_field = "all"
        else:
            f_field = str(field).strip().lower() or "all"

        normalized_filters.append((f_field, f_query))

    results = []

    for v in G_gt.vertices():
        vertex_ok = True

        for filt_field, filt_query in normalized_filters:
            # ★ JEŚLI filt_field == "all" → szukamy po wszystkich polach
            if filt_field == "all":
                matched_any = False
                for prop_name, prop in prop_map.items():
                    value = prop[v]
                    if value_matches(value, filt_query):
                        matched_any = True
                        break
                if not matched_any:
                    vertex_ok = False
                    break
            else:
                if filt_field not in prop_map:
                    return jsonify({"error": f"Invalid field: {filt_field}"}), 400

                value = prop_map[filt_field][v]
                if not value_matches(value, filt_query):
                    vertex_ok = False
                    break

        if not vertex_ok:
            continue

        results.append(
            {
                "index": int(v),
                "id": G_gt.vertex_properties["id"][v],
                "name": G_gt.vertex_properties["name"][v],
                "namespace": G_gt.vertex_properties["namespace"][v],
                "def": G_gt.vertex_properties["def"][v].replace('"', ""),
                "synonym": list(G_gt.vertex_properties["synonym"][v]) if G_gt.vertex_properties["synonym"][v] else [],
                "is_a": list(G_gt.vertex_properties["is_a"][v]) if G_gt.vertex_properties["is_a"][v] else [],
            }
        )

    if not results:
        return jsonify({"message": "No matching nodes found"}), 404

    return jsonify(results)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT_NUMBER)
