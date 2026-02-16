from datetime import datetime
from typing import Any, Dict, List, Tuple

import graph_tool as gt
from flask import Blueprint, jsonify

from graph_utils import convert_to_json_parsable_representation
from routes.helpers import EMPTY_PROPERTY_FIELD, get_graph_storage

export_bp = Blueprint("export", __name__)


@export_bp.route("/export_graph/<string:graph_uuid>", methods=["GET"])
def export_graph(graph_uuid: str):
    storage = get_graph_storage()

    try:
        graph_info = storage.get_graph_data_for_id(graph_uuid)
    except RuntimeError:
        return jsonify({"error": "Graph not found"}), 404

    G_gt: gt.Graph = graph_info["graph"]
    name: str = graph_info.get("name", f"graph_{graph_uuid}")
    layout_linearized = graph_info.get("layout", None)

    n = G_gt.num_vertices()

    positions: List[Tuple[float, float]] = []
    if layout_linearized is not None and len(layout_linearized) == 2 * n:
        for i in range(n):
            positions.append((layout_linearized[2 * i], layout_linearized[2 * i + 1]))
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
