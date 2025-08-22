from create_L_sets import Graph, create_initial_L_sets
from preprocess_graph import preprocess_graph, assign_levels


G1 = Graph(
    num_of_vertex=31, 
    E = [
        {1, 12, 13, 17, 18, 20, 6}, 
        {2, 3, 11}, 
        {16, 8, 10}, 
        {8, 10, 4, 9},
        {6, 5}, 
        {}, 
        {}, 
        {}, 
        {7, 9}, 
        {}, 
        {9}, 
        {14, 16, 15}, 
        {3}, 
        {21}, 
        {15, 7}, 
        {}, 
        {15, 19}, 
        {22}, 
        {22, 23}, 
        {}, 
        {26}, 
        {4, 9, 24}, 
        {4}, 
        {24}, 
        {5, 25, 28, 30}, 
        {}, 
        {27}, 
        {28, 29, 30},
        {}, 
        {}, 
        {} 
    ], 
    is_directed=True
)


if __name__ == "__main__":
    assign_levels(G1) 
    print(create_initial_L_sets(G1))