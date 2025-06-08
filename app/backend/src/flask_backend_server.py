import random
from flask import Flask, request, jsonify
from flask_cors import CORS
import graph_tool as gt
from generate_graph_structure import make_graph_structure

PORT_NUMBER = 30_301
app = Flask(__name__)
CORS(app)

@app.route("/flask_make_graph_structure", methods=["POST"])
def flask_make_graph_structure():
    # print("A")
    print("Received request to make graph structure")
    # print("Request data:", request.text)
    file = request.files["file"]

    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    # content = file.read().decode("utf-8")
    # print("File content:", content)

    # nodes = parse_obo_file('app/backend/data/go-basic.obo')
    # print("Parsed nodes:", len(nodes))

    
    # data = request.get_json()
    # N = data.get("size", 0)
    # E = data.get("edges", [])
    # print("B")

    # G = gt.Graph() 
    # V = [G.add_vertex() for _ in range (0, N)]
    # print("C")

    # for u, v in E:
        # G.add_edge(V[u], V[v])
    # print("D")

    # canvas_positions = make_graph_structure(G)
    # print(canvas_positions)
    # return jsonify({"canvas_positions": canvas_positions})

    return jsonify({
            "canvas_positions": [random.random() for _ in range(200)],
            "links": [random.randint(0, 100) for _ in range(100)],
        })


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT_NUMBER)