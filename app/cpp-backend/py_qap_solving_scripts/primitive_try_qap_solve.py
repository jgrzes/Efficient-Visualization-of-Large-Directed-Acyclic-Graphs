import numpy as np
from typing import Tuple, List, Optional, Any, Set, Dict
from numbers import Number

try:
    from .pretend_matrix import PretendMatrix, PretendMatrixMode
except ImportError as e:
    from pretend_matrix import PretendMatrix, PretendMatrixMode

class LinkedListElement:
    def __init__(self, i: int, list_ref, contents: Any, previous_element=None, next_element=None):
        self._index = i
        self.list_ref = list_ref
        self.contents = contents
        # print(f"{contents}, index={i}")
        self.previous: "LinkedListElement" = previous_element
        self.next: "LinkedListElement" = next_element
        if self.previous is not None:
            self.previous.next = self 
        if self.next is not None:
            self.next.previous = self      

    @property
    def index(self) -> int:
        return self._index - self.list_ref.head_offset     

    def __str__(self):
        return f"<{self.contents}>"   
    
    def __repr__(self):
        return self.__str__()


class NoRemovalLinkedList:
    def __init__(self):
        self.contents_map: Dict[int, LinkedListElement] = {}
        self.head_offset = 0
        self.head: Optional[LinkedListElement] = None
        self.tail: Optional[LinkedListElement] = None 

    @property
    def size(self) -> int:
        if self.head is None: 
            return 0
        return self.tail.index - self.head.index + 1

    def reverse(self) -> None:
        previous_el: Optional[LinkedListElement] = None 
        current_el: Optional[LinkedListElement] = self.head    
        previous_head = self.head 
        previous_tail = self.tail  

        while current_el is not None:
            next_el = current_el.next
            current_el._index *= -1
            current_el.next = previous_el
            current_el.previous = next_el

            previous_el = current_el
            current_el = next_el

        self.head = previous_tail
        self.tail = previous_head    
        self.head_offset = self.head._index

    def add_first(self, contents: Any) -> None:
        if self.head is None:
            self.head = LinkedListElement(self.head_offset, self, contents)
            self.tail = self.head
            self.contents_map[contents] = self.head
            return

        self.head_offset -= 1
        previous_head = self.head
        self.head = LinkedListElement(
            self.head_offset, self, contents, next_element=previous_head
        )  
        self.contents_map[contents] = self.head

    def add_last(self, contents: Any) -> None:
        if self.head is None:
            self.head = LinkedListElement(self.head_offset, self, contents)
            self.tail = self.head 
            self.contents_map[contents] = self.tail
            return 

        previous_tail = self.tail
        self.tail = LinkedListElement(
            previous_tail._index+1, self, contents, previous_element=previous_tail
        )
        self.contents_map[contents] = self.tail

    def merge_another_onto_tail(self, other_linked_list: "NoRemovalLinkedList") -> None:   
        if other_linked_list.head is None:
            return 
        if self.head is None:
            self.head = other_linked_list.head 
            self.tail = other_linked_list.tail
            self.head_offset = other_linked_list.head_offset
        else:
            other_size = other_linked_list.size
            other_head = other_linked_list.head 
            self.tail.next = other_head
            other_head.previous = self.tail
            index = self.tail._index
            self.tail = other_linked_list.tail 

            node = other_head
            j = 0
            while node is not None:
                # print(node)
                index += 1
                node._index = index 
                node = node.next 
                j += 1
                if j == 2*other_size:
                    exit()

        node = other_linked_list.head
        while node is not None:
            node.list_ref = self 
            node = node.next    

        other_linked_list.head = None 
        other_linked_list.tail = None          
    
    def merge_another_onto_head(self, other_linked_list: "NoRemovalLinkedList") -> None:
        if other_linked_list.head is None:
            return
        if self.head is None:
            self.head = other_linked_list.head 
            self.tail = other_linked_list.tail 
            self.head_offset = other_linked_list.head_offset
        else:
            other_tail = other_linked_list.tail
            self.head.previous = other_tail
            other_tail.next = self.head 
            self.head = other_linked_list.head

            node = other_tail
            while node is not None:
                self.head_offset -= 1
                node._index = self.head_offset
                node = node.previous

        node = other_linked_list.tail 
        while node is not None:
            node.list_ref = self 
            node = node.previous

        other_linked_list.head = None 
        other_linked_list.tail = None

    def __str__(self):
        if self.head is None:
            return "<empty nrll>"
        node = self.head 
        str_repr = ""
        while node is not None:
            str_repr = str_repr + str(node)
            node = node.next
            if node is not None:
                str_repr = str_repr + " --> "

        return str_repr

    def __repr__(self):
        return self.__str__()        


def find_parent(x: int, parent_map: List[int]) -> int:
    r = x 
    while parent_map[r] != r:
        r = parent_map[r]

    while parent_map[x] != r:
        iter_parent = parent_map[x]
        parent_map[x] = r 
        x = iter_parent 

    return r 


def union(x: int, y: int, parent_map: List[int], rank_map: List[int]) -> int:
    px = find_parent(x, parent_map)
    py = find_parent(y, parent_map)

    if px == py: return 

    if rank_map[px] == rank_map[py]:
        rank_map[px] += 1
        parent_map[py] = px 
    elif rank_map[px] > rank_map[py]:
        parent_map[py] = px 
    else:
        parent_map[px] = py  


# Experimental function, assuming that D[i, j] = |i-j|
def calculate_acceptable_threshold_for_non_adjacent(n: int) -> int:
    return 6 * max(0, n-2)


def calculate_value_for_non_adjacent(
    remapping: List[int], F_matrix: np.ndarray, D_matrix: np.ndarray
) -> int:      
    n = len(remapping)
    non_zero_indices_collection: List[List[int]] = []
    for i in range(n):
        non_zero_indices_collection.append(np.where(F_matrix[i] > 0)[0])

    # print(non_zero_indices_collection)
    non_adjacent_cum_value_after_remapping = 0
    for i in range(n):
        non_zero_indices_i = non_zero_indices_collection[i]
        for j in non_zero_indices_i:
            # print(i, j)
            if abs(remapping[i] - remapping[j]) <= 1 or j < i:
                continue 
            non_adjacent_cum_value_after_remapping += F_matrix[i, j] * D_matrix[i, j]

    return non_adjacent_cum_value_after_remapping            


# Does not use D_matrix, assumes that for each i, j, k: |i-j| > |i-k| => D[i, j] > D[i, k] 
# Returns tuple (remapping, was_successful)
def primitive_try_qap_solve(
    F_matrix: np.ndarray, D_matrix: PretendMatrix
) -> Tuple[Optional[List[int]], bool]:
    
    n = F_matrix.shape[0]
    non_zero_F_cells: List[Tuple[int, int, Number]] = []
    for i in range(n):
        for j in range(i+1, n):
            if F_matrix[i, j] != 0:
                non_zero_F_cells.append((i, j, F_matrix[i, j]))

    non_zero_F_cells.sort(key=lambda x: -x[-1])            
    no_removal_ll_sets: Set[NoRemovalLinkedList] = set()
    # already_in_nrll_sets: List[bool] = [False for _ in range(n)]
    parent: List[int] = [i for i in range(n)]
    rank: List[int] = [1 for _ in range(n)]
    mapped_elements: List[Optional[LinkedListElement]] = [None for _ in range(n)]

    for i, j, unused_value in non_zero_F_cells:
        print(i, j, unused_value)
        in_nrll_sets_i = mapped_elements[i] is not None
        in_nrll_sets_j = mapped_elements[j] is not None

        if not in_nrll_sets_i and not in_nrll_sets_j:
            # print("Neither")
            nrll_ij = NoRemovalLinkedList()
            nrll_ij.add_last(i)
            nrll_ij.add_last(j)
            mapped_elements[i] = nrll_ij.head 
            mapped_elements[j] = nrll_ij.tail
            no_removal_ll_sets.add(nrll_ij)
            union(i, j, parent_map=parent, rank_map=rank)

        elif (in_nrll_sets_i and not in_nrll_sets_j) or (not in_nrll_sets_i and in_nrll_sets_j):
            # print("Only one")
            if not in_nrll_sets_i: i, j = j, i
            nrll_i: NoRemovalLinkedList = mapped_elements[i].list_ref 
            # head_i_index = nrll_i.head.index
            # tail_i_index = nrll_i.tail.index
            # i_index = mapped_elements[i].index 

            # number_of_elements_to_the_left = i_index - head_i_index
            # number_of_elements_to_the_right = tail_i_index - i_index 
            # if number_of_elements_to_the_left <= number_of_elements_to_the_right:
            #     nrll_i.add_first(j)
            #     mapped_elements[j] = nrll_i.head 
            # else:
            #     nrll_i.add_last(j)
            #     mapped_elements[j] = nrll_i.tail 

            cum_sum_for_add_as_head = 0
            cum_sum_for_add_as_tail = 0
            nrll_i_size = nrll_i.size 
            for c, node_c in nrll_i.contents_map.items():
                index_c = node_c.index
                if F_matrix[j, c] != 0:
                    cum_sum_for_add_as_head += (index_c+1) * F_matrix[j, c]
                    cum_sum_for_add_as_tail += (nrll_i_size-index_c) * F_matrix[j, c]

            if cum_sum_for_add_as_head < cum_sum_for_add_as_tail:        
                nrll_i.add_first(j)
                mapped_elements[j] = nrll_i.head
            else:
                nrll_i.add_last(j)    
                mapped_elements[j] = nrll_i.tail

            union(i, j, parent_map=parent, rank_map=rank)

        # Alternatively: mapped_elements[i].list_ref is mapped_elements[j].list_ref
        elif find_parent(i, parent) != find_parent(j, parent):
            # print("Both but in different")
            nrll_i: NoRemovalLinkedList = mapped_elements[i].list_ref
            nrll_j: NoRemovalLinkedList = mapped_elements[j].list_ref 
            size_i = nrll_i.size 
            size_j = nrll_j.size
            cum_sum_1 = 0
            cum_sum_2 = 0
            cum_sum_3 = 0
            cum_sum_4 = 0

            # head_i_index = nrll_i.head.index
            # tail_i_index = nrll_i.tail.index 
            # i_index = mapped_elements[i].index 
            # head_j_index = nrll_j.head.index 
            # tail_j_index = nrll_j.tail.index 
            # j_index = mapped_elements[j].index 

            # if i_index - head_i_index < tail_i_index - i_index:
            #     nrll_i.reverse()
            # if tail_j_index - j_index < j_index - head_j_index:
            #     nrll_j.reverse()

            # nrll_i.merge_another_onto_tail(nrll_j)

            for x, node_x in nrll_j.contents_map.items():
                index_x = node_x.index
                for c, node_c in nrll_i.contents_map.items():
                    index_c = node_c.index 
                    if F_matrix[x, c] != 0:
                        print(f"x={x}, index_x={index_x}, c={c}, index_c={index_c}")
                        cum_sum_1 += (size_j - index_x + index_c) * int(F_matrix[x, c])
                        cum_sum_2 += (size_i - index_c + index_x) * int(F_matrix[x, c])

            print(f"cum sum 1 = {cum_sum_1}, nrll_j = {nrll_j}")
            print(f"cum sum 2 = {cum_sum_2}, nrll_j = {nrll_j}")

            nrll_j.reverse()
            for x, node_x in nrll_j.contents_map.items():
                index_x = node_x.index
                for c, node_c in nrll_i.contents_map.items():
                    index_c = node_c.index 
                    if F_matrix[x, c] != 0:
                        print(f"x={x}, index_x={index_x}, c={c}, index_c={index_c}")
                        cum_sum_3 += (size_j - index_x + index_c) * int(F_matrix[x, c])
                        cum_sum_4 += (size_i - index_c + index_x) * int(F_matrix[x, c])          

            print(f"cum sum 3 = {cum_sum_3}, nrll_j = {nrll_j}")
            print(f"cum sum 4 = {cum_sum_4}, nrll_j = {nrll_j}")

            cum_sum_min = min(cum_sum_1, cum_sum_2, cum_sum_3, cum_sum_4)
            if cum_sum_min == cum_sum_1 or cum_sum_min == cum_sum_2:
                nrll_j.reverse()

            if cum_sum_min == cum_sum_1 or cum_sum_min == cum_sum_3:
                nrll_i.merge_another_onto_head(nrll_j)
            else:
                nrll_i.merge_another_onto_tail(nrll_j)        

            union(i, j, parent_map=parent, rank_map=rank)

        print(no_removal_ll_sets)    

    explored_nrlls_parent: Set[int] = set()
    remapping: List[int] = [0 for _ in range(n)]
    counter = 0
    for i in range(n):
        mapped_element_i = mapped_elements[i]        
        if mapped_element_i is None:
            remapping[i] = counter 
            counter += 1
            continue 

        pi = find_parent(i, parent)
        if pi in explored_nrlls_parent:
            continue 

        explored_nrlls_parent.add(pi)
        nrll_i = mapped_element_i.list_ref
        node = nrll_i.head 
        while node is not None:
            node_index: int = node.contents
            remapping[node_index] = counter
            counter += 1
            node = node.next

    # Not sure if 4 is okay, should be at least 3, but for now experimenting with 4
    if n <= 4:
        return remapping, True        

    non_adjacent_value = calculate_value_for_non_adjacent(remapping, F_matrix, D_matrix)
    threshold = calculate_acceptable_threshold_for_non_adjacent(n)         
    if non_adjacent_value > threshold:
        return None, False 
    else:
        return remapping, True


# Does not use D_matrix, assumes that for each i, j, k: |i-j| > |i-k| => D[i, j] > D[i, k] 
# Returns tuple (remapping, was_successful)
def primitve_try_qap_solve_with_borders_fixed(
    F_matrix: np.ndarray, D_matrix: PretendMatrix
) -> Tuple[Optional[List[int]], bool]:
    
    n = F_matrix.shape[0]-2
    lb, rb = n, n+1

    non_zero_F_cells: List[Tuple[int, int, Number]] = []
    for i in range(n+2):
        for j in range(i+1, n+2):
            if F_matrix[i, j] != 0:
                non_zero_F_cells.append((i, j, F_matrix[i, j]))

    non_zero_F_cells.sort(key=lambda x: -x[-1])
    parent: List[int] = [i for i in range(n+2)]
    rank: List[int] = [1 for _ in range(n+2)]
    mapped_elements: List[Optional[LinkedListElement]] = [None for _ in range(n+2)]

    nrll_lb = NoRemovalLinkedList()
    nrll_lb.add_first(lb)
    mapped_elements[lb] = nrll_lb.head

    nrll_rb = NoRemovalLinkedList()
    nrll_rb.add_last(rb)
    mapped_elements[rb] = nrll_rb.head

    all_nrlls: Set[NoRemovalLinkedList] = set()
    all_nrlls.add(nrll_lb)
    all_nrlls.add(nrll_rb)

    # print(f"lb={lb}, rb={rb}")
    
    for i, j, unused_value in non_zero_F_cells:
        pi = find_parent(i, parent_map=parent)
        pj = find_parent(j, parent_map=parent)
        plb, prb = find_parent(lb, parent_map=parent), find_parent(rb, parent_map=parent)
        # print(f"i={i}, k={j}, val={unused_value}, pi={pi}, pj={pj}, pln={plb}, prb={prb}")

        if (pi == plb and pj == prb) or (pi == prb and pj == plb) or (pi == pj): 
            continue    

        # We want i to always signify the border nrll if only one denotes border nrll, 
        # so we switch values around
        if pj == plb or pj == prb: # Here we know that only pj signifies a border set
            i, j, pi, pj = j, i, pj, pi
            # print("Switching...")
            # print(f"i={i}, k={j}, val={unused_value}, pi={pi}, pj={pj}, pln={plb}, prb={prb}")

        in_nrll_sets_i = mapped_elements[i] is not None
        in_nrll_sets_j = mapped_elements[j] is not None
        if pi == plb:
            if not in_nrll_sets_j:
                # print("A")
                nrll_lb.add_last(j)
                mapped_elements[j] = nrll_lb.tail
            else:
                # print("B")
                nrll_j: NoRemovalLinkedList = mapped_elements[j].list_ref
                head_j_index = nrll_j.head.index 
                tail_j_index = nrll_j.tail.index 
                j_index = mapped_elements[j].index

                if tail_j_index - j_index < j_index - head_j_index:
                    nrll_j.reverse()

                nrll_lb.merge_another_onto_tail(nrll_j)

            union(i, j, parent_map=parent, rank_map=rank)

        elif pi == prb:
            if not in_nrll_sets_j:
                # print("C")
                nrll_rb.add_first(j)
                mapped_elements[j] = nrll_lb.head
            else:
                # print("D")
                nrll_j: NoRemovalLinkedList = mapped_elements[j].list_ref
                head_j_index = nrll_j.head.index 
                tail_j_index = nrll_j.tail.index 
                j_index = mapped_elements[j].index

                if j_index - head_j_index < tail_j_index - head_j_index:
                    nrll_j.reverse()

                nrll_rb.merge_another_onto_head(nrll_j)

            union(i, j, parent_map=parent, rank_map=rank)  

        else: # Neither is a border nrll so we can behave as we would normally
            if not in_nrll_sets_i and not in_nrll_sets_j:
            # print("Neither")
                nrll_ij = NoRemovalLinkedList()
                nrll_ij.add_last(i)
                nrll_ij.add_last(j)
                mapped_elements[i] = nrll_ij.head 
                mapped_elements[j] = nrll_ij.tail
                # no_removal_ll_sets.add(nrll_ij)
                union(i, j, parent_map=parent, rank_map=rank)

            elif (in_nrll_sets_i and not in_nrll_sets_j) or (not in_nrll_sets_i and in_nrll_sets_j):
                # print("Only one")
                if not in_nrll_sets_i: i, j = j, i
                nrll_i: NoRemovalLinkedList = mapped_elements[i].list_ref 
                # head_i_index = nrll_i.head.index
                # tail_i_index = nrll_i.tail.index
                # i_index = mapped_elements[i].index 

                # number_of_elements_to_the_left = i_index - head_i_index
                # number_of_elements_to_the_right = tail_i_index - i_index 
                # if number_of_elements_to_the_left <= number_of_elements_to_the_right:
                #     nrll_i.add_first(j)
                #     mapped_elements[j] = nrll_i.head 
                # else:
                #     nrll_i.add_last(j)
                #     mapped_elements[j] = nrll_i.tail 

                cum_sum_for_add_as_head = 0
                cum_sum_for_add_as_tail = 0
                nrll_i_size = nrll_i.size 
                for c, node_c in nrll_i.contents_map.items():
                    index_c = node_c.index
                    if F_matrix[j, c] != 0:
                        cum_sum_for_add_as_head += (index_c+1) * F_matrix[j, c]
                        cum_sum_for_add_as_tail += (nrll_i_size-index_c) * F_matrix[j, c]

                if cum_sum_for_add_as_head < cum_sum_for_add_as_tail:        
                    nrll_i.add_first(j)
                    mapped_elements[j] = nrll_i.head
                else:
                    nrll_i.add_last(j)    
                    mapped_elements[j] = nrll_i.tail

                union(i, j, parent_map=parent, rank_map=rank)

            # Alternatively: mapped_elements[i].list_ref is mapped_elements[j].list_ref
            elif find_parent(i, parent) != find_parent(j, parent):
                # print("Both but in different")
                nrll_i: NoRemovalLinkedList = mapped_elements[i].list_ref
                nrll_j: NoRemovalLinkedList = mapped_elements[j].list_ref 
                size_i = nrll_i.size 
                size_j = nrll_j.size
                cum_sum_1 = cum_sum_2 = cum_sum_3 = cum_sum_4 = 0

                # head_i_index = nrll_i.head.index
                # tail_i_index = nrll_i.tail.index 
                # i_index = mapped_elements[i].index 
                # head_j_index = nrll_j.head.index 
                # tail_j_index = nrll_j.tail.index 
                # j_index = mapped_elements[j].index 

                # if i_index - head_i_index < tail_i_index - i_index:
                #     nrll_i.reverse()
                # if tail_j_index - j_index < j_index - head_j_index:
                #     nrll_j.reverse()

                # nrll_i.merge_another_onto_tail(nrll_j)

                for x, node_x in nrll_j.contents_map.items():
                    index_x = node_x.index
                    for c, node_c in nrll_i.contents_map.items():
                        index_c = node_c.index 
                        if F_matrix[x, c] != 0:
                            cum_sum_1 += (size_j - index_x + index_c) * int(F_matrix[x, c])
                            cum_sum_2 += (size_i - index_c + index_x) * int(F_matrix[x, c])

                nrll_j.reverse()
                for x, node_x in nrll_j.contents_map.items():
                    index_x = node_x.index
                    for c, node_c in nrll_i.contents_map.items():
                        index_c = node_c.index 
                        if F_matrix[x, c] != 0:
                            cum_sum_3 += (size_j - index_x + index_c) * int(F_matrix[x, c])
                            cum_sum_4 += (size_i - index_c + index_x) * int(F_matrix[x, c])

                cum_sum_min = min(cum_sum_1, cum_sum_2, cum_sum_3, cum_sum_4)
                if cum_sum_min == cum_sum_1 or cum_sum_min == cum_sum_2:
                    nrll_j.reverse()

                if cum_sum_min == cum_sum_2 or cum_sum_min == cum_sum_3:
                    nrll_i.merge_another_onto_head(nrll_j)
                else:
                    nrll_i.merge_another_onto_tail(nrll_j)        

                union(i, j, parent_map=parent, rank_map=rank)

        # print(all_nrlls)        

    plb, prb = find_parent(lb, parent_map=parent), find_parent(rb, parent_map=parent)
    explored_nrlls_parent: Set[int] = set()
    explored_nrlls_parent.add(plb)
    explored_nrlls_parent.add(prb)
    remapping: List[int] = [0 for _ in range(n)]
    counter = 0

    node_lb = nrll_lb.head        
    while node_lb is not None:
        node_index: int = node_lb.contents
        if node_index != lb and node_index != rb:
            remapping[node_index] = counter 
            # print(f"Remapping in lb: {node_index} -> {counter}")
            counter += 1

        node_lb = node_lb.next

    for i in range(n):
        mapped_element_i = mapped_elements[i]        
        if mapped_element_i is None:
            remapping[i] = counter 
            counter += 1
            # print(f"Remapping in middle loop: {node_index} -> {counter}")
            continue 

        pi = find_parent(i, parent)
        if pi in explored_nrlls_parent:
            continue 

        # print(i, pi)
        explored_nrlls_parent.add(pi)
        nrll_i = mapped_element_i.list_ref
        node = nrll_i.head 
        while node is not None:
            node_index: int = node.contents
            # print(f"Remapping in middle loop: {node_index} -> {counter}")
            remapping[node_index] = counter
            counter += 1
            node = node.next       

    node_rb = nrll_rb.head        
    while node_rb is not None:
        node_index: int = node_rb.contents
        if node_index != lb and node_index != rb:
            remapping[node_index] = counter 
            # print(f"Remapping in rb loop: {node_index} -> {counter}")
            counter += 1

        node_rb = node_rb.next 

    # non_adjacent_value = calculate_value_for_non_adjacent(remapping, F_matrix[:n , :n], D_matrix)
    # threshold = calculate_acceptable_threshold_for_non_adjacent(n)         
    # if non_adjacent_value > threshold:
        # return None, False 
    # else:
    return remapping, True             



