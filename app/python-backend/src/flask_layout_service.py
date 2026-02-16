import logging
import os

from dotenv import load_dotenv
from flask import Flask
from flask_cors import CORS

from database_manager import MongoDatabaseManager
from graph_data_storage import GraphDataStorage
from routes import analysis_bp, export_bp, graph_bp, groups_bp, search_bp

SERVICE_IP_ADDRESS = os.getenv("SERVICE_IP_ADDRESS", "0.0.0.0")
SERVICE_PORT = int(os.getenv("SERVICE_PORT", "30301"))
MONGODB_URI = os.getenv("MONGODB_URI", "")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "inz")
LAYOUT_SERVICE_IP_ADDRESS = os.getenv("LAYOUT_SERVICE_IP_ADDRESS", "cpp-backend")
LAYOUT_SERVICE_PORT = int(os.getenv("LAYOUT_SERVICE_PORT", "30311"))
load_dotenv()


def create_app() -> Flask:
    app = Flask(__name__)
    CORS(app)

    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)

    app.config["LOGGER"] = logger
    app.config["GRAPH_STORAGE"] = GraphDataStorage(logger=logger)
    app.config["DB_MANAGER"] = MongoDatabaseManager(MONGODB_URI, MONGO_DB_NAME)
    app.config["LAYOUT_SERVICE_IP_ADDRESS"] = LAYOUT_SERVICE_IP_ADDRESS
    app.config["LAYOUT_SERVICE_PORT"] = LAYOUT_SERVICE_PORT

    app.register_blueprint(graph_bp)
    app.register_blueprint(search_bp)
    app.register_blueprint(groups_bp)
    app.register_blueprint(analysis_bp)
    app.register_blueprint(export_bp)

    return app


app = create_app()


if __name__ == "__main__":
    app.run(host=SERVICE_IP_ADDRESS, port=SERVICE_PORT)
