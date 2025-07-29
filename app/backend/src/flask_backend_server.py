from flask import Flask, request, jsonify
from flask_cors import CORS
import graph_tool as gt
from graph_utils import build_gt_graph_from_obo, build_graph_from_txt
from generate_graph_structure import make_graph_structure
from graph_analysis import compute_hierarchy_levels
from graph_utils import filter_graph_by_root
from clustering.clustering import cluster_graph

PORT_NUMBER = 30_301
app = Flask(__name__)
CORS(app)

GRAPH_CACHE = {}

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
    ''' Returns information about a node in the graph. '''
    G_gt: gt.Graph = GRAPH_CACHE.get("G_GT", None)
    if G_gt is None or node_id >= G_gt.num_vertices():
        return jsonify({"error": "Node not found"}), 404

    v = G_gt.vertex(node_id)

    id_prop = G_gt.vertex_properties["id"]
    name_prop = G_gt.vertex_properties["name"]
    namespace_prop = G_gt.vertex_properties["namespace"]
    def_prop = G_gt.vertex_properties["def"]
    synonym_prop = G_gt.vertex_properties["synonym"]
    isa_prop = G_gt.vertex_properties["is_a"]

    return jsonify({
        "id": id_prop[v],
        "name": name_prop[v],
        "namespace": namespace_prop[v],
        "def": def_prop[v].replace('"', ""),
        "synonym": list(synonym_prop[v]) if synonym_prop[v] else [],
        "is_a": list(isa_prop[v]) if isa_prop[v] else [],
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
            G_gt, roots = build_gt_graph_from_obo(file.read().decode("utf-8"))
            print(f"Constructed graph from obo file")

            root_namespace = request.form.get("root", None)
            if root_namespace is not None:
                root_id, root_vertex = roots.get(root_namespace, None) # returns (id string:GO:XXXX, vertex gt.Vertex:vertex)
                print(f"Root vertex is {root_id}, index {root_vertex}")
                G_gt = filter_graph_by_root(G_gt, root_vertex)

        elif file.filename.split(".")[-1] == 'txt':
            G_gt = build_graph_from_txt(file.read().decode("utf-8"))
            print(f"Constructed graph from txt file")

        GRAPH_CACHE["G_GT"] = G_gt
        GRAPH_CACHE["ROOT"] = root_vertex
        print(f"Loaded graph, it has: {len(G_gt.get_vertices())} vertices and {len(G_gt.get_edges())} edges")
        
    except Exception as e:
        print("Something went wrong when trying to construct the graph: ", e) 

    if G_gt is not None:
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


@app.route("/analyze_graph", methods=["POST"])
def analyze_graph():
    G_gt = GRAPH_CACHE.get("G_GT", None)
    if not G_gt:
        return jsonify({"error": "Graph not found"}), 404
    
    hierarchy_levels = compute_hierarchy_levels(G_gt)
    return jsonify({
        "hierarchy_levels": hierarchy_levels
    })

@app.route("/cluster_graph", methods=["POST"])
def cluster_graph_endpoint():
    G_gt = GRAPH_CACHE.get("G_GT", None)
    if not G_gt:
        return jsonify({"error": "Graph not found"}), 404
    
    vertices = list(G_gt.vertices())
    n_clusters = request.json.get("n_clusters", 5)
    root_vertex = GRAPH_CACHE.get("ROOT")

    print(f'Root vertex is type {type(root_vertex)}')

    labels = cluster_graph(G_gt, vertices, root=root_vertex, n_clusters=n_clusters)
    return jsonify({
        "labels": labels,
        "clusters": GRAPH_CACHE.get("CLUSTERS", [])
    })
    

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT_NUMBER)