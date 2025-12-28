import sys
import os
import subprocess
from io import TextIOWrapper
from scipy import sparse
import numpy as np
from typing import Tuple, List
from collections import deque

try:
    from .stack import Stack
    from .colour_hierarchy_node import ColourHierarchyNode
    from .pretend_matrix import PretendMatrix, PretendMatrixMode
    from .primitive_try_qap_solve import primitive_try_qap_solve, primitve_try_qap_solve_with_borders_fixed
except ImportError as e:
    from stack import Stack
    from colour_hierarchy_node import ColourHierarchyNode
    from pretend_matrix import PretendMatrix, PretendMatrixMode
    from primitive_try_qap_solve import primitive_try_qap_solve, primitve_try_qap_solve_with_borders_fixed


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
        biq_bin_file.write(f"{n**2} {2*n}\n")
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

        print(F_matrix) 
        biq_bin_file.write("F\n")
        for i in range(n):
            for j in range(i+1, n):
                if F_matrix[i, j] == 0:
                    continue 
                for k in range(1, n+1):
                    for l in range(1, n+ 1):
                        if k == l: continue 
                        biq_bin_file.write(f"{i*n + k} {j*n + l} {int(F_matrix[i, j] * D_matrix[k, l])}\n")

        biq_bin_file.write("c\n")
        for i in range(1, n**2+1):
            biq_bin_file.write(f"{i} {0}\n")                


def fill_colour_remapping_by_performing_qap(
    colour_remapping: List[int], colour_hierarchy_root: ColourHierarchyNode, 
    F_matrix: sparse.csr_matrix, 
    biq_bin_source_filepath: str, max_cut_problem_transformation_filepath: str
) -> None:
    
    Q = deque()
    Q.append(colour_hierarchy_root)

    colour_remapping[colour_hierarchy_root.colour] = 0
    counter = 1
    biq_bin_module_path = "/app/submodules/biq_bin_forked"
    matlab_src_code_suite_path = "/app/submodules/biq_bin_forked/matlab"

    while len(Q) > 0:
        node: ColourHierarchyNode = Q.popleft()   
        print(f"Took out: {node}")
        # print(f"Node: {node}, children: {node.children_nodes}")     
        number_of_children = len(node.children_nodes)

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
            successful = True
            if not successful:
                write_biq_bin_source_path(
                    F_for_subquestion, D_for_subquestion,
                    biq_bin_source_filepath 
                )

                command_output = subprocess.run(
                    'octave --no-gui --silent --eval ' + '"' + 
                    f"addpath('{matlab_src_code_suite_path}'); prepare_MC('{biq_bin_source_filepath}', '{max_cut_problem_transformation_filepath}'); exit; " + '"', 
                    shell=True, capture_output=True, text=True
                )
                try:
                    command_output.check_returncode()
                except subprocess.CalledProcessError as e:
                    print(command_output.stderr)
                    raise e

                # command_output = subprocess.run(
                #     f"cd {biq_bin_module_path} && " +
                #     f"mpirun --allow-run-as-root -n 4 ./biqbin {max_cut_problem_transformation_filepath} params 0 start.log temp.log &", 
                #     shell=True, capture_output=True, text=True
                # )
                # try:
                #     command_output.check_returncode()
                # except subprocess.CalledProcessError as e:
                #     print(command_output.stderr)
                #     raise e
                
                subprocess.run(
                    f"cd {biq_bin_module_path} && " +
                    f"mpirun --allow-run-as-root -n 4 ./biqbin {max_cut_problem_transformation_filepath} params 0 start.log temp.log > /dev/null 2>&1",
                    shell=True 
                    # start_new_session=True 
                )

                command_output = subprocess.run(
                    f"while [ ! -f {max_cut_problem_transformation_filepath}_0.output ]; do sleep 1; done", 
                    shell=True, text=True, capture_output=True 
                )
                try:
                    command_output.check_returncode()
                except subprocess.CalledProcessError as e:
                    print(command_output.stderr)
                    raise e

                command_output = subprocess.run(
                    f"cp {max_cut_problem_transformation_filepath}_0.output {max_cut_problem_transformation_filepath}_0_new && " +
                    f"cat {max_cut_problem_transformation_filepath}_0_new | head -n 6 | tail -n 1", 
                    shell=True, capture_output=True, text=True 
                )
                command_output.check_returncode()
                max_cut_opt_run_result = command_output.stdout
                print("Max cut opt run result: ", max_cut_opt_run_result)

                command_output = subprocess.run(
                    "kill $(ps aux | grep " +
                    f'\"[c]d {biq_bin_module_path} && ' +
                    f'mpirun --allow-run-as-root -n 4 ./biqbin {max_cut_problem_transformation_filepath} params 0 start.log temp.log > /dev/null 2>&1\" ' +
                    f" | head -n 1 | tr ' ' " + r"'\n'" + " | grep -v '^$' | head -n 2 | tail -n 1) || echo True",   
                    shell=True, capture_output=True, text=True
                )
                try:
                    command_output.check_returncode()
                except subprocess.CalledProcessError as e:
                    print(command_output.stderr)
                    raise e
                
                command_output = subprocess.run(
                    "kill $(ps aux | grep " +
                    f'\"[m]pirun --allow-run-as-root -n 4 ./biqbin {max_cut_problem_transformation_filepath} params 0 start.log temp.log\" ' +
                    f" | head -n 1 | tr ' ' " + r"'\n'" + " | grep -v '^$' | head -n 2 | tail -n 1) || echo True",  
                    shell=True, capture_output=True, text=True
                )
                try:
                    command_output.check_returncode()
                except subprocess.CalledProcessError as e:
                    print(command_output.stderr)
                    raise e

                command_output = subprocess.run(
                    f"rm -r {max_cut_problem_transformation_filepath}_0* || echo True", 
                    shell=True, capture_output=True, text=True
                )
                try:
                    command_output.check_returncode()
                except subprocess.CalledProcessError as e:
                    print(command_output.stderr)
                    raise e

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

        else: 
            F_for_subquestion = np.zeros((number_of_children+2, number_of_children+2))
            D_for_subquestion = PretendMatrix(
                mode=PretendMatrixMode.DYNAMIC_CALCULATION, 
                size=(number_of_children+2, number_of_children+2),
                dynamic_calculator=lambda i, j: abs(i-j)
            ) 

            for i in range(number_of_children):
                a = node.children_nodes[i].colour
                for j in range(number_of_children):
                    b = node.children_nodes[j].colour
                    F_for_subquestion[i, j] = F_matrix[a, b]  

            g = node.parent 
            p = node 
            while g is not None:
                left_of_p = []
                right_of_p = []

                current_side_array = left_of_p
                for child in g.children_nodes:
                    if child.colour == p.colour:
                        current_side_array = right_of_p
                    else:
                        current_side_array.append(child.colour)

                for i in range(len(node.children_nodes)):
                    a = node.children_nodes[i].colour
                    for l in left_of_p:
                        F_for_subquestion[i, number_of_children] += F_matrix[a, l]
                        F_for_subquestion[number_of_children, i] += F_matrix[a, l]

                    for r in right_of_p:    
                        F_for_subquestion[i, number_of_children-1] += F_matrix[a, r]
                        F_for_subquestion[number_of_children-1, i] += F_matrix[a, r]

                p = g
                g = g.parent

                # For now was_successful is always true
            R, unused_was_successful = primitve_try_qap_solve_with_borders_fixed(
                F_matrix=F_for_subquestion, D_matrix=D_for_subquestion
            )  

            R_with_indices = [(i, R[i]) for i in range(len(R))]
            R_with_indices.sort(key=lambda x: x[1])

            for i, unused_R_i in R_with_indices:
                child_i_colour = node.children_nodes[i].colour
                colour_remapping[child_i_colour] = counter
                counter += 1


        node.children_nodes.sort(
            key=lambda x, cr_=colour_remapping: cr_[x.colour]
        )        

        for child in node.children_nodes:
            print(f"Appending: {child}, {colour_remapping[child.colour]}")
            Q.append(child)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        raise Exception(f"No file with contents for qap specified")

    console_stdout = sys.stdout
    log_file = open(
        f"{os.path.dirname(os.path.abspath(__file__))}/python_logs/log_temp.txt", "w" 
    )  
    sys.stdout = log_file 

    input_problem_file_path = sys.argv[1]
    with open(input_problem_file_path, "r") as input_problem_file:
        print(input_problem_file.read())

    input_problem_file = open(input_problem_file_path, "r")
    colour_hierarchy_root, max_colour_index = read_colour_hierarchy_from_file(input_problem_file)     
    F_matrix, row_count, col_count = build_F_matrix(input_problem_file)
    if row_count != col_count:
        raise RuntimeError(
            f"Matrix must be sqaure not of shape ({row_count}, {col_count})"
        )         
    
    input_problem_file.close()
    colour_remapping = [i for i in range(max_colour_index+1)]

    biq_bin_source_filepath = f"{input_problem_file_path.split('.')[0]}_biq_bin_input.txt"
    max_cut_transformation_filepath = f"{input_problem_file_path.split('.')[0]}_max_cut_transformation.txt"

    fill_colour_remapping_by_performing_qap(
        colour_remapping, colour_hierarchy_root, 
        F_matrix, biq_bin_source_filepath, 
        max_cut_transformation_filepath
    )
    
    subprocess.run(f"rm -f {biq_bin_source_filepath}", shell=True, text=True)
    subprocess.run(f"rm -f {max_cut_transformation_filepath}", shell=True, text=True)

    log_file.close()
    sys.stdout = console_stdout

    for i in range(len(colour_remapping)):
        print(f"{i}>{colour_remapping[i]}", sep=" ")
    print("")    

