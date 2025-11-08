import hashlib
import os
from datetime import datetime

import graph_tool as gt
import orjson
from flask import Flask, jsonify, redirect, request
from flask_cors import CORS
from generate_graph_structure import make_graph_structure
from graph_analysis import compute_hierarchy_levels
from graph_utils import (
    build_graph_from_txt,
    build_gt_graph_from_obo,
    filter_graph_by_root,
)
from pymongo import MongoClient, ReturnDocument

PORT_NUMBER = 30_301
app = Flask(__name__)
CORS(app)


class GraphState:
    def __init__(self):
        self.G_GT: gt.Graph | None = None
        self.ROOT_ID: str | None = None
        self.GODAG = None
        self.HASH: str | None = None  # required to track if the loaded graph matches the saved one, mongodb-wise


# --- MongoDB config ---
MONGODB_URI = os.getenv(
    "MONGODB_URI",
    "mongodb://inz_user:devpass@mongo:27017/inz?authSource=inz",
)
FRONT_URL = os.getenv("FRONT_URL", "http://localhost:30306")
DB_NAME = os.getenv("DB_NAME", "inz")
COLL_NAME = os.getenv("COLL_NAME", "graphs")

client = MongoClient(MONGODB_URI)
db = client[DB_NAME]
graphs = db[COLL_NAME]
graphs.create_index("hash", unique=True)


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


def _canonicalize_positions(xs: list[float]) -> list[float]:
    return [round(float(v), 5) for v in xs]


def _canonicalize_links(ls: list[int]) -> list[int]:
    return [int(v) for v in ls]


def _compute_hash(canvas_positions: list[float], links: list[int]) -> str:
    payload = {
        "p": _canonicalize_positions(canvas_positions),
        "l": _canonicalize_links(links),
    }
    return hashlib.sha256(orjson.dumps(payload)).hexdigest()[:12]


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


@app.route("/graphs", methods=["POST"])
def save_graph():
    """
    Save graph positions and links to the database.

    Expects JSON:
    {
      "canvas_positions": [x0, y0, x1, y1, ...],
      "links": [u0, v0, u1, v1, ...],
      "meta": {...}  # optional
    }
    """
    data = request.get_json(force=True)
    if not data or "canvas_positions" not in data or "links" not in data:
        return jsonify({"error": "canvas_positions and links are required"}), 400

    canvas_positions = data["canvas_positions"]
    links = data["links"]
    meta = data.get("meta", {})

    G_gt: gt.Graph | None = GRAPH_STATE.G_GT
    if G_gt is None:
        return jsonify({"error": "Graph structure not loaded on backend"}), 500

    ghash = _compute_hash(canvas_positions, links)

    id_prop = G_gt.vertex_properties["id"]
    name_prop = G_gt.vertex_properties["name"]
    namespace_prop = G_gt.vertex_properties["namespace"]
    def_prop = G_gt.vertex_properties["def"]
    synonym_prop = G_gt.vertex_properties["synonym"]
    isa_prop = G_gt.vertex_properties["is_a"]

    nodes = []
    for v in G_gt.vertices():
        nodes.append(
            {
                "id": id_prop[v],
                "name": name_prop[v],
                "namespace": namespace_prop[v],
                "def": def_prop[v],
                "synonym": list(synonym_prop[v]) if synonym_prop[v] else [],
                "is_a": list(isa_prop[v]) if isa_prop[v] else [],
            }
        )

    graph_payload = {
        "nodes": nodes,
    }

    doc = {
        "hash": ghash,
        "canvas_positions": _canonicalize_positions(canvas_positions),
        "links": _canonicalize_links(links),
        "meta": {
            **meta,
            "root_id": GRAPH_STATE.ROOT_ID,
        },
        "graph": graph_payload,
        "created_at": datetime.utcnow(),
    }

    saved = graphs.find_one_and_update(
        {"hash": ghash},
        {"$set": doc},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )

    GRAPH_STATE.HASH = ghash

    return jsonify(
        {
            "hash": saved["hash"],
            "url": f"{FRONT_URL}/?g={saved['hash']}",
        }
    )


@app.route("/graphs/<hash_id>", methods=["GET"])
def get_graph(hash_id: str):
    """Pobranie zapisanych pozycji grafu po hash-u + odbudowa GRAPH_STATE."""
    doc = graphs.find_one({"hash": hash_id}, {"_id": 0})
    if not doc:
        return jsonify({"error": "Graph not found"}), 404
    
    # if the graph in memory is not the requested one, rebuild it
    if GRAPH_STATE.G_GT is None or GRAPH_STATE.HASH != hash_id:
        graph_doc = doc.get("graph")
        if graph_doc and "nodes" in graph_doc:
            nodes = graph_doc["nodes"]

            g = gt.Graph(directed=True)
            g.add_vertex(len(nodes))

            id_prop = g.new_vertex_property("string")
            name_prop = g.new_vertex_property("string")
            namespace_prop = g.new_vertex_property("string")
            def_prop = g.new_vertex_property("string")
            synonym_prop = g.new_vertex_property("object")
            isa_prop = g.new_vertex_property("object")

            for idx, node in enumerate(nodes):
                v = g.vertex(idx)
                id_prop[v] = node.get("id", "")
                name_prop[v] = node.get("name", "")
                namespace_prop[v] = node.get("namespace", "")
                def_prop[v] = node.get("def", "")
                synonym_prop[v] = node.get("synonym", [])
                isa_prop[v] = node.get("is_a", [])

            g.vertex_properties["id"] = id_prop
            g.vertex_properties["name"] = name_prop
            g.vertex_properties["namespace"] = namespace_prop
            g.vertex_properties["def"] = def_prop
            g.vertex_properties["synonym"] = synonym_prop
            g.vertex_properties["is_a"] = isa_prop

            links = doc["links"]
            for i in range(0, len(links), 2):
                u = int(links[i])
                v = int(links[i + 1])
                g.add_edge(u, v)

            GRAPH_STATE.G_GT = g
            GRAPH_STATE.HASH = hash_id
            GRAPH_STATE.ROOT_ID = doc.get("meta", {}).get("root_id")

    return jsonify(
        {
            "canvas_positions": doc["canvas_positions"],
            "links": doc["links"],
            "meta": doc.get("meta", {}),
        }
    )


@app.route("/g/<hash_id>", methods=["GET"])
def redirect_to_front(hash_id: str):
    return redirect(f"{FRONT_URL}/?g={hash_id}", code=302)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT_NUMBER)
