from graph import Graph, Vertex
from typing import List, Tuple, Set, Optional
from copy import copy
from abc import ABC, abstractmethod


SIGNUM_EPS = 1e-6

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
G_ACC = 10
K_INIT_LAYOUT_COEFF = 2
PULL_UP_COEFF = 0.2


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
        if abs(x - (x_p + g_p)) >= SIGNUM_EPS:
            return self.alpha_p * (x - x_p - g_p)
        # elif x_p <= x <= x_p + g_p:
        elif abs(x - x_p) >= SIGNUM_EPS and abs(x_p + g_p - x) >= SIGNUM_EPS:
            return self.beta_p * (-x + x_p + g_p)
        else:
            return self(2*x_p - x)
        

class Fcs(F):
    def __init__(self, v: Vertex, alpha_p: float):
        super().__init__(v)
        self.alpha_p = alpha_p

    def __call__(self, x: float, k: int) -> float:
        x_p = self.x_p 
        if k != self.v.level:
            raise Exception(f"Invalid call for FCS, k == {self.v.level}")             
        
        if abs(x - x_p) >= SIGNUM_EPS:
            return self.alpha_p * (x - x_p)
        else:
            return self(2*x_p - x, k)


def build_F(
    G: Graph, v: int, k: int, s: float, 
    alpha_p: float, beta_p: float
) -> Fp:    
    if G.V[v].level == k:
        return Fcs(v=G.V[v], alpha_p=alpha_p)
    
    N_v = G.N(v)
    children_deeper_than_k = 0
    for u in N_v:
        if G.V[u].level > k:
            children_deeper_than_k += 1

    return Fp(
        v=G.V[v], 
        alpha_p=alpha_p, beta_p=beta_p,
        g_p=children_deeper_than_k*s*0.5
    )


def find_minimum_for_F_collection(F_collection: List[F], k: int) -> float:
    points_to_check = [
        f.x_p for f in F_collection
    ] + [
        f.x_p + f.g_p for f in F_collection if (isinstance(f, Fp) and f.g_p > 0)
    ] + [
        f.x_p - f.g_p for f in F_collection if (isinstance(f, Fp) and f.g_p > 0)
    ]
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

    return point            


def check_if_levels_and_L_sets_computed(G: Graph):
    for v in G.V:
        if not hasattr(v, "L_set_index"):
            raise Exception(
                f"At least one vertice ({v.index}) has not been assigned colour"
            )
        if not v.level_computed:
            raise Exception(
                f"At least one vertice ({v.index}) has not been assigned level"
            )


def signum(x):
    if abs(x) < SIGNUM_EPS:
        return 0
    elif x > 0: return 1
    else: return 0


# calculates F interspring that affects u
def F_interspring(u: Vertex, v: Vertex) -> Tuple[float, float]:
    i = u.L_set_index 
    j = v.L_set_index
    l_i = u.level 
    l_j = v.level 
    return (
        W_1_X_INTERSPRING * ((abs(i-j)) ** W_2_X_INTERSPRING) * signum(j - i), 
        - (W_1_Y_INTERSPRING * (abs(i-j)) ** W_2_Y_INTERSPRING) * (W_3_Y_INTERSPRING * (abs(l_i - l_j) ** W_4_Y_INTERSPRING))
    )


def find_cum_F_interspring(G: Graph, v: int) -> Tuple[float, float]:
    cum_F_interspring = (0, 0)
    colour_v = G.V[v].L_set_index
    for u in G.N(v):
        if G.V[u].L_set_index != colour_v:
            F_interspring_u = F_interspring(G.V[v], G.V[u])
            cum_F_interspring = (
                cum_F_interspring[0] + F_interspring_u[0], 
                cum_F_interspring[1] + F_interspring_u[1]
            )

    for u in G.N(v): # employ checking if the vertice is not doubly calculated in graphs with some undirected edges
        if G.V[u].L_set_index != colour_v:
            F_interspring_u = F_interspring(G.V[v], G.V[u])
            cum_F_interspring = (
                cum_F_interspring[0] + F_interspring_u[0], 
                cum_F_interspring[1] + F_interspring_u[1]
            )        

    return cum_F_interspring        


def find_max_colour_index(G: Graph) -> int:
    max_colour_index = -1
    for v in G.V:
        max_colour_index = max(max_colour_index, v.L_set_index)

    return max_colour_index


def produce_E_v_entry_for_subgraph(
    v: int,
    E_v: Set[int], 
    deactivated_Vs_WPI: ArrayWithPersistentIterator
) -> Set[int]:
    if deactivated_Vs_WPI.current_element is None or deactivated_Vs_WPI.current_element != v:
        return set()
    else:
        deactivated_Vs_WPI.it += 1
        return copy(E_v)


def build_colour_subgraphs(G: Graph) -> List[Graph]:
    max_colour_index = find_max_colour_index(G)
    Gs_by_colour: List[Graph] = [None for _ in range (max_colour_index+1)]
    for colour in range (0, max_colour_index+1): 
        deactivated_Vs_for_colour_list = [
            v.index for v in G.V if v.L_set_index != colour
        ]
        deactivated_Vs_for_colour_set = set(deactivated_Vs_for_colour_list)
        deactivated_Vs_WPI = ArrayWithPersistentIterator(
            array=deactivated_Vs_for_colour_list
        )
        Gs_by_colour[colour] = Graph(
            num_of_vertex=len(G.V), 
            is_directed=G.is_directed, 
            E=[
                produce_E_v_entry_for_subgraph(
                    v, G.E_adj_list[v], deactivated_Vs_WPI
                ) for v in range (0, len(G.V))
            ]
        )
        Gs_by_colour[colour].deactivated_V = deactivated_Vs_for_colour_set
        Gs_by_colour[colour].V = G.V
        Gs_by_colour[colour].find_roots()

    return Gs_by_colour


def get_roots_initial_x_positions(
    W: float, roots: List[int], 
    F_interspring_collection: List[Tuple[float, float]]
) -> List[Tuple[int, float]]:
    roots_sorted_by_interspring = sorted([
        (r, F_interspring_collection[r][0]) for r in roots
    ], lambda x: x[1])

    step = (len(roots) + 1) / W
    for i in range (0, len(roots_sorted_by_interspring)):
        roots_sorted_by_interspring[1] = - 0.5*W + step*i

    return roots_sorted_by_interspring


def build_Vs_per_levels_collection(G: Graph) -> List[List[int]]:
    max_level = float("-inf")
    min_level = float("inf")
    for v in G.V:
        if v.index in G.deactivated_V:
            continue 
        max_level = max(max_level, v.level)
        min_level = min(min_level, v.level)

    Vs_per_levels = [[] for _ in range (max_level+1)]
    for v in G.V:
        if v.index in G.deactivated_V:
            continue 
        Vs_per_levels[v.level-min_level].append(v.index)

    return Vs_per_levels


def build_F_interspring_collection(G: Graph, Vs_per_levels: List[List[int]]):
    F_interspring_collection = [(0, 0) for _ in range (len(G.V))]
    for v in range (len(F_interspring_collection)):
        F_interspring_collection[v] = find_cum_F_interspring(G, v)

    for k in range (len(Vs_per_levels)-1, -1, -1):
        for v in Vs_per_levels[k]:
            for u in G.N_reversed(v):
                if G.V[u].L_set_index != G.V[v].L_set_index:
                    continue 
                # the way F interspring should be pushed upwards is subject to change
                F_interspring_collection[u][0] += L_INTERSPRING_TRANSFER * F_interspring_collection[v][0] 

    return F_interspring_collection


def find_initial_layout_for_subgraph(
    G: Graph, W: float, 
    F_interspring_collection: List[Tuple[float, float]], 
    Vs_per_levels: List[List[int]]
):
    for v in G.V:
        setattr(v, "position", (None, None))
    # transfer_interspring_forces_upwards(G)
    roots = G.roots 
    if not (sorted(Vs_per_levels[0]) == sorted(roots)):
        raise Exception("Something went wrong when passing args to layout drawing function")

    roots_x_positions = get_roots_initial_x_positions(
        W, roots, F_interspring_collection
    )

    for root, pos_x_root in roots_x_positions:
        G.V[root].position = (pos_x_root, 0)

    for k in range (1, len(Vs_per_levels)):
        V_k = Vs_per_levels[k]
        for v in V_k:
            k_v = G.V[v].level
            F_collection_v = [
                build_F(G, u, k_v, W / (len(V_k)*S_COEFF) ,ALPHA_P, BETA_P)
                for u in G.N_reversed(v) if G.V[u].L_set_index == G.V[v].L_set_index
            ]
            position_v_x = find_minimum_for_F_collection(F_collection_v, k_v) + F_interspring_collection[v]
            position_v_x = max(-W*0.5, position_v_x)
            position_v_x = min(W*0.5, position_v_x)
            
            parents_v = [u for u in G.N_reversed(v) if G.V[u].L_set_index == G.V[v].L_set_index]
            lowest_parent_y = min([G.V[p].position[1] for p in parents_v])
            d = 1 + PULL_UP_COEFF(len(parents_v)-1)
            G[v].position = (
                position_v_x, 
                lowest_parent_y + (VERTICE_WEIGHT * G_ACC) / (K_INIT_LAYOUT_COEFF * d)
            )


    



def find_layout_for_subgraph(
    G: Graph, W: float, 
    F_interspring_collection: List[Tuple[float, float]], 
    Vs_per_levels: List[List[int]]
) -> List[Tuple[int, Tuple[float, float]]]:
    find_initial_layout_for_subgraph(
        G, W, F_interspring_collection, Vs_per_levels
    )


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
            v_k = eroding_global_Vs_per_levels[i]
            if G.V[v_k].L_set_index == colour:
                Vs_per_levels[k].append(v_k)
                remove_element_in_unorganized_array(
                    eroding_global_Vs_per_levels, index=i
                )
                n_k -= 1
            i += 1

    start_level = 0
    for i in range(len(Vs_per_levels)):
        start_level = i 
        if len(Vs_per_levels[i]) > 0:
            break 

    end_level= -1
    for i in range(len(Vs_per_levels), -1, -1):
        end_level = i 
        if len(Vs_per_levels[i]) > 0:
            break

    if start_level > end_level:
        return []
    return Vs_per_levels[start_level:end_level+1]            


def determine_box_width_for_subgraph(Vs_per_levels: List[List[int]]) -> float:
    return BOX_WIDTH_COEFF * max([len(V_k) for V_k in Vs_per_levels])


def create_layout(G: Graph) -> List[Tuple[float, float]]:
    check_if_levels_and_L_sets_computed(G)
    global_Vs_per_levels = build_Vs_per_levels_collection(G)
    F_interspring_collection = build_F_interspring_collection(G, global_Vs_per_levels)
    Gs_by_colour = build_colour_subgraphs(G)
    
    eroding_global_Vs_per_levels = copy(global_Vs_per_levels)
    for c in range(len(Gs_by_colour)):
        G_c = Gs_by_colour[c]
        Vs_per_levels_for_G_c = extract_Vs_per_levels_for_subgraph(
            G, c, eroding_global_Vs_per_levels
        )
        G_c_positions = find_layout_for_subgraph(
            G_c, 
            determine_box_width_for_subgraph(Vs_per_levels_for_G_c), 
            Vs_per_levels_for_G_c, 
            F_interspring_collection
        )