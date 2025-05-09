import graph_tool as gt
from generate_graph_structure import compute_min_distances, make_graph_structure
import matplotlib.pyplot as plt


def main():
    G = gt.Graph(directed=True)
    V = [G.add_vertex() for _ in range (0, 15)]
    E = [
        (0, 4), (0, 14), (0, 9), (4, 14), 
        (3, 1), (3, 6), (3, 10), (10, 7), (1, 2), (1, 8),
        (7, 5), (5, 2), (5, 8), (5, 12), (5, 11), (12, 13), (12, 11)
    ]

    for u, v in E:
        G.add_edge(V[u], V[v])

    min_distances = compute_min_distances(G=G)
    print(min_distances)

    N = 45
    G = gt.Graph(directed=True)
    V = [G.add_vertex() for _ in range (0, N)]

    E: list[tuple[int, int]] = [
        (9, 27), (9, 28), (9, 31), (27, 10),
        (43, 1), (28, 42), (31, 32), (31, 33),
        (42, 0), (42, 11), (16, 37), (16, 23),
        (1, 2), (1, 12), (1, 13), (1, 14), (1, 34), (1, 35), (1, 25),
        (37, 15), (37, 4), (15, 3), (15, 26), (15, 36), (23, 20), (23, 17),
        (20, 18), (20, 19), (20, 21), (20, 22), (20, 24),
        (30, 40), (40, 5), (30, 38), (38, 8), (30, 39), (39, 29),
        (30, 41), (41, 44), (44, 6), (44, 7)
    ]

    for u, v in E:
        G.add_edge(V[u], V[v])

    canvas_positions = make_graph_structure(G)   
    # print(canvas_positions)  
    X, Y = list(zip(*canvas_positions))
    plt.scatter(X, Y)
    for u, v in E:
        plt.plot([canvas_positions[u][0], canvas_positions[v][0]], [canvas_positions[u][1], canvas_positions[v][1]])

    plt.show()
    input()


# def main():
#     import flask_backend_server


if __name__ == "__main__":
    main()