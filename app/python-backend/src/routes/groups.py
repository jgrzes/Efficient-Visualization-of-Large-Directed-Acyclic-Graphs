from flask import Blueprint, jsonify, request
from routes.helpers import get_db_manager

groups_bp = Blueprint("groups", __name__)


@groups_bp.route("/groups/<string:group_name>/graphs", methods=["POST"])
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
    db_manager = get_db_manager()

    data = request.get_json(force=True)
    password = data.get("password")

    if not password:
        return jsonify({"error": "Password is required"}), 400

    if not db_manager.verify_group_password(group_name, password):
        return jsonify({"error": "Invalid group or password"}), 403

    graphs = db_manager.list_graphs_for_group(group_name)
    return jsonify(graphs), 200


@groups_bp.route("/groups", methods=["GET"])
def list_groups():
    db_manager = get_db_manager()
    groups = db_manager.list_groups()
    return jsonify(groups), 200
