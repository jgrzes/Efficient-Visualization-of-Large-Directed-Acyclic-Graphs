from graph import Graph, Vertex 
from typing import List, Union, Callable, Dict, Tuple
from preprocess_graph import build_cum_d_edges_per_level, find_d_edges_per_level
from enum import Enum
from copy import deepcopy
import numpy as np


class DynamicThreshold(Enum):
    DYNAMIC=1


def build_Vs_per_level_collection(G: Graph) -> List[List[int]]:
    max_level = -1
    for v in G.V:
        max_level = max(max_level, v.level+1)

    Vs_per_level = [[] for _ in range (len(G.V))]
    for v in G.V:
        Vs_per_level[v.level].append(v.index)

    return Vs_per_level        


def determine_the_starting_level(
    cum_d_edges_per_level: List[List[int]], 
    threshold: Union[int, DynamicThreshold], 
    dynamic_threshold_calculator: Union[None, Callable[[int], int]] = None
) -> int:
    for i in range (len(cum_d_edges_per_level)):
        cum_d_edges = cum_d_edges_per_level[i]
        if isinstance(threshold, int) and len(cum_d_edges) >= threshold:
            return i 
        elif isinstance(threshold, DynamicThreshold):
            calculated_threshold = dynamic_threshold_calculator(i)
            if len(cum_d_edges) >= calculated_threshold: 
                return i
        else:
            raise Exception("Invalid type passed as threshold argument")

    return len(cum_d_edges_per_level)            


def extract_subgraph_cut_off_at_level(G: Graph, Vs_per_level: List[List[int]], level: int) -> Graph:
    extracted_G = deepcopy(G)
    for i in range (0, min(len(Vs_per_level), level)):
        Vs_at_i = Vs_per_level[i]
        for u in Vs_at_i:
            # print(u)
            extracted_G.deactivated_V.add(u)
            for v in extracted_G.N(u):
                extracted_G.N_reversed(v).remove(u)

            for v in extracted_G.N_reversed(u):
                extracted_G.N(v).remove(v)  

            extracted_G.N(u).clear()          

    extracted_G.find_roots()
    for v in extracted_G.V:
        v.level -= level
    return extracted_G


def make_received_offers_summary(received_offers: List[int]) -> Dict[int, int]:
    received_offers_summary_dict: Dict[int, int] = {}
    for u in received_offers:
        if u not in received_offers_summary_dict:
            received_offers_summary_dict[u] = 0
        received_offers_summary_dict[u] += 1    

    received_offers_summary = [(index, count) for index, count in received_offers_summary_dict.items()]
    received_offers_summary.sort(key=lambda x: -x[1])
    return received_offers_summary_dict, received_offers_summary_dict


def greedily_divide_into_L_sets(
    G: Graph, 
    Vs_per_level: List[List[int]],
    determine_if_should_merge: Union[int, Callable[[int, int], bool]]
    # determine_if_contentious_policy: Union[Callable[[List[int]], bool], None] = None
) -> List[List[int]]:
    
    roots = G.roots
    L_sets = [[roots[i]] for i in range (len(roots))]
    for i in range (len(roots)):
        setattr(G.V[roots[i]], "L_set_index", i)

    for k in range (0, len(Vs_per_level)):
        V_Nu = set()
        for u in Vs_per_level[k]:
            setattr(u, "received_offers", [])
            for u in G.N(u):                
                if not hasattr(G.V[u], "received_offers") or u.last_set_received_offers < k:
                    setattr(G.V[u], "received_offers", [])
                    setattr(G.V[u], "last_set_received_offers", k)
                G.V[u].received_offers.append(u)
                V_Nu.add(u)

        for u in V_Nu:
            if hasattr(u, "L_set_index"):
                for w in G.N_reversed(u):
                    if G.V[w].level < k:
                        if not hasattr(G.V[w], "received_offers") or G.V[w].last_set_received_offers < k:
                            setattr(G.V[w], "received_offers", [])
                            setattr(G.V[w], "last_set_received_offers", k)
                        G.V[u].received_offers.append(w)

        V_kr = set()
        for u in V_Nu:
            for w in G.N_reversed():
                V_kr.add(w)
                for offer in u.received_offers:
                    if w == offer: continue
                    G.V[w].received_offers.append(offer)                   

        for u in V_kr:
            received_offers_summary_dict, received_offers_summary = make_received_offers_summary(G.V[u].received_offers)
            setattr(G.V[u], "received_offers_summary", received_offers_summary)
            setattr(G.V[u], "received_offers_summary_dict", received_offers_summary_dict)
            setattr(G.V[u], "merge_set", None)

        for u in V_kr:
            for u, count in G.V[u].received_offers_summary:
                if not determine_if_should_merge(k, count):
                    break 
                if G.V[u].merge_set is None and G.V[u].merge_set is None:
                    G.V[u].merge_set = set([u, u])
                    G.V[u].merge_set = G.V[u].merge_set
                elif G.V[u].merge_set is None:
                    G.V[u].merge_set.add(u)
                    G.V[u].merge_set = G.V[u].merge_set
                elif G.V[u].merge_set is None: 
                    G.V[u].merge_set.add(u) 
                    G.V[u].merge_set = G.V[u].merge_set 
                else:
                    G.V[u].merge_set.add(u)
                    for w in G.V[u].merge_set:
                        G.V[u].merge_set.add(w)
                        G.V[w].merge_set = G.V[u].merge_set

        for u in V_kr:
            if G.V[u].merge_set is not None and len(G.V[u].merge_set) > 1:
                V_mu = set()
                 



# assumes the graph is pre-processed
def create_initial_L_sets(G: Graph) -> List[List[int]]:
    cum_d_edges_per_level = build_cum_d_edges_per_level(find_d_edges_per_level(G))
    Vs_per_level = build_Vs_per_level_collection(G)
    cum_V_counts_per_level = [0 for _ in range (len(Vs_per_level))]
    for i in range (len(Vs_per_level)):
        cum_V_counts_per_level[i] = len(Vs_per_level) + cum_V_counts_per_level[i-1]

    starting_level = determine_the_starting_level(
        cum_d_edges_per_level, 
        threshold=DynamicThreshold.DYNAMIC, 
        dynamic_threshold_calculator=lambda level, cum_V_counts_=cum_V_counts_per_level: int(0.15 * cum_V_counts_[level])
    )

    G_l = extract_subgraph_cut_off_at_level(G, Vs_per_level, starting_level)
    # print(starting_level)
    # return G_l
    L_sets = greedily_divide_into_L_sets(G_l, Vs_per_level[starting_level:])

    