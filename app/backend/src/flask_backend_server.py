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
    data = request.get_json()
    N = data.get("size", 0)
    E = data.get("edges", [])
    # print("B")

    G = gt.Graph() 
    V = [G.add_vertex() for _ in range (0, N)]
    # print("C")

    for u, v in E:
        G.add_edge(V[u], V[v])
    # print("D")

    canvas_positions = make_graph_structure(G)
    # print(canvas_positions)
    return jsonify({"canvas_positions": canvas_positions})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT_NUMBER)