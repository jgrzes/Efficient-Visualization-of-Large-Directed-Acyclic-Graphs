from abc import ABC, abstractmethod
from copy import copy
from typing import Callable, Dict, List, Optional, Set, Tuple

from .graph import Graph, Vertex

SIGNUM_EPS = 1e-6

PADDING = 6

W_1_X_INTERSPRING = 1
W_2_X_INTERSPRING = 1
W_1_Y_INTERSPRING = 1
W_2_Y_INTERSPRING = 1
W_3_Y_INTERSPRING = 1
W_4_Y_INTERSPRING = 1

ROOTS_INITIAL_POSITIONS_MAX_ITER = 20
MAX_REQ_MOVEMENT = 1e-1

W_1_X_ACS = 1
W_2_X_ACS = 1

L_INTERSPRING_TRANSFER = 0.8

BOX_WIDTH_COEFF = 3

ALPHA_P = 0.5
BETA_P = 1.5
S_COEFF = 1.15

VERTICE_WEIGHT = 1
ADD_CHILDREN_WEIGHT_COEFF = 0.2
G_ACC = 10
K_INIT_LAYOUT_COEFF = 2
PULL_UP_COEFF = 0.2
MARGIN_PADDING_COEFF = 0.05


class ArrayWithPersistentIterator:
    def __init__(self, array: List):
        self.array = array
        self.it = 0

    @property
    def current_element(self):
        if self.it >= len(self.array):
            return None
        return self.array[self.it]


class F(ABC):
    def __init__(self, v: Vertex):
        self.v = v

    @property
    def x_p(self) -> float:
        return self.v.position[0]

    @abstractmethod
    def __call__(self, x: float, k: int) -> float:
        ...


class Fp(F):
    def __init__(self, v: Vertex, alpha_p: float, beta_p: float, g_p: float):
        super().__init__(v)
        self.alpha_p = alpha_p
        self.beta_p = beta_p
        self.g_p = g_p

    # k remains unsed but we need it to keep the interface consistent
    def __call__(self, x: float, k: int) -> float:
        x_p = self.x_p
        g_p = self.g_p
        if x - (x_p + g_p) >= 0:
            return self.alpha_p * (x - x_p - g_p)
        elif x_p + g_p >= x >= x_p:
            return self.beta_p * (-x + x_p + g_p)
        else:
            return self(2 * x_p - x, k)


class Fcs(F):
    def __init__(self, v: Vertex, alpha_p: float):
        super().__init__(v)
        self.alpha_p = alpha_p

    def __call__(self, x: float, k: int) -> float:
        x_p = self.x_p
        if k != self.v.level:
            raise Exception(f"Invalid call for FCS, k == {self.v.level}")

        if x - x_p >= 0:
            return self.alpha_p * (x - x_p)
        else:
            return self(2 * x_p - x, k)


def build_F(G: Graph, v: int, k: int, s: float, alpha_p: float, beta_p: float) -> Fp:
    if G.V[v].level == k:
        return Fcs(v=G.V[v], alpha_p=alpha_p)

    N_v = G.N(v)
    children_deeper_than_k = 0
    for u in N_v:
        if G.V[u].level > k:
            children_deeper_than_k += 1

    return Fp(
        v=G.V[v], alpha_p=alpha_p, beta_p=beta_p, g_p=children_deeper_than_k * s * 0.5
    )


def find_minimum_for_F_collection(F_collection: List[F], k: int) -> float:
    points_to_check = (
        [f.x_p for f in F_collection]
        + [f.x_p + f.g_p for f in F_collection if (isinstance(f, Fp) and f.g_p > 0)]
        + [f.x_p - f.g_p for f in F_collection if (isinstance(f, Fp) and f.g_p > 0)]
    )
    points_to_check.sort()
    min_val = float("inf")
    x_argmin = None
    for point in points_to_check:
        val_for_point = 0
        for f in F_collection:
            val_for_point += f(point, k)

        if val_for_point < min_val:
            min_val = val_for_point
            x_argmin = point
    return x_argmin


def check_if_levels_and_L_sets_computed(G: Graph):
    for v in G.V:
        if not hasattr(v, "L_set_index"):
            v.L_set_index = float("-inf")
        if not v.level_computed:
            raise Exception(
                f"At least one vertice ({v.index}) has not been assigned level"
            )


def signum(x):
    if abs(x) < SIGNUM_EPS:
        return 0
    elif x > 0:
        return 1
    else:
        return -1


# calculates F interspring that affects u
def F_interspring(u: Vertex, v: Vertex) -> Tuple[float, float]:
    i = u.L_set_index
    j = v.L_set_index
    l_i = u.level
    l_j = v.level
    return (
        W_1_X_INTERSPRING * ((abs(i - j)) ** W_2_X_INTERSPRING) * signum(j - i),
        -(W_1_Y_INTERSPRING * (abs(i - j)) ** W_2_Y_INTERSPRING)
        * (W_3_Y_INTERSPRING * (abs(l_i - l_j) ** W_4_Y_INTERSPRING)),
    )


def find_cum_F_interspring(G: Graph, v: int) -> Tuple[float, float]:
    cum_F_interspring = (0, 0)
    colour_v = G.V[v].L_set_index
    for u in G.N(v):
        if G.V[u].L_set_index != colour_v:
            F_interspring_u = F_interspring(G.V[v], G.V[u])
            cum_F_interspring = (
                cum_F_interspring[0] + F_interspring_u[0],
                cum_F_interspring[1] + F_interspring_u[1],
            )

    for u in G.N(
        v
    ):  # employ checking if the vertice is not doubly calculated in graphs with some undirected edges
        if G.V[u].L_set_index != colour_v:
            F_interspring_u = F_interspring(G.V[v], G.V[u])
            cum_F_interspring = (
                cum_F_interspring[0] + F_interspring_u[0],
                cum_F_interspring[1] + F_interspring_u[1],
            )

    return cum_F_interspring


def find_max_colour_index(G: Graph) -> int:
    max_colour_index = -1
    for v in G.V:
        max_colour_index = max(max_colour_index, v.L_set_index)
    return max_colour_index


def produce_E_v_entry_for_subgraph(
    v: int, E_v: Set[int], deactivated_Vs_WPI: ArrayWithPersistentIterator
) -> Set[int]:
    if (
        deactivated_Vs_WPI.current_element is None
        or deactivated_Vs_WPI.current_element != v
    ):
        return copy(E_v)
    else:
        deactivated_Vs_WPI.it += 1
        return set()


def build_colour_subgraphs(G: Graph) -> List[Graph]:
    max_colour_index = find_max_colour_index(G)
    Gs_by_colour: List[Graph] = [None for _ in range(max_colour_index + 1)]
    for colour in range(0, max_colour_index + 1):
        deactivated_Vs_for_colour_list = [
            v.index
            for v in G.V
            if not hasattr(v, "L_set_index") or v.L_set_index != colour
        ]
        deactivated_Vs_for_colour_set = set(deactivated_Vs_for_colour_list)
        deactivated_Vs_WPI = ArrayWithPersistentIterator(
            array=deactivated_Vs_for_colour_list
        )
        Gs_by_colour[colour] = Graph(
            num_of_vertex=len(G.V),
            is_directed=G.is_directed,
            E=[
                produce_E_v_entry_for_subgraph(v, G.E_adj_list[v], deactivated_Vs_WPI)
                for v in range(0, len(G.V))
            ],
        )
        Gs_by_colour[colour].deactivated_V = deactivated_Vs_for_colour_set
        Gs_by_colour[colour].V = G.V
        Gs_by_colour[colour].find_roots()
    return Gs_by_colour


def get_roots_initial_x_positions(
    W: float, roots: List[int], F_interspring_collection: List[Tuple[float, float]]
) -> List[Tuple[int, float]]:
    if len(roots) == 1:
        return [(*roots, 0)]
    roots_sorted_by_interspring = sorted(
        [(r, F_interspring_collection[r][0]) for r in roots], key=lambda x: x[1]
    )

    step = W / (len(roots) + 1)
    for i in range(0, len(roots_sorted_by_interspring)):
        roots_sorted_by_interspring[i] = (
            roots_sorted_by_interspring[i][0],
            -0.5 * W + step * i,
        )

    return roots_sorted_by_interspring


def build_Vs_per_levels_collection(G: Graph) -> List[List[int]]:
    max_level = float("-inf")
    min_level = float("inf")
    for v in G.V:
        if v.index in G.deactivated_V:
            continue
        max_level = max(max_level, v.level)
        min_level = min(min_level, v.level)

    Vs_per_levels = [[] for _ in range(max_level + 1)]
    for v in G.V:
        if v.index in G.deactivated_V:
            continue
        Vs_per_levels[v.level - min_level].append(v.index)

    return Vs_per_levels


def build_F_interspring_collection(G: Graph, Vs_per_levels: List[List[int]]):
    F_interspring_collection = [(0, 0) for _ in range(len(G.V))]
    for v in range(len(F_interspring_collection)):
        F_interspring_collection[v] = find_cum_F_interspring(G, v)

    for k in range(len(Vs_per_levels) - 1, -1, -1):
        for v in Vs_per_levels[k]:
            for u in G.N_reversed(v):
                if G.V[u].L_set_index != G.V[v].L_set_index:
                    continue
                # the way F interspring should be pushed upwards is subject to change
                F_interspring_collection[u] = (
                    F_interspring_collection[u][0]
                    + L_INTERSPRING_TRANSFER * F_interspring_collection[v][0],
                    F_interspring_collection[u][1],
                )
    return F_interspring_collection


def move_from_left_to_right_and_create_gaps(
    V: List[Tuple[int, float]], W: float, eps: float
):
    n = len(V) - 1
    a, b = -W * 0.5, W * 0.5
    gamma: Optional[float] = None
    for i in range(n):
        (_, p_u), (_, p_v) = V[i], V[i + 1]
        eps_uv = p_v - p_u
        if gamma is None and eps_uv < eps:
            m_u = p_u - (a if i == 0 else (V[i - 1][1] + eps))
            m_v = -p_v + (b if i == n - 1 else (V[i + 2][1] - eps))
            m_u = max(m_u, 0)
            m_v = max(m_v, 0)
            p_u -= m_u
            p_v += m_v
            if (eps_uv := p_v - p_u) < eps:
                gamma = eps - eps_uv
        elif gamma is not None:
            if eps_uv >= eps + gamma:
                p_u += gamma
                gamma = None
                continue
            m_v = -p_v + (b if i == n - 1 else (V[i + 2][1] - eps))
            m_v = max(m_v, 0)
            p_v += m_v
            eps_uv = p_v - p_u
            delta = eps + gamma - eps_uv
            if delta <= 0:
                p_u += gamma
                gamma = None
            else:
                p_u += min(gamma, eps_uv)
                if eps_uv >= gamma:
                    gamma = 0
                else:
                    gamma -= eps_uv
                gamma += p_v - p_u
                if abs(gamma) < SIGNUM_EPS:
                    gamma = None
        V[i] = (V[i][0], p_u)
        V[i + 1] = (V[i + 1][0], p_v)


def move_from_right_to_left_and_create_gaps(
    V: List[Tuple[int, float]], W: float, eps: float
):
    n = len(V) - 1
    a, b = -W * 0.5, W * 0.5
    gamma = None
    for i in range(n - 1, -1, -1):
        (_, p_u), (_, p_v) = V[i], V[i + 1]
        eps_uv = p_v - p_u
        if gamma is None and eps_uv < eps:
            m_u = p_u - (a if i == 0 else (V[i - 1][1] + eps))
            m_v = -p_v + (b if i == n - 1 else (V[i + 2][1] - eps))
            m_u = max(m_u, 0)
            m_v = max(m_v, 0)
            p_u -= m_u
            p_v += m_v
            if (eps_uv := p_v - p_u) < eps:
                gamma = eps - eps_uv
        elif gamma is not None:
            if eps_uv >= eps + gamma:
                p_u += gamma
                gamma = None
                continue
            m_v = -p_v + (b if i == n - 1 else (V[i + 2][1] - eps))
            m_v = max(m_v, 0)
            p_v += m_v
            eps_uv = p_v - p_u
            delta = eps + gamma - eps_uv
            if delta <= 0:
                p_u += gamma
                gamma = None
            else:
                p_u += min(gamma, eps_uv)
                if eps_uv >= gamma:
                    gamma = 0
                else:
                    gamma -= eps_uv
                gamma += p_v - p_u
                if abs(gamma) < SIGNUM_EPS:
                    gamma = None
        V[i] = (V[i][0], p_u)
        V[i + 1] = (V[i + 1][0], p_v)


# eps - min. required gap
# the function assumes that V_positions is already sorted at the time of passing
def create_gaps_between_vertices_in_layout(
    V: List[Tuple[int, float]], W: float, eps: float
):
    move_from_left_to_right_and_create_gaps(V, W, eps)
    move_from_right_to_left_and_create_gaps(V, W, eps)
    n = len(V) - 1
    left_border, right_border = -W / 2, W / 2
    for i in range(n):
        if abs(V[i + 1][1] - V[i][1]) < eps:
            print(V, left_border, right_border, eps)
            print("Something went wrong when trying to space the vertices")
            break


def build_F_collection_v(
    G: Graph, v: int, V_k_already_drawn: Set[int], w: float
) -> List[F]:
    c = G.V[v].L_set_index
    k_v = G.V[v].level
    F_collection_v = [
        build_F(G, u, k_v, w * S_COEFF, ALPHA_P, BETA_P)
        for u in G.N_reversed(v)
        if G.V[u].L_set_index == c
    ]
    for u in G.N(v):
        for w in G.N_reversed(u):
            if w == v or G.V[w].L_set_index != c:
                continue
            elif G.V[w].level < k_v or (G.V[w].level == k_v and w in V_k_already_drawn):
                F_collection_v.append(build_F(G, w, k_v, w * S_COEFF, ALPHA_P, BETA_P))
    return F_collection_v


def find_initial_layout_for_subgraph(
    G: Graph,
    W: float,
    F_interspring_collection: List[Tuple[float, float]],
    Vs_per_levels: List[List[int]],
):
    for v in G.V:
        v.position = (None, None)
    roots = G.roots
    roots_x_positions = get_roots_initial_x_positions(
        W, Vs_per_levels[0], F_interspring_collection
    )
    for root, pos_x_root in roots_x_positions:
        G.V[root].position = (pos_x_root, 0)

    predicted_y_coords = [0 for _ in range(len(Vs_per_levels))]
    predicted_y_coords[0] = 0
    for k in range(1, len(Vs_per_levels)):
        predicted_y_coords[k] = (
            predicted_y_coords[k - 1]
            + (G_ACC * (VERTICE_WEIGHT + ADD_CHILDREN_WEIGHT_COEFF))
            / K_INIT_LAYOUT_COEFF
        )

    for k in range(1, len(Vs_per_levels)):
        V_k = Vs_per_levels[k]
        V_k.sort(
            key=lambda x, G_=G, c_=G.V[roots[0]].L_set_index: -len(
                [u for u in G_.N_reversed(x) if G_.V[u].L_set_index == c_]
            )
        )
        V_k_already_drawn: Set[int] = set()
        for v in V_k:
            k_v = G.V[v].level
            F_collection_v = build_F_collection_v(
                G, v, V_k_already_drawn, W / (len(V_k) * S_COEFF)
            )
            if len(F_collection_v) != 0:
                position_v_x = (
                    find_minimum_for_F_collection(F_collection_v, k_v)
                    + F_interspring_collection[v][0]
                )
                position_v_x = max(-W * 0.5, position_v_x)
                position_v_x = min(W * 0.5, position_v_x)
            else:
                position_v_x = (W * (0.5 - MARGIN_PADDING_COEFF)) * signum(
                    F_interspring_collection[v][0]
                )

            parents_v = [
                u for u in G.N_reversed(v) if G.V[u].L_set_index == G.V[v].L_set_index
            ]
            parent_y_coords = [G.V[p].position[1] for p in parents_v]
            lowest_parent_y = (
                max(parent_y_coords)
                if len(parent_y_coords) != 0
                else predicted_y_coords[k - 1]
            )
            d = 1 + PULL_UP_COEFF * max((len(parents_v) - 1), 0)
            weight_v = VERTICE_WEIGHT + ADD_CHILDREN_WEIGHT_COEFF * len(
                [u for u in G.N(v) if G.V[v].L_set_index == G.V[u].L_set_index]
            )
            G.V[v].position = (
                position_v_x,
                lowest_parent_y + (weight_v * G_ACC) / (K_INIT_LAYOUT_COEFF * d),
            )
            V_k_already_drawn.add(v)

        if len(V_k) != 1:
            V_k_positions_x = [(v, G.V[v].position[0]) for v in V_k]
            V_k_positions_x.sort(key=lambda x: x[1])
            eps_k = (0.5 * W) / (len(V_k) - 1)  # to tune
            create_gaps_between_vertices_in_layout(V_k_positions_x, W, eps_k)
            for v, v_pos_x in V_k_positions_x:
                G.V[v].position = (v_pos_x, G.V[v].position[1])


def find_layout_for_subgraph(
    G: Graph,
    c: int,
    W: float,
    F_interspring_collection: List[Tuple[float, float]],
    Vs_per_levels: List[List[int]],
) -> List[Tuple[int, Tuple[float, float]]]:
    find_initial_layout_for_subgraph(G, W, F_interspring_collection, Vs_per_levels)
    # apply force directed algorithm
    P: List[Tuple[int, Tuple[float, float]]] = []
    for v in G.V:
        if v.L_set_index == c:
            P.append((v.index, v.position))
    return P


def remove_element_in_unorganized_array(arr: List, index: int):
    arr[index], arr[-1] = arr[-1], arr[index]
    arr.pop()


# destroys eroding_Vs_per_levels_in_the_process
def extract_Vs_per_levels_for_subgraph(
    G: Graph, colour: int, eroding_global_Vs_per_levels: List[List[int]]
) -> List[List[int]]:
    Vs_per_levels = [[] for _ in eroding_global_Vs_per_levels]
    for k in range(len(Vs_per_levels)):
        n_k = len(eroding_global_Vs_per_levels[k])
        i = 0
        while i < n_k:
            v_k = eroding_global_Vs_per_levels[k][i]
            if G.V[v_k].L_set_index == colour:
                Vs_per_levels[k].append(v_k)
                remove_element_in_unorganized_array(
                    eroding_global_Vs_per_levels[k], index=i
                )
                n_k -= 1
            else:
                i += 1

    start_level = 0
    for i in range(len(Vs_per_levels)):
        start_level = i
        if len(Vs_per_levels[i]) > 0:
            break

    end_level = -1
    for i in range(len(Vs_per_levels) - 1, -1, -1):
        end_level = i
        if len(Vs_per_levels[i]) > 0:
            break

    if start_level > end_level:
        return []
    return Vs_per_levels[start_level: end_level + 1]


def determine_box_width_for_subgraph(Vs_per_levels: List[List[int]]) -> float:
    W = BOX_WIDTH_COEFF * max([len(V_k) for V_k in Vs_per_levels])
    return W


class LayoutCreator:
    def __init__(
        self,
        padding: float = PADDING,
        box_width_coeff: float = BOX_WIDTH_COEFF,
        margin_padding_coeff: float = MARGIN_PADDING_COEFF,
        alpha_p: float = ALPHA_P,
        beta_p: float = BETA_P,
        s_coeff: float = S_COEFF,
        w1_x_interspring: float = W_1_X_INTERSPRING,
        w2_x_interspring: float = W_2_X_INTERSPRING,
        w1_y_interspring: float = W_1_Y_INTERSPRING,
        w2_y_interspring: float = W_2_Y_INTERSPRING,
        w3_y_interspring: float = W_3_Y_INTERSPRING,
        w4_y_interspring: float = W_4_Y_INTERSPRING,
        l_interspring_transfer: float = L_INTERSPRING_TRANSFER,
        vertice_weight: float = VERTICE_WEIGHT,
        add_children_weight_coeff: float = ADD_CHILDREN_WEIGHT_COEFF,
        g_acc: float = G_ACC,
        k_init_layout_coeff: float = K_INIT_LAYOUT_COEFF,
        pull_up_coeff: float = PULL_UP_COEFF,
        signum_eps: float = SIGNUM_EPS,
        w1_x_acs: float = W_1_X_ACS,
        w2_x_acs: float = W_2_X_ACS,
        roots_initial_positions_max_iter: int = ROOTS_INITIAL_POSITIONS_MAX_ITER,
        max_req_movement: float = MAX_REQ_MOVEMENT,
        y_distance_between_uncoloured_levels: float = 10,
        box_width_fn: Optional[Callable[[List[List[int]]], float]] = None,
    ):
        self.padding = padding
        self.box_width_coeff = box_width_coeff
        self.margin_padding_coeff = margin_padding_coeff
        self.alpha_p = alpha_p
        self.beta_p = beta_p
        self.s_coeff = s_coeff
        self.w1_x_interspring = w1_x_interspring
        self.w2_x_interspring = w2_x_interspring
        self.w1_y_interspring = w1_y_interspring
        self.w2_y_interspring = w2_y_interspring
        self.w3_y_interspring = w3_y_interspring
        self.w4_y_interspring = w4_y_interspring
        self.l_interspring_transfer = l_interspring_transfer
        self.vertice_weight = vertice_weight
        self.add_children_weight_coeff = add_children_weight_coeff
        self.g_acc = g_acc
        self.k_init_layout_coeff = k_init_layout_coeff
        self.pull_up_coeff = pull_up_coeff
        self.signum_eps = signum_eps
        self.w1_x_acs = w1_x_acs
        self.w2_x_acs = w2_x_acs
        self.roots_initial_positions_max_iter = roots_initial_positions_max_iter
        self.max_req_movement = max_req_movement
        self.y_distance_between_uncoloured_levels = y_distance_between_uncoloured_levels

        if box_width_fn is None:

            def _default_box_width(Vs_per_levels: List[List[int]]) -> float:
                return self.box_width_coeff * max(len(Vk) for Vk in Vs_per_levels)

            self.box_width_fn = _default_box_width
        else:
            self.box_width_fn = box_width_fn

        # for now globals, to avoid passing too many parameters around, but should be fixed later
        g = globals()
        g["PADDING"] = padding
        g["BOX_WIDTH_COEFF"] = box_width_coeff
        g["MARGIN_PADDING_COEFF"] = margin_padding_coeff
        g["ALPHA_P"] = alpha_p
        g["BETA_P"] = beta_p
        g["S_COEFF"] = s_coeff
        g["W_1_X_INTERSPRING"] = w1_x_interspring
        g["W_2_X_INTERSPRING"] = w2_x_interspring
        g["W_1_Y_INTERSPRING"] = w1_y_interspring
        g["W_2_Y_INTERSPRING"] = w2_y_interspring
        g["W_3_Y_INTERSPRING"] = w3_y_interspring
        g["W_4_Y_INTERSPRING"] = w4_y_interspring
        g["L_INTERSPRING_TRANSFER"] = l_interspring_transfer
        g["VERTICE_WEIGHT"] = vertice_weight
        g["ADD_CHILDREN_WEIGHT_COEFF"] = add_children_weight_coeff
        g["G_ACC"] = g_acc
        g["K_INIT_LAYOUT_COEFF"] = k_init_layout_coeff
        g["PULL_UP_COEFF"] = pull_up_coeff
        g["SIGNUM_EPS"] = signum_eps
        g["W_1_X_ACS"] = w1_x_acs
        g["W_2_X_ACS"] = w2_x_acs
        g["ROOTS_INITIAL_POSITIONS_MAX_ITER"] = roots_initial_positions_max_iter
        g["MAX_REQ_MOVEMENT"] = max_req_movement

    def create(self, G: Graph) -> List[Tuple[float, float]]:
        check_if_levels_and_L_sets_computed(G)
        global_Vs_per_levels = build_Vs_per_levels_collection(G)
        F_interspring_collection = build_F_interspring_collection(
            G, global_Vs_per_levels
        )
        Gs_by_colour = build_colour_subgraphs(G)

        eroding_global_Vs_per_levels = copy(global_Vs_per_levels)
        P: List[Optional[Tuple[float, float]]] = [None for _ in range(len(G.V))]
        offset = 0.0

        for c in range(len(Gs_by_colour)):
            G_c = Gs_by_colour[c]
            Vs_per_levels_for_G_c = extract_Vs_per_levels_for_subgraph(
                G, c, eroding_global_Vs_per_levels
            )
            if len(Vs_per_levels_for_G_c) == 0:
                continue

            W_c = self.box_width_fn(Vs_per_levels_for_G_c)

            G_c_positions = find_layout_for_subgraph(
                G_c, c, W_c, F_interspring_collection, Vs_per_levels_for_G_c
            )
            for v, (vx, vy) in G_c_positions:
                if P[v] is not None:
                    print("Double calculated v!")
                P[v] = (vx + offset, vy)

            offset += W_c + self.padding

        for v in range(len(G.V)):
            if P[v] is not None:
                G.V[v].position = P[v]
            else:
                G.V[v].position = (None, None)

        max_level = max(getattr(v, "level", 0) for v in G.V)
        vertices_per_level: List[List[int]] = [[] for _ in range(max_level + 1)]
        for vert in G.V:
            vertices_per_level[vert.level].append(vert.index)

        missing_levels = [
            k
            for k in range(len(vertices_per_level))
            if any(G.V[v].position[0] is None for v in vertices_per_level[k])
        ]

        if missing_levels:
            kl = max(missing_levels)

            xs_done = [pos[0] for pos in P if pos is not None]
            maxx = max(xs_done) if xs_done else 0.0

            max_missing_on_level = max(
                sum(1 for v in vertices_per_level[k] if G.V[v].position[0] is None)
                for k in missing_levels
            )
            W_uncol = self.box_width_coeff * max(1, max_missing_on_level)

            left_box_bound = maxx + self.padding
            right_box_bound = left_box_bound + W_uncol

            self.draw_uncoloured_part_of_graph(
                G,
                vertices_per_level=vertices_per_level,
                kl=kl,
                box_bounds=(left_box_bound, right_box_bound),
            )

            for v in range(len(G.V)):
                if P[v] is None and G.V[v].position[0] is not None:
                    P[v] = G.V[v].position

        return P

    def draw_uncoloured_part_of_graph(
        self,
        G,
        vertices_per_level: List[List[int]],
        kl: int,
        box_bounds: Tuple[float, float],
    ) -> None:
        """
        Draws uncoloured part of the graph in the specified box bounds, starting from level kl down to level 0.
        Takes:
            - G: Graph object
            - vertices_per_level: List of lists, where each sublist contains vertex indices at that level
            - kl: The highest level with uncoloured vertices to start drawing from
            - box_bounds: Tuple specifying the left and right bounds of the box (left_box_bound, right_box_bound)
        """
        left_box_bound, right_box_bound = box_bounds
        W = right_box_bound - left_box_bound
        h = self.y_distance_between_uncoloured_levels

        def _is_top_level_coloured(v_idx: int) -> bool:
            return getattr(G.V[v_idx], "L_set_index", -1) >= 0

        uncol_order_on_level: Dict[int, int] = {}

        Vkl = list(vertices_per_level[kl])
        nkl = len(Vkl)
        edges_to_colour_sum = [0 for _ in range(nkl)]
        edges_to_any_colour_cnt = [0 for _ in range(nkl)]

        for i, u_idx in enumerate(Vkl):  # for each uncoloured vertex on level kl
            for v_idx in G.N(u_idx):  # for each neighbour
                if _is_top_level_coloured(v_idx):
                    v_colour = getattr(G.V[v_idx], "L_set_index", -1)
                    edges_to_colour_sum[i] += v_colour
                    edges_to_any_colour_cnt[i] += 1

        # Create list E of tuples (vertex_index, average_colour_value)
        E: List[Tuple[int, float]] = []
        INF = float("inf")
        for i, u_idx in enumerate(Vkl):
            avg = (
                (edges_to_colour_sum[i] / edges_to_any_colour_cnt[i])
                if edges_to_any_colour_cnt[i]
                else INF
            )
            E.append((u_idx, float(avg)))
        E.sort(key=lambda p: p[1])

        s = (W / (nkl + 1)) if nkl > 0 else 0.0
        for i, (v_idx, _) in enumerate(E):
            uncol_order_on_level[v_idx] = i + 1
            xi = left_box_bound + i * s
            G.V[v_idx].position = (xi, -h)

        h += self.y_distance_between_uncoloured_levels

        # proceed to lower levels
        k = kl - 1
        while k >= 1:
            Vk = list(vertices_per_level[k])
            nk = len(Vk)
            edges_to_colour_sum = [0 for _ in range(nk)]
            edges_to_any_colour_cnt = [0 for _ in range(nk)]

            for i, u_idx in enumerate(Vk):
                for v_idx in G.N(u_idx):
                    if getattr(G.V[v_idx], "level", 10**9) <= kl:
                        uncol_rank = uncol_order_on_level.get(v_idx, 0)
                        edges_to_colour_sum[i] += uncol_rank
                        edges_to_any_colour_cnt[i] += 1

            E.clear()
            for i, u_idx in enumerate(Vk):
                avg = (
                    (edges_to_colour_sum[i] / edges_to_any_colour_cnt[i])
                    if edges_to_any_colour_cnt[i]
                    else INF
                )
                E.append((u_idx, float(avg)))
            E.sort(key=lambda p: p[1])

            s = (W / (nk + 1)) if nk > 0 else 0.0
            for i, (v_idx, _) in enumerate(E):
                uncol_order_on_level[v_idx] = i + 1
                xi = left_box_bound + i * s
                G.V[v_idx].position = (xi, -h)

            h += self.y_distance_between_uncoloured_levels
            k -= 1


# wrapper
def create_layout(G: Graph) -> List[Tuple[float, float]]:
    return LayoutCreator().create(G)
