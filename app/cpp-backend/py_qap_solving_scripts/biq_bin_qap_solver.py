import sys
import os
import subprocess
from io import TextIOWrapper
from scipy import sparse
import numpy as np
from typing import Tuple, List
from collections import deque

from stack import Stack
from colour_hierarchy_node import ColourHierarchyNode
from pretend_matrix import PretendMatrix, PretendMatrixMode
from primitive_try_qap_solve import primitive_try_qap_solve


def read_colour_hierarchy_from_file(file: TextIOWrapper) -> Tuple[ColourHierarchyNode, int]:
    colour_hierarchy_stack = Stack()
    colour_hierarchy_root: ColourHierarchyNode = None
    current_indent = 0
    max_colour_index = -1
    while True:
        line = file.readline().strip()
        if len(line) == 0:
            break 

        print("RCH line: ", line, len(line))
        indent_part, colour = line.split(sep=" ")
        new_indent = len(indent_part)
        colour = colour.strip()
        colour = int(colour)
        max_colour_index = max(max_colour_index, colour)

        if current_indent == 0:
            colour_hierarchy_stack.emplace(ColourHierarchyNode(colour))
            colour_hierarchy_root = colour_hierarchy_stack.peek_top()
        elif new_indent <= current_indent:     
            indent_diff = current_indent - new_indent
            for _ in range(indent_diff+1):
                colour_hierarchy_stack.pop()

            colour_hierarchy_stack.peek_top().add_child(colour)
            colour_hierarchy_stack.emplace(
                colour_hierarchy_stack.peek_top().children_nodes[-1]
            )    
        elif new_indent == current_indent+1:
            colour_hierarchy_stack.peek_top().add_child(colour)
            colour_hierarchy_stack.emplace(
                colour_hierarchy_stack.peek_top().children_nodes[-1]
            )    
        else:
            raise RuntimeError(
                "Indent increased by more than one, which is invalid"
            ) 

        current_indent = new_indent   
        
    return colour_hierarchy_root, max_colour_index  


def build_F_matrix(file: TextIOWrapper) -> Tuple[sparse.csr_matrix, int, int]:
    line = file.readline()
    print(line)
    row_count, col_count = line.split(sep=" ")
    row_count = int(row_count.strip())
    col_count = int(col_count.strip())
    file.readline() # Reading empty seperator line
    
    F_dense_matrix = np.zeros((row_count, col_count))
    while True:
        line = file.readline()
        if line == "":
            break
        unused_F_letter, c1, c2, val = line.split(sep=" ")
        c1 = int(c1)
        c2 = int(c2)
        val = int(val.strip())
        F_dense_matrix[c1, c2] = val 
        F_dense_matrix[c2, c1] = val

    F_sparse_matrix = sparse.csr_matrix(F_dense_matrix)
    return F_sparse_matrix, row_count, col_count


def write_biq_bin_source_path(
    F_matrix: np.ndarray, D_matrix: PretendMatrix,
    biq_bin_source_filepath: str
) -> None:

    n = F_matrix.shape[0]
    assert n == F_matrix.shape[1]

    # QAP Problem variable remapping x_ik = x'_a, where a = (i-1)*n + k

    with open(biq_bin_source_filepath, "w") as biq_bin_file:
        biq_bin_file.write(f"A\n")
        # Adding constraints: for each i: sum_{k=1}{n} x_ik = 1
        # i.e. only one facility per object
        for row in range(1, n+1):
            column_offset = (row-1) * n
            for j in range(1, n+1):
                biq_bin_file.write(f"{row} {column_offset+j} {1}\n")

        # Adding constraints: for each k: sum_{i=1}{k} x_ik = 1
        # i.e. only one object per facility
        for row in range(n+1, 2*n+1):
            k = row - n
            for j in range(1, n+1):
                biq_bin_file.write(f"{row} {k + (j-1)*n} {1}\n")        

        biq_bin_file.write("b\n")
        for row in range(1, 2*n+1):
            biq_bin_file.write(f"{row} {1}\n")

        biq_bin_file.write("F\n")
        for i in range(n):
            for j in range(i+1, n):
                if F_matrix[i, j] == 0:
                    continue 
                for k in range(1, n+1):
                    for l in range(1, n+ 1):
                        if k == l: continue 
                        biq_bin_file.write(f"{i*n + k} {j*n + l} {F_matrix[i, j] * D_matrix[i, j]}\n")

        biq_bin_file.write("c\n")
        for i in range(1, n**2+1):
            biq_bin_file.write(f"{i} {0}")                


def fill_colour_remapping_by_performing_qap(
    colour_remapping: List[int], colour_hierarchy_root: ColourHierarchyNode, 
    F_matrix: sparse.csr_matrix, 
    biq_bin_source_filepath: str, max_cut_problem_transformation_filepath: str
) -> None:
    
    Q = deque()
    Q.append(colour_hierarchy_root)

    colour_remapping[colour_hierarchy_root] = 0
    counter = 1
    biq_bin_module_path = "/app/submodules/biq-bin/matlab"
    matlab_src_code_suite_path = "/app/submodules/biq-bin/matlab"

    while len(Q) > 0:
        node: ColourHierarchyNode = Q.popleft()        
        number_of_children = len(node.children_nodes)
        if number_of_children <= 2:
            continue 

        if node.parent is None:
            F_for_subquestion = np.zeros((number_of_children, number_of_children))
            for i in range(number_of_children):
                child_i_colour = node.children_nodes[i].colour
                for j in range(number_of_children):
                    child_j_colour = node.children_nodes[j].colour
                    F_for_subquestion[i, j] = F_matrix[child_i_colour, child_j_colour]

            D_for_subquestion = PretendMatrix(
                mode=PretendMatrixMode.DYNAMIC_CALCULATION, 
                size=(number_of_children, number_of_children), 
                dynamic_calculator=lambda i, j: abs(i-j)
            )
            R, successful = primitive_try_qap_solve(F_for_subquestion, D_for_subquestion)
            # if successful:
            #     R_with_indices = [(i, R[i]) for i in range(len(R))]
            #     R_with_indices.sort(key=lambda x: x[1])

            #     for i, unused_R_i in R_with_indices:
            #         child_i_colour = node.children_nodes[i].colour
            #         colour_remapping[child_i_colour] = counter
            #         counter += 1
            if not successful:
                write_biq_bin_source_path(
                    F_for_subquestion, D_for_subquestion,
                    biq_bin_source_filepath 
                )

                command_output = subprocess.run(
                    'octave --no-gui --silent --eval ' +
                    f"addpath('{matlab_src_code_suite_path}'); prepare_MC('{biq_bin_source_filepath}', '{max_cut_problem_transformation_filepath}'); exit;", 
                    shell=True, capture_output=True, text=True
                )
                command_output.check_returncode()

                command_output = subprocess.run(
                    f"cd {biq_bin_module_path} && " +
                    f"mpirun --allow-run-as-root -n 4 ./biqbin ${max_cut_problem_transformation_filepath} params 0 start.log temp.log", 
                    shell=True, capture_output=True, text=True
                )
                command_output.check_returncode()

                command_output = subprocess.run(
                    f"mv {max_cut_problem_transformation_filepath}_0.output {max_cut_problem_transformation_filepath} && " +
                    f"cat {max_cut_problem_transformation_filepath} | head -n 6 | tail -n 1", 
                    shell=True, capture_output=True, text=True 
                )
                command_output.check_returncode()
                max_cut_opt_run_result = command_output.stdout
                # max_cut_opt_run_result_lines = max_cut_opt_run_result.split("\n")

                command_output = subprocess.run(
                    f"rm -r {max_cut_problem_transformation_filepath}*", 
                    shell=True, capture_output=True, text=True
                )
                command_output.check_returncode()

                unused_filed_name, vertice_list = max_cut_opt_run_result.split(":")
                vertice_list = vertice_list.strip().lstrip("[").rstrip(",").rstrip("]")
                num_vertice_list = [int(x) for x in vertice_list.split(",")]

                # Case 1: the function returned the side of the cut with ones
                if len(num_vertice_list) == number_of_children:
                    target_numbers = num_vertice_list
                # Case 2: the function returned the side of the cut with zeros
                else:  
                    target_numbers = []
                    for i in range(1, len(num_vertice_list)):
                        x = num_vertice_list[i]
                        previous_x = num_vertice_list[i-1]
                        if previous_x+1 != x:
                            target_numbers.append(x-1)

                R = [i for i in range(number_of_children)]
                for index in range(len(target_numbers)):
                    x = target_numbers[index]
                    i = int(x // number_of_children)
                    k = x % number_of_children
                    R[i] = k

            R_with_indices = [(i, R[i]) for i in range(len(R))]
            R_with_indices.sort(key=lambda x: x[1])

            for i, unused_R_i in R_with_indices:
                child_i_colour = node.children_nodes[i].colour
                colour_remapping[child_i_colour] = counter
                counter += 1

        else: ... 

        node.children_nodes.sort(
            key=lambda x, cr_=colour_remapping: cr_[x.colour]
        )        

        for child in node.children_nodes:
            Q.append(child)
