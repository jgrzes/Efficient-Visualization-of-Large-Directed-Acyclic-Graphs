import graph_tool as gt
from flask import Blueprint, jsonify
from graph_analysis import analyze_dag_basic, compute_hierarchy_levels
from routes.helpers import get_graph_storage, get_logger

analysis_bp = Blueprint("analysis", __name__)


@analysis_bp.route("/analyze_graph/<string:graph_uuid>", methods=["POST"])
def analyze_graph(graph_uuid: str):
    logger = get_logger()
    storage = get_graph_storage()

    logger.info(
        f"Received request on endpoint /analyze_graph/<graph_uuid={graph_uuid}>"
    )
    try:
        graph_data = storage.get_graph_data_for_id(graph_uuid)
        G_gt: gt.Graph = graph_data["graph"]
    except RuntimeError:
        return jsonify({"error": "Graph not found"}), 404

    hierarchy_levels = compute_hierarchy_levels(G_gt)
    basic = analyze_dag_basic(G_gt)

    logger.info(f"Successfully analyzed graph with uuid: {graph_uuid}")
    return jsonify({"basic": basic, "hierarchy_levels": hierarchy_levels}), 200
