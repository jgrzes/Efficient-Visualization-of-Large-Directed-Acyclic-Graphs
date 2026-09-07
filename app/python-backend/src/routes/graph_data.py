from typing import Any, Dict, List

import graph_tool as gt

from graph_utils import (
    build_gt_graph_from_graph_dict,
    convert_to_json_parsable_representation,
)
from routes.helpers import (
    EMPTY_PROPERTY_FIELD,
    extract_vertex_names,
    get_graph_storage,
)

GRAPH_CONFIG_EXCLUDE_KEYS = {
    "name",
    "num_of_vertices",
    "last_entry_update",
    "vertices",
    "_id",
}


def extract_graph_config(graph_data: Dict[str, Any]) -> Dict[str, Any]:
    return {
        key: value
        for key, value in graph_data.items()
        if key not in GRAPH_CONFIG_EXCLUDE_KEYS
    }


def normalize_canvas_positions(
    canvas_positions: List[tuple],
) -> tuple[List[tuple], float]:
    space_size = 0.0
    coeff_x_denominator = float("-inf")
    coeff_y_denominator = float("-inf")

    for x, y in canvas_positions:
        space_size = max(space_size, abs(x), abs(y))
        coeff_y_denominator = max(coeff_y_denominator, abs(y))
        coeff_x_denominator = max(coeff_x_denominator, abs(x))

    coeff_x = 8192 / coeff_x_denominator if coeff_x_denominator > 8192 else 1
    coeff_y = 8192 / coeff_y_denominator if coeff_y_denominator > 8192 else 1
    scaled_canvas_positions = [(x * coeff_x, y * coeff_y) for x, y in canvas_positions]

    return scaled_canvas_positions, space_size


def linearized_layout_to_pairs(linearized_layout: List[float]) -> List[tuple]:
    return [
        (linearized_layout[2 * i], linearized_layout[2 * i + 1])
        for i in range(len(linearized_layout) // 2)
    ]


def build_vertex_metadata_for_graph(G_gt: gt.Graph) -> List[Dict[str, Any]]:
    all_vertex_properties = list(G_gt.vertex_properties.keys())
    n = G_gt.num_vertices()
    vertices_metadata: List[Dict[str, Any]] = [None for _ in range(n)]

    for i, vertex in enumerate(G_gt.vertices()):
        vertices_metadata[i] = {}
        for property_name in all_vertex_properties:
            value = G_gt.vertex_properties[property_name][vertex]
            if value == EMPTY_PROPERTY_FIELD:
                continue
            vertices_metadata[i][property_name] = convert_to_json_parsable_representation(value)

    return vertices_metadata


def build_linearized_links_and_positions(
    graph_data: Dict[str, Any],
) -> tuple[List[int], List[float]]:
    n = graph_data["num_of_vertices"]
    vertices_data = graph_data["vertices"]

    linearized_links: List[int] = []
    for vertex_index in range(n):
        for neighbor in vertices_data[vertex_index]["N"]:
            linearized_links.extend((vertex_index, neighbor))

    linearized_canvas_positions: List[float] = [0.0 for _ in range(2 * n)]
    for vertex_index in range(n):
        x, y = vertices_data[vertex_index]["pos"]
        linearized_canvas_positions[2 * vertex_index] = x
        linearized_canvas_positions[2 * vertex_index + 1] = y

    return linearized_links, linearized_canvas_positions


def build_graph_from_graph_data(graph_data: Dict[str, Any]) -> Dict[str, Any]:
    G_gt = build_gt_graph_from_graph_dict(graph_data)
    linearized_links, linearized_canvas_positions = build_linearized_links_and_positions(
        graph_data
    )

    payload = {
        "name": graph_data["name"],
        "graph": G_gt,
        "root_id": None,
        "godag": None,
        "layout": linearized_canvas_positions,
        "point_size": graph_data.get("point_size", 1),
        "space_size": graph_data.get("space_size", 256),
    }

    graph_uuid = get_graph_storage().register_new_graph_data(payload)

    return {
        "uuid": graph_uuid,
        "canvas_positions": linearized_canvas_positions,
        "links": linearized_links,
        "config": extract_graph_config(graph_data),
        "names": extract_vertex_names(G_gt),
    }
