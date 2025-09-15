from numbers import Number

import graph_tool as gt
import graph_tool.topology as gt_top
import numpy as np

MinDistsEntry = tuple[Number, gt.Vertex | None]

INFINITY = 2_147_483_647
PI = np.pi


RADIUS = 10


def find_roots(G: gt.Graph) -> list[gt.Vertex]:
    # print([v for v in G.vertices() if v.in_degree() == 0])
    return [v for v in G.vertices() if v.in_degree() == 0]


def update_min_dists(
    current: np.ndarray[MinDistsEntry], newly_found: np.ndarray[MinDistsEntry]
) -> np.ndarray[MinDistsEntry]:
    result_pattern = np.array(current)[:, 0] < np.array(newly_found)[:, 0]
    return np.where(result_pattern[:, np.newaxis], current, newly_found)


def build_newly_found(
    dist_map: gt.VertexPropertyMap, pred_map: gt.VertexPropertyMap
) -> np.ndarray[MinDistsEntry]:
    built = [None for _ in range(0, len(dist_map))]
    for i, (d, p) in enumerate(zip(dist_map, pred_map)):
        built[i] = (d, p)

    return np.array(built)


def compute_min_distances_after_finding_roots(
    G: gt.Graph, roots: list[gt.Vertex]
) -> list[MinDistsEntry]:
    min_dists: np.ndarray[MinDistsEntry] = np.array(
        [(INFINITY, None) for _ in range(0, len(G))]
    )
    pred_map = G.vertex_index.copy()

    print(
        f"Preparing to compute min distances starting in each root, number of roots = {len(roots)}"
    )
    for i in range(0, len(roots)):
        root = roots[i]
        # print(f"For root: {root}")
        min_dists_for_root, pred_map = gt_top.shortest_distance(
            G, source=root, directed=True, pred_map=pred_map
        )
        # print("Finding distances concluded")
        min_dists = update_min_dists(
            current=min_dists,
            newly_found=build_newly_found(min_dists_for_root, pred_map),
        )

    return min_dists


def compute_min_distances(G: gt.Graph) -> list[MinDistsEntry]:
    return compute_min_distances_after_finding_roots(G, find_roots(G))


def fix_for_vertices_with_inf_distance(
    G: gt.Graph, min_distances: list[tuple[int, int]]
) -> list[tuple[int, int]]:
    pred_map = G.vertex_index.copy()
    for i in range(0, len(min_distances)):
        if min_distances[i][0] == INFINITY:
            min_dists_for_root, pred_map = gt_top.shortest_distance(
                G, source=i, directed=True, pred_map=pred_map
            )
            min_distances = update_min_dists(
                current=min_distances,
                newly_found=build_newly_found(
                    dist_map=min_dists_for_root, pred_map=pred_map
                ),
            )

    return min_distances


def make_graph_structure(G: gt.Graph) -> list[tuple[Number, Number]]:
    min_distances = list(compute_min_distances_after_finding_roots(G, find_roots(G)))
    min_distances = list(fix_for_vertices_with_inf_distance(G, min_distances))
    print("Computed min distances")

    for i in range(0, len(min_distances)):
        dist, pred = min_distances[i]
        min_distances[i] = (dist, pred, i)
    print("Converted min distances to algorithm-friendly form")

    min_distances.sort(key=lambda x: x[0])
    i = 0
    r = RADIUS
    canvas_positions: list[tuple[Number, Number]] = [
        None for _ in range(0, len(min_distances))
    ]
    valid_degree_ranges: list[tuple[Number, Number]] = [
        None for _ in range(0, len(min_distances))
    ]
    number_of_children: list[int] = [0 for _ in range(0, len(min_distances))]

    # print(min_distances)

    aux_eroding_number_of_children: list[int] = [
        0 for _ in range(0, len(min_distances))
    ]
    print("Initialized algorithm arrays")

    while i < len(min_distances):
        print(f"So far processed {i} nodes")
        dist = min_distances[i][0]
        j = i
        if dist == 0:
            while j < len(min_distances) and min_distances[j][0] == 0:
                j += 1

            if j == 1:
                r = 0
                _, _, index = min_distances[i]
                valid_degree_ranges[index] = (0, 2 * PI)
                canvas_positions[index] = (0, 0)
            else:
                c = j
                s = (2 * PI) / c
                j = 0
                while j < c:
                    _, _, index = min_distances[j]
                    x, y = r * np.cos(j * s), r * np.sin(j * s)
                    canvas_positions[index] = (x, y)
                    valid_degree_ranges[index] = (j * s - s / 2, j * s + s / 2)
                    j += 1

            i = j
        else:
            while j < len(min_distances) and dist == min_distances[j][0]:
                _, pred, _ = min_distances[j]
                number_of_children[pred] += 1
                aux_eroding_number_of_children[pred] += 1
                j += 1

            c = j
            j = i
            while j < c:
                _, pred, index = min_distances[j]
                order, size = (
                    aux_eroding_number_of_children[pred],
                    number_of_children[pred],
                )
                # if valid_degree_ranges[pred] is None:
                #     print(pred, valid_degree_ranges[pred])
                low, high = valid_degree_ranges[pred]
                degree = low + order * (high - low) / (size + 1)
                x, y = r * np.cos(degree), r * np.sin(degree)
                canvas_positions[index] = x, y

                if order == size and order == 1:
                    valid_degree_ranges[index] = (low, high)
                elif order == size:
                    valid_degree_ranges[index] = (
                        low + (2 * order - 1) * (high - low) / (2 * (size + 1)),
                        high,
                    )
                elif order == 1:
                    valid_degree_ranges[index] = (
                        low,
                        low + (2 * order + 1) * (high - low) / (2 * (size + 1)),
                    )
                else:
                    phi = (high - low) / (2 * (size + 1))
                    valid_degree_ranges[index] = (
                        low + (2 * order - 1) * phi,
                        low + (2 * order + 1) * phi,
                    )

                aux_eroding_number_of_children[pred] -= 1
                j += 1

            i = j

        r += RADIUS

    # canvas_positions = np.array(canvas_positions).astype(np.float32)
    # print(canvas_positions)
    min_x = abs(min([x for (x, y) in canvas_positions]))
    min_y = abs(min([y for (x, y) in canvas_positions]))
    for i in range(0, len(canvas_positions)):
        x, y = canvas_positions[i]
        canvas_positions[i] = (x + min_x, y + min_y)
    # plt.scatter(x_pos, y_pos)
    # plt.show()
    # input()
    return canvas_positions
