from flask import Flask, jsonify, redirect, request
from flask_cors import CORS
from dotenv import load_dotenv
from typing import Optional, List, Tuple, Any
import os
import graph_tool as gt
import json
import logging
import matplotlib.pyplot as plt

from graph_data_storage import GraphDataStorage
from database_manager import MongoDatabaseManager
from graph_utils import *
from generate_graph_structure import make_graph_structure # To be removed
from graph_analysis import compute_hierarchy_levels # TODO: Make better graph analysis functionality
from layout_computation_backend_comms import send_layout_computation_request_to_grpc_server

load_dotenv()

SERVICE_IP_ADDRESS = os.getenv("SERVICE_IP_ADDRESS", "0.0.0.0")
SERVICE_PORT = int(os.getenv("SERVICE_PORT", "30301"))
MONGO_ACCESS_KEY = os.getenv("MONGO_ACCESS_KEY", "")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "inz")
LAYOUT_SERVICE_IP_ADDRESS = os.getenv("LAYOUT_SERVICE_IP_ADDRESS", "cpp-backend")
LAYOUT_SERVICE_PORT = int(os.getenv("LAYOUT_SERVICE_PORT", "30311"))
# FRONT_URL = os.getenv("FRONT_URL")

app = Flask(__name__)
CORS(app)

temp_graph_data_storage: GraphDataStorage = None
db_manager: MongoDatabaseManager = None 

EMPTY_PROPERTY_FIELD = "$N/A$"

logger: logging.Logger = None


def build_reponse_json_string_for_make_graph_structure_req(
    G_gt: gt.Graph, canvas_positions: list[tuple[float, float]]
) -> Tuple[List[int], List[int]]:
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


@app.route("/session_keepalive", methods=["POST"])
def session_keepalive():
    print(request)
    data = request.get_json()
    print(data)
    datetime = data.get("date", "")
    graph_uuid = data.get("uuid", "nothing")
    event_type = data.get("type", "nothing")
    if graph_uuid != "nothing":
        print(f"Keepalive received for {graph_uuid}")
    temp_graph_data_storage.keepalive_message_queue.put((graph_uuid, datetime, event_type))
    return jsonify({"status": "ok"}), 200


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

    m = {
        p: convert_to_json_parsable_representation(G_gt.vertex_properties[p][v])
        for p in all_vertex_properties if G_gt.vertex_properties[p][v] != EMPTY_PROPERTY_FIELD
    }
    logger.info(
        f"Data returned on endpoint call /node/<graph_uuid={graph_uuid}>/<node_id={node_id}>: "
        + str(m)
    )

    # for key, val in m.items():
    #     print(f"{key}: {val}, type={type(val)}")

    return jsonify(m), 200
    

@app.route("/node_index/<string:graph_uuid>/<int:node_id>", methods=["GET"])
def get_node_index(graph_uuid: str, node_id: str):
    logger.info(f"Received call on endpoint /node_index/<graph_uuid={graph_uuid}>/<node_id={node_id}>")
    try:
        graph_info = temp_graph_data_storage.get_graph_data_for_id(graph_uuid)
    except RuntimeError as e:
        print(f"Node data acquisition error: {e}")
        return jsonify({}), 404
    
    # TODO: Optimize
    G_gt = graph_info["graph"]
    for v in G_gt.vertices():
        if G_gt.vertex_properties["id"] == node_id:
            logger.info(
                f"Data returned on endpoint /node_index/<graph_uuid={graph_uuid}>/<node_id={node_id}>: index={int(v)}"
            )
            return jsonify({"index": int(v)}), 200


    return jsonify({}), 404    


# TODO: Hook up to cpp backend
@app.route("/flask_make_graph_structure", methods=["POST"])
def flask_make_graph_structure():
    file = request.files["file"]

    if file.filename == "":
        return jsonify({}), 400
    logger.info(
        f"Received request to construct layout for a graph, filename of graph source file is as follows: {file.filename}"
    )

    root_id, godag = None, None
    G_gt: Optional[gt.Graph] = None 
    graph_uuid: str = None
    try:
        ext = file.filename.split(".")[-1]
        if ext not in ALLOWED_FILE_FORMATS:
            logger.error(
                f"Received request for file named {file.filename}, unfortunately .{ext} is not a valid extension"
            )
            return jsonify({}), 400
        
        if ext == "obo":
            G_gt, roots, godag = build_gt_graph_from_obo(file.read().decode("utf-8"))
            root_namespace = request.form.get("root", None)
            if root_namespace is not None:
                root_id, root_vertex = roots.get(root_namespace, None)
                G_gt = filter_graph_by_root(G_gt, root_vertex)

        elif ext == "txt":
            G_gt = build_graph_from_txt(file.read().decode("utf-8"))   

    except Exception as e:    
        print(e)

    logger.debug(
        f"Successfully extracted graph from {file.filename} and created a graph tool object based on it"
    )    

    if G_gt is not None:
        # canvas_positions = make_graph_structure(G_gt)
        try:
            canvas_positions = send_layout_computation_request_to_grpc_server(
                G_gt, LAYOUT_SERVICE_IP_ADDRESS, LAYOUT_SERVICE_PORT, logger=logger
            )
        except Exception as e:
            logger.warning(f"GRPC server failed to conclude layout computation: {e}")
            canvas_positions = make_graph_structure(G_gt)

        space_size = 0 
        for x, y in canvas_positions:
            space_size = max(abs(x), abs(y))   

        print("Space size: ", space_size)     

        # for i in range(len(canvas_positions)):
            # print(f"{i}: {canvas_positions[i]}")
        x_positions = [p[0] for p in canvas_positions]
        y_positions = [p[1] for p in canvas_positions]
        plt.scatter(x_positions, y_positions)
        for u in range(G_gt.num_vertices()):
            Nu = G_gt.get_out_neighbors(u)
            for v in Nu:
                plt.plot(
                    [canvas_positions[u][0], canvas_positions[v][0]],
                    [canvas_positions[u][1], canvas_positions[v][1]]
                )

        plt.show()        

        transformed_canvas_positions, links = build_reponse_json_string_for_make_graph_structure_req(
            G_gt=G_gt, canvas_positions=canvas_positions
        )    

        logger.debug(
            f"Computed layout for {file.filename}, waiting for graph uuid generation..."
        )

        graph_uuid = temp_graph_data_storage.register_new_graph_data({
            "name": file.filename,
            "graph": G_gt, 
            "root_id": root_id, 
            "godag": godag, 
            "layout": transformed_canvas_positions, 
            "space_size": int(space_size * 1.2)
        })    

        logger.info(
            f"Computed layout for {file.filename}, as well as generated new uuid for it, which is as follows {graph_uuid}"
        )

        return jsonify(
            {"uuid": graph_uuid, "canvas_positions": transformed_canvas_positions, "links": links, "space_size": space_size}
        ), 200
    
    logger.error(
        f"Failed to create layout for graph strored in file {file.filename}"    
    ) 

    return jsonify({"error": "Failed to create layout"}), 500


# TODO: Weird endpoint name
@app.route("/analyze_graph/<string:graph_uuid>", methods=["POST"])
def analyze_graph(graph_uuid: str):
    logger.info(f"Received request on endpoint /analyze_graph/<graph_uuid={graph_uuid}>")
    G_gt: gt.Graph = None
    try:
        graph_data = temp_graph_data_storage.get_graph_data_for_id(graph_uuid)
        G_gt = graph_data["graph"]
    except RuntimeError as e:
        ...

    hierarchy_levels = compute_hierarchy_levels(G_gt)
    logger.info(f"Successfully analyzed graph with uuid as follows: {graph_uuid} (WTFM)")
    return jsonify({"hierarchy_levels": hierarchy_levels}), 200


# TODO: Merge with @tmsyda's solution and make it support any set of properties, not just this narrow set
@app.route("/search_node/<string:graph_uuid>", methods=["POST"])
def search_node(graph_uuid: str):
    logger.info(f"Received call on endpoint /search_node/<graph_uuid={graph_uuid}>")
    G_gt: gt.Graph = None 
    try:
        graph_data = temp_graph_data_storage.get_graph_data_for_id(graph_uuid)
        G_gt = graph_data["graph"]
    except RuntimeError as e:
        ... 

    data = request.get_json()
    field = data.get("field")
    query = data.get("query")
    if not field or not query:
        return jsonify({"error": "Missing field and/or missing query"}), 400
    
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

    logger.info(f"Successful node search for graph with uuid as follows: {graph_uuid}")
    return jsonify(results)


@app.route("/save_graph/<string:graph_uuid>", methods=["POST"])
def save_graph_to_db(graph_uuid: str):
    logger.info(f"Received call on endpoint /save_graph/<graph_uuid={graph_uuid}>")
    graph_data: Dict[str, Any] = None 
    try:
        graph_data = temp_graph_data_storage.get_graph_data_for_id(graph_uuid)
    except RuntimeError as e:
        ...

    name = graph_data["name"]
    G_gt = graph_data["graph"]
    # linearized_layout = graph_data["layout"]

    data = request.get_json(force=True)
    if not data or "canvas_positions" not in data or "links" not in data:
        return jsonify({
            "error": "Canvas positions and links are required"
        }), 400
    graph_hash = data.get("graph_hash", "")
    # if graph_hash is None:
    #     graph_hash = ""

    linearized_layout = data["canvas_positions"]
    # linearized_links = data["links"]
    # vertex_metadata = data.get("vertex_metadata", [])

    layout = [None for i in range(int(len(linearized_layout) // 2))]
    for i in range(int(len(linearized_layout) // 2)):
        layout[i] = (linearized_layout[2*i], linearized_layout[2*i+1])

    # TODO: Optimize
    all_vertex_properties = [key for key in G_gt.vertex_properties.keys()]

    n = G_gt.num_vertices()
    vertices_metadata = [None for _ in range(n)]
    i = 0
    for v in G_gt.vertices():
        # print(f"i = {i}")
        vertices_metadata[i] = {}
        for p in all_vertex_properties:
            # print(f"property = {p}")
            if G_gt.vertex_properties[p][v] == EMPTY_PROPERTY_FIELD: 
                continue
            vertices_metadata[i][p] = convert_to_json_parsable_representation(G_gt.vertex_properties[p][v])
        # print(f"All vertex properties after {i}: {all_vertex_properties}")    
        i += 1

    # print(vertices_metadata)

    point_size = data.get("point_size", None)
    space_size = data.get("space_size", None)
    additional_config = {}
    if point_size is not None: additional_config["point_size"] = point_size
    if space_size is not None: additional_config["space_size"] = space_size

    if not db_manager.check_if_contains_graph_with_hash(graph_hash):
        graph_hash = db_manager.push_new_entry(
            name=name, 
            E_adj_list=[list(G_gt.get_out_neighbors(i)) for i in range(G_gt.num_vertices())], 
            layout=layout, 
            vertices_metadata=vertices_metadata, 
            additional_config=additional_config # TODO: Should probably contain point sizes and space sizes
        )
    else:
        db_manager.override_existing_entry(
            graph_id=graph_hash, 
            name=name, 
            E_adj_list=[list(G_gt.get_out_neighbors(i)) for i in range(G_gt.num_vertices())], 
            layout=layout, 
            vertices_metadata=vertices_metadata, 
            additional_config=additional_config # TODO: Should probably contain point sizes and space sizes
        )

    # return graph_hash, 200
    return jsonify({
        "hash": graph_hash, 
    }), 200


@app.route("/load_graph/<string:graph_hash>", methods=["GET"])
def load_graph_form_db(graph_hash: str):
    graph_data = db_manager.fetch_data(graph_hash)
    if graph_data is None:
        return jsonify({"error": "No graph with such hash kept in the database"}), 404
    
    G_gt = gt.Graph(directed=True)
    # print(graph_data)
    n = graph_data["num_of_vertices"]
    vertices_data = graph_data["vertices"]
    V = [G_gt.add_vertex() for _ in range(n)]

    linearized_links = []
    for v in range(0, n):
        Nv = vertices_data[v]["N"]
        for w in Nv:
            G_gt.add_edge(V[v], V[w])
            linearized_links.append(v)
            linearized_links.append(w)

    vertex_metadata_keys = set()
    for i in range(len(vertices_data)):
        vertex_data_entry = vertices_data[i]
        for field in vertex_data_entry.keys():
            if field == "index" or field == "N" or field == "pos":
                continue 

            vertex_metadata_keys.add(field)        

    for p in vertex_metadata_keys:
        # print(p, type(p))
        G_gt.vertex_properties[p] = G_gt.new_vertex_property(read_type_in_gt_compatible_way(p))

    for i in range(len(vertices_data)):
        vertex_data_entry = vertices_data[i]
        for p in vertex_metadata_keys:
            if p not in vertex_data_entry:
                G_gt.vertex_properties[p][i] = EMPTY_PROPERTY_FIELD   
            else:
                G_gt.vertex_properties[p][i] = str(vertex_data_entry[p])    

    graph_uuid = temp_graph_data_storage.register_new_graph_data({
        "name": graph_data["name"], 
        "graph": G_gt, 
        "root_id": None, 
        "godag": None, 
        "layout": [tuple(vertices_data[i]["pos"]) for i in range(n)]
    })   

    config_keys = [
        key for key in graph_data.keys() 
        if key not in ["name", "num_of_vertices", "last_entry_update", "vertices", "_id"]
    ]

    config = {key: graph_data[key] for key in config_keys}
    print(config)

    linearized_canvas_positons = [None for _ in range(2*n)]
    for i in range(0, n):
        linearized_canvas_positons[2*i] = vertices_data[i]["pos"][0]
        linearized_canvas_positons[2*i+1] = vertices_data[i]["pos"][1]

    return jsonify({
        "graph_hash": graph_hash,
        "uuid": graph_uuid,
        "canvas_positions": linearized_canvas_positons, 
        "links": linearized_links, 
        "config": config, "doc": {} # What does this even mean in this context
    }), 200     


@app.route("/g/<string:graph_hash>", methods=["GET"])
def redirect_to_front(graph_hash: str):
    frontend_url = request.host_url.rstrip("/")
    return redirect(f"{frontend_url}/?g={graph_hash}", code=302)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)
    temp_graph_data_storage = GraphDataStorage(logger=logger)
    db_manager = MongoDatabaseManager(MONGO_ACCESS_KEY, MONGO_DB_NAME)
    app.run(host=SERVICE_IP_ADDRESS, port=SERVICE_PORT)




