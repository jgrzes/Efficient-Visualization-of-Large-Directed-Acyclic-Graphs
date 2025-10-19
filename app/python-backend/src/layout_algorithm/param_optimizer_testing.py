from assign_levels import Graph, assign_levels
from param_optimizer import optimize_params

G = Graph(
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
    assign_levels(G)
    best_params, best_score = optimize_params(G, iters=1, hill_climb_steps=60, seed=67)
    print("Best params:", best_params)
    print("Best score:", best_score)