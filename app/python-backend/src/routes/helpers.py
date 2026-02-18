from typing import List, Tuple

import graph_tool as gt
from flask import current_app

EMPTY_PROPERTY_FIELD = "$N/A$"


def get_graph_storage():
    return current_app.config["GRAPH_STORAGE"]


def get_db_manager():
    return current_app.config["DB_MANAGER"]


def get_logger():
    return current_app.config["LOGGER"]


def get_layout_service_config() -> Tuple[str, int]:
    return (
        current_app.config["LAYOUT_SERVICE_IP_ADDRESS"],
        current_app.config["LAYOUT_SERVICE_PORT"],
    )


def extract_vertex_names(G_gt: gt.Graph) -> list[str]:
    """
    Returns the list of vertex names from the graph G_gt. If the "name" property does not exist,
    returns the vertex indices as strings.
    """
    name_prop = G_gt.vertex_properties.get("name")
    if name_prop is None:
        return [str(int(v)) for v in G_gt.vertices()]
    return [str(name_prop[v]) for v in G_gt.vertices()]


def build_response_json_string_for_make_graph_structure_req(
    G_gt: gt.Graph, canvas_positions: list[tuple[float, float]]
) -> Tuple[List[float], List[int]]:
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
