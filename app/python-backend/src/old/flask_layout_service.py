from datetime import datetime
import json
import os
from typing import Any, List, Optional, Tuple, Dict
import logging

import graph_tool as gt
from database_manager import MongoDatabaseManager
from dotenv import load_dotenv
from flask import Flask, jsonify, redirect, request
from flask_cors import CORS
from generate_graph_structure import make_graph_structure  # To be removed
from graph_analysis import (
    compute_hierarchy_levels,  # TODO: Make better graph analysis functionality
)
from graph_data_storage import GraphDataStorage
from graph_utils import *

load_dotenv()

SERVICE_IP_ADDRESS = os.getenv("SERVICE_IP_ADDRESS", "0.0.0.0")
SERVICE_PORT = int(os.getenv("SERVICE_PORT", "30301"))
MONGO_ACCESS_KEY = os.getenv("MONGO_ACCESS_KEY", "")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "inz")
# FRONT_URL = os.getenv("FRONT_URL")

app = Flask(__name__)
CORS(app)

temp_graph_data_storage: GraphDataStorage = None
db_manager: MongoDatabaseManager = None

EMPTY_PROPERTY_FIELD = "$N/A$"

logger: logging.Logger = None


def extract_vertex_names(G_gt: gt.Graph) -> list[str]:
    """
    Returns the list of vertex names from the graph G_gt. If the "name" property does not exist,
    returns the vertex indices as strings.
    """
    name_prop = G_gt.vertex_properties.get("name")
    if name_prop is None:
        return [str(int(v)) for v in G_gt.vertices()]
    return [str(name_prop[v]) for v in G_gt.vertices()]


def build_reponse_json_string_for_make_graph_structure_req(
    G_gt: gt.Graph, canvas_positions: list[tuple[float, float]]
) -> Tuple[List[int], List[int]]:
    transformed_canvas_positions = [0 for _ in range(0, 2 * len(canvas_positions))]
    for i in range(0, len(canvas_positions)):
        x, y = canvas_positions[i]
        transformed_canvas_positions[2 * i] = x
        transformed_canvas_positions[2 * i + 1] = y

    links: List[int] = []
    for e in G_gt.edges():
        u, v = int(e.source()), int(e.target())
        links.append(u)
        links.append(v)

    return transformed_canvas_positions, links


@app.route("/node/<string:graph_uuid>/<int:node_id>", methods=["GET"])
def get_node_information(graph_uuid: str, node_id: int):
    logger.info(f"Received call on endpoint /node/<graph_uuid={graph_uuid}>/<node_id={node_id}>.")
    try:
        graph_info = temp_graph_data_storage.get_graph_data_for_id(graph_uuid)
    except RuntimeError as e:
        print(f"Node data acquisition error: {e}")
        return jsonify({}), 404

    G_gt = graph_info["graph"]
    all_vertex_properties = G_gt.vertex_properties.keys()
    v = G_gt.vertex(node_id)

    m: Dict[str, Any] = {}
    for p in all_vertex_properties:
        val = G_gt.vertex_properties[p][v]
        if val == EMPTY_PROPERTY_FIELD:
            continue
        try:
            parsed_val = json.loads(val)
            m[p] = parsed_val
        except (json.JSONDecodeError, TypeError):
            m[p] = convert_to_json_parsable_representation(val)
            
    logger.info(
        f"Data returned on endpoint call /node/<graph_uuid={graph_uuid}>/<node_id={node_id}>: "
        + str(m)
    )

    return jsonify(m), 200


@app.route("/node_index/<string:graph_uuid>/<string:node_name>", methods=["GET"])
def get_node_index(graph_uuid: str, node_name: str):
    """
    Returns the index of the node with the given name in the specified graph.
    """
    logger.info(
        f"Received call on endpoint /node_index/<graph_uuid={graph_uuid}>/<node_name={node_name}>"
    )

    try:
        graph_info = temp_graph_data_storage.get_graph_data_for_id(graph_uuid)
    except RuntimeError as e:
        print(f"Node data acquisition error: {e}")
        return jsonify({}), 404

    G_gt: gt.Graph = graph_info["graph"]
    name_prop = G_gt.vertex_properties.get("name")

    if name_prop is None:
        return jsonify({"error": "Graph has no 'name' vertex property"}), 400

    for v in G_gt.vertices():
        if str(name_prop[v]).lower() == node_name.lower():
            return jsonify({"index": int(v)}), 200

    return jsonify({}), 404


# TODO: Hook up to cpp backend
@app.route("/flask_make_graph_structure", methods=["POST"])
def flask_make_graph_structure():
    file = request.files.get("file")

    if file is None or file.filename == "":
        return jsonify({"error": "No file provided"}), 400

    root_id, godag = None, None
    G_gt: Optional[gt.Graph] = None
    graph_uuid: str = None

    try:
        G_gt, root_id, godag = load_graph_from_uploaded_file(
            file
        )  # it works for all supported types, not only OBO (root_id and godag may be None)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        print(f"Error while loading graph: {e}")
        return jsonify({"error": "Failed to construct graph from file"}), 500

    canvas_positions = make_graph_structure(G_gt)
    (
        transformed_canvas_positions,
        links,
    ) = build_reponse_json_string_for_make_graph_structure_req(
        G_gt=G_gt, canvas_positions=canvas_positions
    )

    graph_uuid = temp_graph_data_storage.register_new_graph_data(
        {
            "name": file.filename,
            "graph": G_gt,
            "root_id": root_id,
            "godag": godag,
            "layout": transformed_canvas_positions,
        }
    )

    names = extract_vertex_names(G_gt)

    logger.info(f"Computed layout for {file.filename}, as well as generated new uuid for it, which is as follows {graph_uuid}")

    return (
        jsonify(
            {
                "uuid": graph_uuid,
                "canvas_positions": transformed_canvas_positions,
                "links": links,
                "names": names,
            }
        ),
        200,
    )


# TODO: Weird endpoint name
@app.route("/analyze_graph/<string:graph_uuid>", methods=["POST"])
def analyze_graph(graph_uuid: str):
    logger.info(f"Received request on endpoint /analyze_graph/<graph_uuid={graph_uuid}>")
    G_gt: gt.Graph = None
    try:
        graph_data = temp_graph_data_storage.get_graph_data_for_id(graph_uuid)
        G_gt = graph_data["graph"]
    except RuntimeError:
        return jsonify({"error": "Graph not found"}), 404

    hierarchy_levels = compute_hierarchy_levels(G_gt)
    logger.info(f"Successfully analyzed graph with uuid as follows: {graph_uuid} (WTFM)")
    return jsonify({"hierarchy_levels": hierarchy_levels}), 200


@app.route("/search_node/<string:graph_uuid>", methods=["POST"])
def search_node(graph_uuid: str):
    """
    Received from the frontend a JSON with the following structure:
    {
      "filters": [{ "field": "name" | "all" | "<vertex_prop>", "query": "<text>" }, ...],
      "matchCase": bool,
      "matchWords": bool
    }
    """
    logger.info(f"Received call on endpoint /search_node/<graph_uuid={graph_uuid}>")

    try:
        graph_data = temp_graph_data_storage.get_graph_data_for_id(graph_uuid)
    except RuntimeError:
        return jsonify({"error": "Graph not found"}), 404

    G_gt: gt.Graph = graph_data["graph"]
    all_props = G_gt.vertex_properties

    data = request.get_json(force=True)
    filters = data.get("filters")
    match_case = bool(data.get("matchCase", False))
    match_words = bool(data.get("matchWords", False))

    cleaned_filters = [] # we use .strip() to clean up field and query strings
    for f in filters:
        field = (f.get("field") or "").strip()
        query = (str(f.get("query") or "")).strip()
        if not query:
            return jsonify({"error": "Empty query in filters"}), 400
        cleaned_filters.append({"field": field, "query": query})

    def normalize(s: str) -> str:
        # Helper function to normalize strings based on match_case
        return s if match_case else s.lower()

    def value_matches(value: Any, query_str: str) -> bool:
        if value is None:
            return False

        if isinstance(value, (list, tuple, set)):
            return any(value_matches(v, query_str) for v in value)

        val_s = str(value)
        query_normalized = normalize(query_str)
        value_normalized = normalize(val_s)

        if match_words:
            import re
            tokens = [t for t in re.split(r"\W+", value_normalized) if t]
            return query_normalized in tokens

        return query_normalized in value_normalized

    results: list[dict[str, Any]] = []

    for v in G_gt.vertices():
        v_idx = int(v)

        matches_all = True
        for f in cleaned_filters:
            field = f["field"]
            query = f["query"]

            if field == "": # empty field means search in all fields
                matched_this = False
                for prop in all_props.values():
                    if value_matches(prop[v], query):
                        matched_this = True
                        break
            else:
                if field not in all_props:
                    return jsonify({"error": f"Invalid field: {field}"}), 400
                matched_this = value_matches(all_props[field][v], query)

            if not matched_this:
                matches_all = False
                break

        if not matches_all:
            continue

        node_entry: dict[str, Any] = {"index": v_idx}
        for prop_name, prop in all_props.items():
            val = prop[v]
            if val == EMPTY_PROPERTY_FIELD:
                continue
            try:
                parsed = json.loads(val)
                node_entry[prop_name] = parsed
            except (json.JSONDecodeError, TypeError):
                node_entry[prop_name] = convert_to_json_parsable_representation(val)

        results.append(node_entry)

    if not results:
        return jsonify({"error": "No matching nodes found"}), 404

    logger.info(f"Successful node search for graph with uuid as follows: {graph_uuid}")
    return jsonify(results), 200


@app.route("/save_graph/<string:graph_uuid>", methods=["POST"])
def save_graph_to_db(graph_uuid: str):
    logger.info(f"Received call on endpoint /save_graph/<graph_uuid={graph_uuid}>")
    graph_data: Dict[str, Any] = None 
    try:
        graph_data = temp_graph_data_storage.get_graph_data_for_id(graph_uuid)
    except RuntimeError:
        return jsonify({"error": "Graph not found"}), 404

    name = graph_data["name"]
    G_gt = graph_data["graph"]

    data = request.get_json(force=True)
    if not data or "canvas_positions" not in data or "links" not in data:
        return jsonify({"error": "Canvas positions and links are required"}), 400

    graph_hash = data.get("graph_hash", "")

    # Groups
    group_name = data.get("group_name", None)
    group_password = data.get("group_password", None)

    if group_name is not None and group_password is not None:
        group = db_manager.get_group(group_name)
        if group is None:
            # Create new group
            db_manager.create_graph_group(group_name, group_password)
        else:
            # Verify password
            if not db_manager.verify_group_password(group_name, group_password):
                return jsonify({"error": "Invalid group password"}), 403

    linearized_layout = data["canvas_positions"]

    layout = [None for _ in range(int(len(linearized_layout) // 2))]
    for i in range(int(len(linearized_layout) // 2)):
        layout[i] = (linearized_layout[2 * i], linearized_layout[2 * i + 1])

    # TODO: Optimize
    all_vertex_properties = [key for key in G_gt.vertex_properties.keys()]

    n = G_gt.num_vertices()
    vertices_metadata: List[Dict[str, Any]] = [None for _ in range(n)]
    for i, v in enumerate(G_gt.vertices()):
        vertices_metadata[i] = {}
        for p in all_vertex_properties:
            if G_gt.vertex_properties[p][v] == EMPTY_PROPERTY_FIELD:
                continue
            vertices_metadata[i][p] = convert_to_json_parsable_representation(
                G_gt.vertex_properties[p][v]
            )

    additional_config_keys = ["point_size", "space_size", "group_name"]
    additional_config = {key: data.get(key) for key in additional_config_keys if key in data}

    if not db_manager.check_if_contains_graph_with_hash(graph_hash):
        graph_hash = db_manager.push_new_entry(
            name=name,
            E_adj_list=[
                list(G_gt.get_out_neighbors(i)) for i in range(G_gt.num_vertices())
            ],
            layout=layout,
            vertices_metadata=vertices_metadata,
            additional_config=additional_config,  # TODO: Should probably contain point sizes and space sizes
        )
    else:
        db_manager.override_existing_entry(
            graph_id=graph_hash,
            name=name,
            E_adj_list=[
                list(G_gt.get_out_neighbors(i)) for i in range(G_gt.num_vertices())
            ],
            layout=layout,
            vertices_metadata=vertices_metadata,
            additional_config=additional_config,  # TODO: Should probably contain point sizes and space sizes
        )

    if group_name is not None:
        db_manager.add_graph_to_group(graph_hash, group_name)

    return (
        jsonify(
            {
                "hash": graph_hash,
            }
        ),
        200,
    )


def _build_graph_from_graph_data(graph_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Builds the response dict for loading a graph from the database, given the graph data dict
    as stored in the database.
    """
    G_gt = build_gt_graph_from_graph_dict(graph_data)
    n = graph_data["num_of_vertices"]
    vertices_data = graph_data["vertices"]

    linearized_links: List[int] = []
    for v in range(n):
        Nv = vertices_data[v]["N"]
        for w in Nv:
            linearized_links.append(v)
            linearized_links.append(w)

    linearized_canvas_positions: List[float] = [0.0 for _ in range(2 * n)]
    for i in range(n):
        x, y = vertices_data[i]["pos"]
        linearized_canvas_positions[2 * i] = x
        linearized_canvas_positions[2 * i + 1] = y

    payload = {
        "name": graph_data["name"],
        "graph": G_gt,
        "root_id": None,
        "godag": None,
        "layout": linearized_canvas_positions,
    }
    
    payload["point_size"] = graph_data.get("point_size", 1)
    payload["space_size"] = graph_data.get("space_size", 256)

    config_keys = [
        key
        for key in graph_data.keys()
        if key
        not in ["name", "num_of_vertices", "last_entry_update", "vertices", "_id"]
    ]
    config = {key: graph_data[key] for key in config_keys}

    graph_uuid = temp_graph_data_storage.register_new_graph_data(payload)

    names = extract_vertex_names(G_gt)

    return {
        "uuid": graph_uuid,
        "canvas_positions": linearized_canvas_positions,
        "links": linearized_links,
        "config": config,
        "names" : names
    }


@app.route("/load_graph/<string:graph_hash>", methods=["GET"])
def load_graph_from_db(graph_hash: str):
    graph_data = db_manager.fetch_data(graph_hash)
    if graph_data is None:
        return jsonify({"error": "No graph with such hash kept in the database"}), 404

    built = _build_graph_from_graph_data(graph_data)

    return (
        jsonify(
            {
                "graph_hash": graph_hash,
                **built,
            }
        ),
        200,
    )


@app.route("/g/<string:graph_hash>", methods=["GET"])
def redirect_to_front(graph_hash: str):
    frontend_url = request.host_url.rstrip("/")
    return redirect(f"{frontend_url}/?g={graph_hash}", code=302)


@app.route("/export_graph/<string:graph_uuid>", methods=["GET"])
def export_graph(graph_uuid: str):
    try:
        graph_info = temp_graph_data_storage.get_graph_data_for_id(graph_uuid)
    except RuntimeError:
        return jsonify({"error": "Graph not found"}), 404

    G_gt: gt.Graph = graph_info["graph"]
    name: str = graph_info.get("name", f"graph_{graph_uuid}")
    layout_linearized = graph_info.get("layout", None)

    n = G_gt.num_vertices()

    positions: List[Tuple[float, float]] = []
    if layout_linearized is not None and len(layout_linearized) == 2 * n:
        for i in range(n):
            positions.append(
                (layout_linearized[2 * i], layout_linearized[2 * i + 1])
            )
    else:
        positions = [(0.0, 0.0) for _ in range(n)]

    all_vertex_properties = list(G_gt.vertex_properties.keys())

    vertices: List[Dict[str, Any]] = []
    for i, v in enumerate(G_gt.vertices()):
        entry: Dict[str, Any] = {
            "index": i,
            "N": [int(w) for w in G_gt.get_out_neighbors(v)],
            "pos": [positions[i][0], positions[i][1]],
        }

        for p in all_vertex_properties:
            val = G_gt.vertex_properties[p][v]
            if val == EMPTY_PROPERTY_FIELD:
                continue
            entry[p] = convert_to_json_parsable_representation(val)

        vertices.append(entry)

    export_payload: Dict[str, Any] = {
        "name": name,
        "num_of_vertices": int(n),
        "last_entry_update": datetime.utcnow().isoformat(),
        "vertices": vertices,
    }

    export_payload["point_size"] = graph_info.get("point_size", 1)
    export_payload["space_size"] = graph_info.get("space_size", 256)

    return jsonify(export_payload), 200


@app.route("/load_graph_from_json", methods=["POST"])
def load_graph_from_json():
    file = request.files.get("file")
    if file is None or file.filename == "":
        return jsonify({"error": "No file provided"}), 400

    try:
        graph_data = json.load(file)
    except Exception as e:
        return jsonify({"error": f"Failed to parse JSON: {e}"}), 400

    vertices = graph_data.get("vertices")
    num_vertices = graph_data.get("num_of_vertices")

    if not isinstance(vertices, list) or not isinstance(num_vertices, int):
        return jsonify({"error": "Invalid graph JSON: missing 'vertices' or 'num_of_vertices'"}), 400

    # we check if all vertices have "pos" field
    has_layout = all(
        isinstance(v.get("pos", None), (list, tuple)) and len(v["pos"]) == 2
        for v in vertices
    )

    # CASE 1: JSON HAS LAYOUT, we just build the graph from it
    if has_layout:
        built = _build_graph_from_graph_data(graph_data)
        return (
            jsonify(
                {
                    "graph_hash": None,
                    **built,
                }
            ),
            200,
        )

    # CASE 2: JSON HAS NO LAYOUT -> build the graph and compute layout
    G_gt = build_gt_graph_from_graph_dict(graph_data)

    canvas_positions = make_graph_structure(G_gt)
    linearized_canvas_positions, linearized_links = build_reponse_json_string_for_make_graph_structure_req(
        G_gt=G_gt, canvas_positions=canvas_positions
    )

    graph_uuid = temp_graph_data_storage.register_new_graph_data(
        {
            "name": graph_data.get("name", file.filename or "graph_from_file"),
            "graph": G_gt,
            "root_id": None,
            "godag": None,
            "layout": linearized_canvas_positions,
        }
    )

    config_keys = [
        key
        for key in graph_data.keys()
        if key
        not in ["name", "num_of_vertices", "last_entry_update", "vertices", "_id"]
    ]
    config = {key: graph_data[key] for key in config_keys}

    names = extract_vertex_names(G_gt)

    return (
        jsonify(
            {
                "graph_hash": None,
                "uuid": graph_uuid,
                "canvas_positions": linearized_canvas_positions,
                "links": linearized_links,
                "config": config,
                "names": names,
            }
        ),
        200,
    )


@app.route("/groups/<string:group_name>/graphs", methods=["POST"])
def list_graphs_for_group(group_name: str):
    """
    Body:
    {"password": "secret_pass"}

    Response 200:
    [
      { "id": "...", "name": "...", "num_of_vertices": 123, "last_entry_update": "..." },
      ...
    ]
    """
    data = request.get_json(force=True)
    password = data.get("password")

    if not password:
        return jsonify({"error": "Password is required"}), 400

    if not db_manager.verify_group_password(group_name, password):
        return jsonify({"error": "Invalid group or password"}), 403

    graphs = db_manager.list_graphs_for_group(group_name)
    return jsonify(graphs), 200


@app.route("/groups", methods=["GET"])
def list_groups():
    groups = db_manager.list_groups()
    return jsonify(groups), 200


@app.route("/update_graph_config/<string:graph_hash>", methods=["POST"])
def update_graph_config(graph_hash: str):
    logger.info(f"Received call on endpoint /update_graph_config/<graph_hash={graph_hash}>")

    try:
        data = request.get_json(force=True) or {}
    except Exception:
        return jsonify({"error": "Invalid JSON"}), 400

    allowed_fields = { # should be refactored
        "favorites",
        "comments",
        "favorite_add",
        "favorite_remove",
        "comment_add",
        "comment_remove",
        "vertices",
        "name",
    }

    new_vals = {k: v for k, v in data.items() if k in allowed_fields}

    if not new_vals:
        return jsonify({"error": "No allowed fields in payload"}), 400

    try:
        db_manager.update_existing_entry(graph_hash, new_vals)
    except Exception as e:
        logger.exception("Failed to update graph config")
        return jsonify({"error": str(e)}), 500

    return jsonify({"status": "ok"}), 200



if __name__ == "__main__":
    logger = logging.getLogger(__name__)
    temp_graph_data_storage = GraphDataStorage()
    db_manager = MongoDatabaseManager(MONGO_ACCESS_KEY, MONGO_DB_NAME)
    app.run(host=SERVICE_IP_ADDRESS, port=SERVICE_PORT)
