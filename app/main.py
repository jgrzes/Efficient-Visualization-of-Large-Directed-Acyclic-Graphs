from app.load_ontology import load_go_graph
from app.analyze_graph import calculate_nodes_level

def main():
    obo_path = "data/go-basic.obo" # example file, should be passed as argument or sth
    g = load_go_graph(obo_path)
    calculate_nodes_level(g)

if __name__ == "__main__":
    main()