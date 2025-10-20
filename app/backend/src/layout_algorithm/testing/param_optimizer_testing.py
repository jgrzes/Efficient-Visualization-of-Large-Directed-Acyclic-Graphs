import os
import sys
import matplotlib.pyplot as plt
from layout_algorithm.create_L_sets import LSetCreator
from layout_algorithm.create_layout import LayoutCreator
from layout_algorithm.graph import Graph
from layout_algorithm.param_optimizer import optimize_params, quality_score
from layout_algorithm.preprocess_graph import assign_levels

sys.path.append(os.path.dirname(os.path.dirname(__file__)))


COLORS = [
    "red",
    "orange",
    "green",
    "lime",
    "cyan",
    "blue",
    "purple",
    "goldenrod",
    "fuchsia",
]

G = Graph(
    num_of_vertex=171,
    E=[
        {1, 2, 3, 4},  # 0
        {11, 12, 14, 168},  # 1
        {166, 54, 82},  # 2
        {165, 166, 88},  # 3
        {5, 6, 9, 164},  # 4
        {8},  # 5
        {7, 161},  # 6
        {133, 139, 138},  # 7
        {89, 115, 128},  # 8
        {8, 10, 162, 163},  # 9
        {140, 141},  # 10
        {27},  # 11
        {13},  # 12
        {24},  # 13
        {15},  # 14
        {16, 21, 25},  # 15
        {21, 20, 17},  # 16
        {18},  # 17
        {},  # 18
        {},  # 19
        {19},  # 20
        {22},  # 21
        {35, 36},  # 22
        {48},  # 23
        {26, 27, 28, 30},  # 24
        {26, 27, 28, 30},  # 25
        {31, 32, 23},  # 26
        {31, 32, 23},  # 27
        {31, 32, 23},  # 28
        {30},  # 29
        {49, 50},  # 30
        {35, 34},  # 31
        {33, 47},  # 32
        {45, 46},  # 33
        {45, 170},  # 34
        {36},  # 35
        {37, 38, 170, 43},  # 36
        {39, 40},  # 37
        {39},  # 38
        {40, 41, 42},  # 39
        {},  # 40
        {},  # 41
        {},  # 42
        {66, 67, 68},  # 43
        {43, 64},  # 44
        {44},  # 45
        {63},  # 46
        {45, 46},  # 47
        {46, 62},  # 48
        {51},  # 49
        {51},  # 50
        {61, 60},  # 51
        {51, 60},  # 52
        {57, 58, 92},  # 53
        {55},  # 54
        {29, 53, 56},  # 55
        {57, 58},  # 56
        {52},  # 57
        {59, 92, 93},  # 58
        {94, 167},  # 59
        {72, 73, 74},  # 60
        {72, 73, 74, 76},  # 61
        {72, 73, 74, 76},  # 62
        {},  # 63
        {65},  # 64
        {},  # 65
        {},  # 66
        {},  # 67
        {},  # 68
        {},  # 69
        {65, 69},  # 70
        {},  # 71
        {64, 70, 71},  # 72
        {70, 71, 79},  # 73
        {70, 71, 79},  # 74
        {73, 74, 76},  # 75
        {77},  # 76
        {},  # 77
        {},  # 78
        {78, 80, 81},  # 79
        {},  # 80
        {},  # 81
        {85, 83, 86, 87},  # 82
        {84},  # 83
        {91},  # 84
        {84},  # 85
        {84},  # 86
        {89, 115, 128},  # 87
        {89, 115, 128},  # 88
        {90, 117},  # 89
        {94, 118},  # 90
        {92},  # 91
        {94, 95},  # 92
        {167, 94},  # 93
        {75},  # 94
        {96},  # 95
        {97, 98},  # 96
        {77},  # 97
        {77, 100},  # 98
        {},  # 99
        {99, 103, 104},  # 100
        {100},  # 101
        {},  # 102
        {},  # 103
        {},  # 104
        {},  # 105
        {105},  # 106
        {105},  # 107
        {106, 107, 110, 112},  # 108
        {},  # 109
        {111},  # 110
        {},  # 111
        {111, 113},  # 112
        {},  # 113
        {89, 115, 128},  # 114
        {116, 130},  # 115
        {119, 126},  # 116
        {119},  # 117
        {120, 121, 122},  # 118
        {122},  # 119
        {123, 125},  # 120
        {124, 125},  # 121
        {124},  # 122
        {101},  # 123
        {102},  # 124
        {108},  # 125
        {125, 108},  # 126
        {126},  # 127
        {129, 134},  # 128
        {131, 132, 133},  # 129
        {127},  # 130
        {126, 135},  # 131
        {108, 135},  # 132
        {135},  # 133
        {133},  # 134
        {136, 109, 108},  # 135
        {109},  # 136
        {112},  # 137
        {112, 137},  # 138
        {135, 138},  # 139
        {139, 142, 147},  # 140
        {142, 147, 148},  # 141
        {143},  # 142
        {144},  # 143
        {112, 150},  # 144
        {156, 157, 158},  # 145
        {144},  # 146
        {143, 146},  # 147
        {146, 149},  # 148
        {144, 145},  # 149
        {151, 153},  # 150
        {152, 154},  # 151
        {},  # 152
        {155},  # 153
        {},  # 154
        {},  # 155
        {159},  # 156
        {},  # 157
        {159},  # 158
        {160},  # 159
        {},  # 160
        {},  # 161
        {},  # 162
        {},  # 163
        {163},  # 164
        {},  # 165
        {86},  # 166
        {},  # 167
        {169},  # 168
        {},  # 169
        {43},  # 170
    ],
)

if __name__ == "__main__":
    assign_levels(G)
    L_sets = LSetCreator().create_initial_L_sets(G)
    for i in range(len(L_sets)):
        print(i, L_sets[i])
    for c in range(len(L_sets)):
        for u in L_sets[c]:
            G.V[u].L_set_index = c
    lc0 = LayoutCreator()
    P0 = lc0.create(G)
    baseline_score = quality_score(G, P0)
    print(f"[baseline] score = {baseline_score:.6f}")

    best_params, best_score = optimize_params(
        G,
        iters=60,
        hill_climb_steps=40,
        seed=123,
    )
    print("Best params:", best_params)
    print(f"Best score: {best_score:.6f}")

    lc = LayoutCreator(**best_params)
    P_G = lc.create(G)

    for i in range(len(P_G)):
        if P_G[i] is not None:
            x_u, y_u = P_G[i]
            P_G[i] = (x_u, -y_u)
    P_G_colors = [[] for _ in range(len(L_sets))]
    for u in range(len(P_G)):
        u_pos = P_G[u]
        c_u = getattr(G.V[u], "L_set_index", -1)
        if c_u is not None and c_u >= 0 and u_pos is not None:
            P_G_colors[c_u].append(u_pos)
    for c in range(len(P_G_colors)):
        x_coords = [pt[0] for pt in P_G_colors[c]]
        y_coords = [pt[1] for pt in P_G_colors[c]]
        plt.scatter(x_coords, y_coords, color=COLORS[c % len(COLORS)])
    for u in range(len(G.V)):
        if P_G[u] is None:
            continue
        x_u, y_u = P_G[u]
        c_u = getattr(G.V[u], "L_set_index", -1)
        for v in G.N(u):
            if P_G[v] is None:
                continue
            x_v, y_v = P_G[v]
            if getattr(G.V[v], "L_set_index", -1) == c_u:
                plt.plot(
                    [x_u, x_v],
                    [y_u, y_v],
                    color=COLORS[c_u % len(COLORS)],
                    linewidth=1.0,
                )
            else:
                plt.plot(
                    [x_u, x_v],
                    [y_u, y_v],
                    color="gray",
                    linewidth=0.5,
                    linestyle="dashed",
                )

    plt.show()
