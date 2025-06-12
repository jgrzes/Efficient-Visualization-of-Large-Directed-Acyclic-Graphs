import random
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
import graph_tool as gt
from graph_utils import build_gt_graph_from_obo, build_graph_from_txt
from generate_graph_structure import make_graph_structure


PORT_NUMBER = 30_301
app = Flask(__name__)
app.config["NODE_DATA"] = {}
CORS(app)


def build_reponse_json_string_for_make_graph_structure_req(
    G_gt: gt.Graph, 
    canvas_positions: list[tuple[float, float]]
) -> str:
    transformed_canvas_positions = [0 for _ in range (0, 2*len(canvas_positions))]
    for i in range (0, len(canvas_positions)):
        x, y = canvas_positions[i]
        transformed_canvas_positions[2*i] = x
        transformed_canvas_positions[2*i+1] = y

    links = []
    for e in G_gt.edges():
        u, v = int(e.source()), int(e.target())
        links.append(u)
        links.append(v)

    return transformed_canvas_positions, links

@app.route("/node/<int:node_id>")
def get_node(node_id):
    data = app.config["NODE_DATA"].get(node_id, None)
    return jsonify({
        "id": data.get("id", ""),
        "name": data.get("name", ""),
        "namespace": data.get("namespace", ""),
        "def": data.get('def', '').replace('"', ""),
        "synonym": data.get("synonym", []),
        "is_a": data.get("is_a", []),
    })

@app.route("/flask_make_graph_structure", methods=["POST"])
def flask_make_graph_structure():
    file = request.files["file"]

    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    print(f"Received request to make graph structure for {file.filename}")
    G_gt: gt.Graph | None = None
    try:
        if file.filename.split(".")[-1] == "obo":
            G_gt, node_data = build_gt_graph_from_obo(file.read().decode("utf-8"))
            app.config["NODE_DATA"] = node_data
            print(f"Loaded graph, it has: {len(G_gt.get_vertices())} vertices and {len(G_gt.get_edges())} edges")
            print(f"Constructed graph from obo file")
        elif file.filename.split(".")[-1] == 'txt':
            G_gt = build_graph_from_txt(file.read().decode("utf-8"))
            print(f"Loaded graph, it has: {len(G_gt.get_vertices())} vertices and {len(G_gt.get_edges())} edges")
            print(f"Constructed graph from txt file")
    except Exception as e:
        print("Something went wrong when trying to construct the graph") 

    # try:
    #     contents = file.read().decode("utf-8")
    #     print(f"File contents: {contents}")
    # except Exception as e:
    #     print("Failed when decoding")

    if G_gt is not None:
        # print(len(G_gt.get_vertices()), len(G_gt.get_edges()))
        # return jsonify({
        #     "canvas_positions": [],
        #     "links": []
        # })

        for e in G_gt.edges():
            print(e.source(), e.target())

        canvas_positions = make_graph_structure(G_gt)
        print("Found canvas positions")
        transformed_canvas_positions, links = build_reponse_json_string_for_make_graph_structure_req(
            G_gt=G_gt, canvas_positions=canvas_positions
        )
        print("Built data to return to frontend")

        return jsonify({
            "canvas_positions": transformed_canvas_positions,
            "links": links
        })

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

    # return jsonify({
    #         "canvas_positions": [80 * random.random() for _ in range(200)],
    #         "links": [random.randint(0, 100) for _ in range(100)],
    #     })


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT_NUMBER)