import json
from typing import Any, Dict, List, Optional

import graph_tool as gt
from flask import Blueprint, jsonify, redirect, request
from generate_graph_structure import make_graph_structure
from graph_utils import (
    build_gt_graph_from_graph_dict,
    convert_to_json_parsable_representation,
    load_graph_from_uploaded_file,
)
from layout_computation_backend_comms import (
    send_layout_computation_request_to_grpc_server,
)
from routes.helpers import (
    EMPTY_PROPERTY_FIELD,
    build_response_json_string_for_make_graph_structure_req,
    extract_vertex_names,
    get_db_manager,
    get_graph_storage,
    get_layout_service_config,
    get_logger,
)

graph_bp = Blueprint("graph", __name__)


@graph_bp.route("/session_keepalive", methods=["POST"])
def session_keepalive():
    logger = get_logger()
    storage = get_graph_storage()

    logger.debug(request)
    data = request.get_json() or {}
    timestamp = data.get("date", "")
    graph_uuid = data.get("uuid", "nothing")
    event_type = data.get("type", "nothing")
    if graph_uuid != "nothing":
        logger.info(f"Keepalive received for {graph_uuid}")
    storage.keepalive_message_queue.put((graph_uuid, timestamp, event_type))
    return jsonify({"status": "ok"}), 200


@graph_bp.route("/node/<string:graph_uuid>/<int:node_id>", methods=["GET"])
def get_node_information(graph_uuid: str, node_id: int):
    logger = get_logger()
    storage = get_graph_storage()

    logger.info(
        f"Received call on endpoint /node/<graph_uuid={graph_uuid}>/<node_id={node_id}>."
    )
    try:
        graph_info = storage.get_graph_data_for_id(graph_uuid)
    except RuntimeError as e:
        logger.error(f"Node data acquisition error: {e}")
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


@graph_bp.route("/node_index/<string:graph_uuid>/<string:node_name>", methods=["GET"])
def get_node_index(graph_uuid: str, node_name: str):
    """
    Returns the index of the node with the given name in the specified graph.
    """
    logger = get_logger()
    storage = get_graph_storage()

    logger.info(
        f"Received call on endpoint /node_index/<graph_uuid={graph_uuid}>/<node_name={node_name}>"
    )

    try:
        graph_info = storage.get_graph_data_for_id(graph_uuid)
    except RuntimeError as e:
        logger.error(f"Node data acquisition error: {e}")
        return jsonify({}), 404

    G_gt: gt.Graph = graph_info["graph"]
    name_prop = G_gt.vertex_properties.get("name")

    if name_prop is None:
        return jsonify({"error": "Graph has no 'name' vertex property"}), 400

    for v in G_gt.vertices():
        if str(name_prop[v]).lower() == node_name.lower():
            return jsonify({"index": int(v)}), 200

    return jsonify({}), 404


@graph_bp.route("/flask_make_graph_structure", methods=["POST"])
def flask_make_graph_structure():
    file = request.files.get("file")

    if file is None or file.filename == "":
        return jsonify({"error": "No file provided"}), 400

    layout_type = request.form.get("layout_type", "cpp")

    logger = get_logger()
    storage = get_graph_storage()
    layout_host, layout_port = get_layout_service_config()

    logger.info(
        "Received request on endpoint /flask_make_graph_structure for file "
        f"{file.filename} with layout_type={layout_type}"
    )

    root_id, godag = None, None
    G_gt: Optional[gt.Graph] = None
    graph_uuid: str = None

    try:
        G_gt, root_id, godag = load_graph_from_uploaded_file(file)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        logger.error(f"Error while loading graph: {e}")
        return jsonify({"error": "Failed to construct graph from file"}), 500

    logger.debug(
        f"Successfully extracted graph from {file.filename} and created a graph tool object based on it"
    )

    if G_gt is not None:
        if layout_type == "radial":
            canvas_positions = make_graph_structure(G_gt)
            logger.debug("Using radial layout computation")
        else:
            logger.debug("Using GRPC layout computation")
            try:
                canvas_positions = send_layout_computation_request_to_grpc_server(
                    G_gt, layout_host, layout_port, logger=logger
                )
            except Exception as e:
                logger.warning(
                    f"GRPC server failed to conclude layout computation: {e}"
                )
                canvas_positions = make_graph_structure(G_gt)

        space_size = 0
        ceoff_x_denominator = float("-inf")
        coeff_y_denominator = float("-inf")
        for x, y in canvas_positions:
            space_size = max(abs(x), abs(y))
            coeff_y_denominator = max(coeff_y_denominator, abs(y))
            ceoff_x_denominator = max(ceoff_x_denominator, abs(x))

        coeff_x = 8192 / ceoff_x_denominator if ceoff_x_denominator > 8192 else 1
        coeff_y = 8192 / coeff_y_denominator if coeff_y_denominator > 8192 else 1
        canvas_positions = [(x * coeff_x, y * coeff_y) for x, y in canvas_positions]

        (
            transformed_canvas_positions,
            links,
        ) = build_response_json_string_for_make_graph_structure_req(
            G_gt=G_gt, canvas_positions=canvas_positions
        )

        logger.debug(
            f"Computed layout for {file.filename}, waiting for graph uuid generation..."
        )

        graph_uuid = storage.register_new_graph_data(
            {
                "name": file.filename,
                "graph": G_gt,
                "root_id": root_id,
                "godag": godag,
                "layout": transformed_canvas_positions,
                "space_size": int(space_size * 1.2),
            }
        )

        names = extract_vertex_names(G_gt)

        return (
            jsonify(
                {
                    "uuid": graph_uuid,
                    "canvas_positions": transformed_canvas_positions,
                    "links": links,
                    "names": names,
                    "space_size": space_size,
                }
            ),
            200,
        )

    logger.error(f"Failed to create layout for graph stored in file {file.filename}")
    return jsonify({"error": "Failed to create graph layout"}), 500


@graph_bp.route("/save_graph/<string:graph_uuid>", methods=["POST"])
def save_graph_to_db(graph_uuid: str):
    logger = get_logger()
    storage = get_graph_storage()
    db_manager = get_db_manager()

    logger.info(f"Received call on endpoint /save_graph/<graph_uuid={graph_uuid}>")
    graph_data: Dict[str, Any] = None
    try:
        graph_data = storage.get_graph_data_for_id(graph_uuid)
    except RuntimeError:
        return jsonify({"error": "Graph not found"}), 404

    name = graph_data["name"]
    G_gt = graph_data["graph"]

    data = request.get_json(force=True)
    if not data or "canvas_positions" not in data or "links" not in data:
        return jsonify({"error": "Canvas positions and links are required"}), 400

    graph_hash = data.get("graph_hash", "")

    group_name = data.get("group_name", None)
    group_password = data.get("group_password", None)

    if group_name is not None and group_password is not None:
        group = db_manager.get_group(group_name)
        if group is None:
            db_manager.create_graph_group(group_name, group_password)
        else:
            if not db_manager.verify_group_password(group_name, group_password):
                return jsonify({"error": "Invalid group password"}), 403

    linearized_layout = data["canvas_positions"]

    layout = [None for _ in range(int(len(linearized_layout) // 2))]
    for i in range(int(len(linearized_layout) // 2)):
        layout[i] = (linearized_layout[2 * i], linearized_layout[2 * i + 1])

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
    additional_config = {
        key: data.get(key) for key in additional_config_keys if key in data
    }

    if not db_manager.check_if_contains_graph_with_hash(graph_hash):
        graph_hash = db_manager.push_new_entry(
            name=name,
            E_adj_list=[
                list(G_gt.get_out_neighbors(i)) for i in range(G_gt.num_vertices())
            ],
            layout=layout,
            vertices_metadata=vertices_metadata,
            additional_config=additional_config,
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
            additional_config=additional_config,
        )

    if group_name is not None:
        db_manager.add_graph_to_group(graph_hash, group_name)

    return jsonify({"hash": graph_hash}), 200


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

    storage = get_graph_storage()
    graph_uuid = storage.register_new_graph_data(payload)

    names = extract_vertex_names(G_gt)

    return {
        "uuid": graph_uuid,
        "canvas_positions": linearized_canvas_positions,
        "links": linearized_links,
        "config": config,
        "names": names,
    }


@graph_bp.route("/load_graph/<string:graph_hash>", methods=["GET"])
def load_graph_from_db(graph_hash: str):
    db_manager = get_db_manager()

    graph_data = db_manager.fetch_data(graph_hash)
    if graph_data is None:
        return jsonify({"error": "No graph with such hash kept in the database"}), 404

    built = _build_graph_from_graph_data(graph_data)

    return jsonify({"graph_hash": graph_hash, **built}), 200


@graph_bp.route("/g/<string:graph_hash>", methods=["GET"])
def redirect_to_front(graph_hash: str):
    frontend_url = request.host_url.rstrip("/")
    return redirect(f"{frontend_url}/?g={graph_hash}", code=302)


@graph_bp.route("/load_graph_from_json", methods=["POST"])
def load_graph_from_json():
    file = request.files.get("file")
    if file is None or file.filename == "":
        return jsonify({"error": "No file provided"}), 400

    layout_type = request.form.get("layout_type", "cpp")
    logger = get_logger()
    layout_host, layout_port = get_layout_service_config()

    try:
        graph_data = json.load(file)
    except Exception as e:
        return jsonify({"error": f"Failed to parse JSON: {e}"}), 400

    vertices = graph_data.get("vertices")
    num_vertices = graph_data.get("num_of_vertices")

    if not isinstance(vertices, list) or not isinstance(num_vertices, int):
        return (
            jsonify(
                {"error": "Invalid graph JSON: missing 'vertices' or 'num_of_vertices'"}
            ),
            400,
        )

    has_layout = all(
        isinstance(v.get("pos", None), (list, tuple)) and len(v["pos"]) == 2
        for v in vertices
    )

    if has_layout:
        built = _build_graph_from_graph_data(graph_data)
        return jsonify({"graph_hash": None, **built}), 200

    G_gt = build_gt_graph_from_graph_dict(graph_data)

    if layout_type == "radial":
        canvas_positions = make_graph_structure(G_gt)
    else:
        try:
            canvas_positions = send_layout_computation_request_to_grpc_server(
                G_gt, layout_host, layout_port, logger=logger
            )
        except Exception as e:
            logger.error(
                f"GRPC layout computation failed: {e}. Falling back to radial layout."
            )
            canvas_positions = make_graph_structure(G_gt)

    (
        linearized_canvas_positions,
        linearized_links,
    ) = build_response_json_string_for_make_graph_structure_req(
        G_gt=G_gt, canvas_positions=canvas_positions
    )

    storage = get_graph_storage()
    graph_uuid = storage.register_new_graph_data(
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


@graph_bp.route("/update_graph_config/<string:graph_hash>", methods=["POST"])
def update_graph_config(graph_hash: str):
    logger = get_logger()
    db_manager = get_db_manager()

    logger.info(
        f"Received call on endpoint /update_graph_config/<graph_hash={graph_hash}>"
    )

    try:
        data = request.get_json(force=True) or {}
    except Exception:
        return jsonify({"error": "Invalid JSON"}), 400

    allowed_fields = {
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
