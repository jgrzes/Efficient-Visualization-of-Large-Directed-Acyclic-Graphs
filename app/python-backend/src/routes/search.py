import json
from typing import Any

import graph_tool as gt
from flask import Blueprint, jsonify, request

from graph_utils import convert_to_json_parsable_representation
from routes.helpers import EMPTY_PROPERTY_FIELD, get_graph_storage, get_logger

search_bp = Blueprint("search", __name__)


@search_bp.route("/search_node/<string:graph_uuid>", methods=["POST"])
def search_node(graph_uuid: str):
    """
    Received from the frontend a JSON with the following structure:
    {
      "filters": [{ "field": "name" | "all" | "<vertex_prop>", "query": "<text>" }, ...],
      "matchCase": bool,
      "matchWords": bool
    }
    """
    logger = get_logger()
    storage = get_graph_storage()

    logger.info(f"Received call on endpoint /search_node/<graph_uuid={graph_uuid}>")

    try:
        graph_data = storage.get_graph_data_for_id(graph_uuid)
    except RuntimeError:
        return jsonify({"error": "Graph not found"}), 404

    G_gt: gt.Graph = graph_data["graph"]
    all_props = G_gt.vertex_properties

    data = request.get_json(force=True)
    filters = data.get("filters")
    match_case = bool(data.get("matchCase", False))
    match_words = bool(data.get("matchWords", False))

    cleaned_filters = []
    for f in filters:
        field = (f.get("field") or "").strip()
        query = (str(f.get("query") or "")).strip()
        if not query:
            return jsonify({"error": "Empty query in filters"}), 400
        cleaned_filters.append({"field": field, "query": query})

    def normalize(s: str) -> str:
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

            if field == "":
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
