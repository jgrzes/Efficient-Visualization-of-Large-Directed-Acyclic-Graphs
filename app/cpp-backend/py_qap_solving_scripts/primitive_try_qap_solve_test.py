from .primitive_try_qap_solve import *
import pytest


def test_empty_nrll_creation():
    nrll = NoRemovalLinkedList()
    assert nrll.size == 0


def test_nrll_with_one_element_creation():
    nrll_1 = NoRemovalLinkedList()
    nrll_1.add_first(1)
    nrll_2 = NoRemovalLinkedList()
    nrll_2.add_last(2)
    assert nrll_1.size == 1 and nrll_2.size == 1


def test_nrll_with_random_new_element_inserting():
    elements_to_insert = [
        ("front", 1), ("back", 2), ("back", 3), 
        ("front", 10), ("back", 4), ("front", 41), 
        ("back", 7), ("front", 8)
    ]    
    # Expected outcome: 8 -> 41 -> 10 -> 1 -> 2 -> 3 -> 4 -> 7
    nrll = NoRemovalLinkedList()
    for end_prompt, x in elements_to_insert:
        if end_prompt == "front":
            nrll.add_first(x)
        elif end_prompt == "back":
            nrll.add_last(x)
        else:
            raise RuntimeError(f"Unknown end prompt: {end_prompt}")

    elements = [
        int(el.lstrip("<").rstrip(">")) for el in str(nrll).split(" ") if el != "-->"
    ]
    index_correctness = True 
    postfix_index_correctness = True
    node = nrll.head
    while node.next is not None:
        next_node: LinkedListElement = node.next 
        # print(node._index, node, next_node._index, next_node)
        if next_node._index != node._index+1:
            index_correctness = False 
        if next_node.index != node.index+1:
            postfix_index_correctness = False 
        
        node = next_node        

    assert elements == [8, 41, 10, 1, 2, 3, 4, 7] and index_correctness and postfix_index_correctness


def test_nrll_reservering():                    
    elements_to_insert = [
        ("front", 1), ("back", 2), ("back", 3), 
        ("front", 10), ("back", 4), ("front", 41), 
        ("back", 7), ("front", 8)
    ]    
    # Expected outcome: 8 -> 41 -> 10 -> 1 -> 2 -> 3 -> 4 -> 7
    nrll = NoRemovalLinkedList()
    for end_prompt, x in elements_to_insert:
        if end_prompt == "front":
            nrll.add_first(x)
        elif end_prompt == "back":
            nrll.add_last(x)
        else:
            raise RuntimeError(f"Unknown end prompt: {end_prompt}")

    nrll.reverse()
    elements = [
        int(el.lstrip("<").rstrip(">")) for el in str(nrll).split(" ") if el != "-->"
    ]
    index_correctness = True 
    postfix_index_correctness = True
    node = nrll.head
    while node.next is not None:
        next_node: LinkedListElement = node.next 
        if next_node._index != node._index+1:
            index_correctness = False 
        if next_node.index != node.index+1:
            postfix_index_correctness = False 
        
        node = next_node   

    previous_pointers = []
    next_pointers = []
    node = nrll.head 
    while node is not None:
        previous_node = node.previous 
        previous_pointers.append(
            None if previous_node is None else previous_node.contents
        )    
        next_node = node.next 
        next_pointers.append(
            None if next_node is None else next_node.contents
        )
        node = next_node

    assert (
        elements == [7, 4, 3, 2, 1, 10, 41, 8] and 
        previous_pointers == [None, 7, 4, 3, 2, 1, 10, 41] and 
        next_pointers == [4, 3, 2, 1, 10, 41, 8, None] and
        index_correctness and postfix_index_correctness
    )


def test_end_merging():
    elements_to_insert_1 = [
        ("front", 1), ("back", 2), ("back", 3), 
        ("front", 10), ("back", 4), ("front", 41), 
        ("back", 7), ("front", 8)
    ]    
    # Expected outcome: 8 -> 41 -> 10 -> 1 -> 2 -> 3 -> 4 -> 7
    nrll_1 = NoRemovalLinkedList()
    for end_prompt, x in elements_to_insert_1:
        if end_prompt == "front":
            nrll_1.add_first(x)
        elif end_prompt == "back":
            nrll_1.add_last(x)
        else:
            raise RuntimeError(f"Unknown end prompt: {end_prompt}")
        
    elements_to_insert_2 = [
        ("front", 44), ("back", 5), ("back", 15), 
        ("front", 50), ("front", 3), ("back", 7)
    ] 
    # Expected outcome: 3 -> 50 -> 44 -> 5 -> 15 -> 7
    nrll_2 = NoRemovalLinkedList()
    for end_prompt, x in elements_to_insert_2:
        if end_prompt == "front":
            nrll_2.add_first(x)
        elif end_prompt == "back":
            nrll_2.add_last(x)
        else:
            raise RuntimeError(f"Unknown end prompt: {end_prompt}")   
        
    nrll_1.merge_another_onto_tail(nrll_2)
    nrll = nrll_1
    elements = [
        int(el.lstrip("<").rstrip(">")) for el in str(nrll).split(" ") if el != "-->"
    ]
    index_correctness = True 
    postfix_index_correctness = True
    node = nrll.head
    while node.next is not None:
        next_node: LinkedListElement = node.next 
        if next_node._index != node._index+1:
            index_correctness = False 
        if next_node.index != node.index+1:
            postfix_index_correctness = False 
        
        node = next_node  

    previous_pointers = []
    next_pointers = []
    node = nrll.head 
    while node is not None:
        previous_node = node.previous 
        previous_pointers.append(
            None if previous_node is None else previous_node.contents
        )    
        next_node = node.next 
        next_pointers.append(
            None if next_node is None else next_node.contents
        )
        node = next_node     

    assert (
        elements == [8, 41, 10, 1, 2, 3, 4, 7, 3, 50, 44, 5, 15, 7] and 
        previous_pointers == [None, 8, 41, 10, 1, 2, 3, 4, 7, 3, 50, 44, 5, 15] and 
        next_pointers == [41, 10, 1, 2, 3, 4, 7, 3, 50, 44, 5, 15, 7, None] and 
        index_correctness and postfix_index_correctness and nrll_2.head is None and nrll_2.tail is None
    )


def test_end_merging():
    elements_to_insert_1 = [
        ("front", 1), ("back", 2), ("back", 3), 
        ("front", 10), ("back", 4), ("front", 41), 
        ("back", 7), ("front", 8)
    ]    
    # Expected outcome: 8 -> 41 -> 10 -> 1 -> 2 -> 3 -> 4 -> 7
    nrll_1 = NoRemovalLinkedList()
    for end_prompt, x in elements_to_insert_1:
        if end_prompt == "front":
            nrll_1.add_first(x)
        elif end_prompt == "back":
            nrll_1.add_last(x)
        else:
            raise RuntimeError(f"Unknown end prompt: {end_prompt}")
        
    elements_to_insert_2 = [
        ("front", 44), ("back", 5), ("back", 15), 
        ("front", 50), ("front", 3), ("back", 7)
    ] 
    # Expected outcome: 3 -> 50 -> 44 -> 5 -> 15 -> 7
    nrll_2 = NoRemovalLinkedList()
    for end_prompt, x in elements_to_insert_2:
        if end_prompt == "front":
            nrll_2.add_first(x)
        elif end_prompt == "back":
            nrll_2.add_last(x)
        else:
            raise RuntimeError(f"Unknown end prompt: {end_prompt}")   
        
    nrll_1.merge_another_onto_head(nrll_2)
    nrll = nrll_1
    elements = [
        int(el.lstrip("<").rstrip(">")) for el in str(nrll).split(" ") if el != "-->"
    ]
    index_correctness = True 
    postfix_index_correctness = True
    node = nrll.head
    while node.next is not None:
        next_node: LinkedListElement = node.next 
        if next_node._index != node._index+1:
            index_correctness = False 
        if next_node.index != node.index+1:
            postfix_index_correctness = False 
        
        node = next_node   

    previous_pointers = []
    next_pointers = []
    node = nrll.head 
    while node is not None:
        previous_node = node.previous 
        previous_pointers.append(
            None if previous_node is None else previous_node.contents
        )    
        next_node = node.next 
        next_pointers.append(
            None if next_node is None else next_node.contents
        )
        node = next_node         

    assert (
        elements == [3, 50, 44, 5, 15, 7, 8, 41, 10, 1, 2, 3, 4, 7] and 
        previous_pointers == [None, 3, 50, 44, 5, 15, 7, 8, 41, 10, 1, 2, 3, 4] and
        next_pointers == [50, 44, 5, 15, 7, 8, 41, 10, 1, 2, 3, 4, 7, None] and
        index_correctness and postfix_index_correctness and nrll_2.head is None and nrll_2.tail is None
    )


def test_primitive_try_qap_solve_all_connected():
    n = 7
    F_matrix_non_zero_cells = [
        (3, 4, 3), (0, 4, 5), (0, 6, 4), (1, 6, 6), 
        (1, 5, 5), (2, 5, 7), (3, 6, 1), (4, 6, 1), 
        (0, 1, 1), (1, 2, 2)
    ]    

    D_matrix = PretendMatrix(
        mode=PretendMatrixMode.DYNAMIC_CALCULATION, 
        size=(n, n),
        dynamic_calculator=lambda x, y: abs(x-y)
    )

    F_matrix = np.zeros((7, 7))
    for i, j, value in F_matrix_non_zero_cells:
        F_matrix[i, j] = value 
        F_matrix[j, i] = value

    remapping, was_successful = primitive_try_qap_solve(
        F_matrix=F_matrix, D_matrix=D_matrix
    )

    assert was_successful and remapping == [2, 4, 6, 0, 1, 5, 3]


def test_primitive_try_qap_solve_some_connected():
    n = 9
    F_matrix_with_non_zero_cells = [
        (1, 7, 6), (1, 6, 1), (4, 8, 7), (6, 7, 2), 
        (4, 5, 3), (3, 5, 1), (3, 4, 2), (3, 8, 1)
    ]    
    
    D_matrix = PretendMatrix(
        mode=PretendMatrixMode.DYNAMIC_CALCULATION, 
        size=(n, n), 
        dynamic_calculator=lambda x, y: abs(x-y)
    )

    F_matrix = np.zeros((n, n))
    for i, j, value in F_matrix_with_non_zero_cells:
        F_matrix[i, j] = value 
        F_matrix[j, i] = value 

    remapping, was_successful = primitive_try_qap_solve(
        F_matrix=F_matrix, D_matrix=D_matrix
    )    
           
    assert was_successful


def test_primitive_try_qap_solve_with_borders_fixed_all_connected():
    n = 5
    lb, rb = n, n+1
    F_matrix_with_non_zero_cells = [
        (2, lb, 8), (0, 2 ,4), (0, 4, 5), 
        (1, 4, 9), (1, 3, 10), (3, rb, 8), 
        (0, lb, 7), (1, lb, 1), (2, 4, 3), (1, rb, 4)
    ]
    D_matrix = PretendMatrix(
        mode=PretendMatrixMode.DYNAMIC_CALCULATION, 
        size=(n+2, n+2), 
        dynamic_calculator=lambda x, y: abs(x-y)
    )

    F_matrix = np.zeros((n+2, n+2))   
    for i, j, value in F_matrix_with_non_zero_cells:
        F_matrix[i, j] = value 
        F_matrix[j, i] = value  

    remapping, was_successful = primitve_try_qap_solve_with_borders_fixed(
        F_matrix=F_matrix, D_matrix=D_matrix
    )    
           
    assert remapping == [1, 3, 0, 4, 2] and was_successful


# if __name__ == "__main__":
    # test_primitive_try_qap_solve_all_connected()