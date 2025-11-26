import sys
import os
from io import TextIOWrapper
from scipy import sparse
import numpy as np
from typing import Tuple, List
from collections import deque
import gurobipy as gurobi
from datetime import datetime

from stack import Stack
from colour_hierarchy_node import ColourHierarchyNode
from pretend_matrix import PretendMatrix, PretendMatrixMode


def read_colour_hierarchy_from_file(file: TextIOWrapper) -> Tuple[ColourHierarchyNode, int]:
    colour_hierarchy_stack = Stack()
    colour_hierarchy_root: ColourHierarchyNode = None
    current_indent = 0
    max_colour_index = -1
    while True:
        line = file.readline()
        if len(line) == 0:
            break 

        print("RCH line: ", line)
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
    col_count = int(row_count.strip())
    file.readline() # Reading empty seperator line
    
    F_dense_matrix = np.zeros((row_count, col_count))
    while True:
        line = file.readline()
        if line == "":
            break
        c1, c2, val = line.split(sep=" ")
        c1 = int(c1)
        c2 = int(c2)
        val = int(val.strip())
        F_dense_matrix[c1, c2] = val 
        F_dense_matrix[c2, c1] = val

    F_sparse_matrix = sparse.csr_matrix(F_dense_matrix)
    return F_sparse_matrix, row_count, col_count


def fill_colour_remapping_by_performing_qap(
    colour_remapping: List[int], 
    colour_hierarchy_root: ColourHierarchyNode, 
    F_matrix: sparse.csr_matrix
) -> None:

    Q = deque()
    Q.append(colour_hierarchy_root)

    colour_remapping[colour_hierarchy_root.colour] = 0
    x = 1

    while len(Q) > 0:
        node: ColourHierarchyNode = Q.popleft()
        number_of_children = len(node.children_nodes)
        if number_of_children <= 2: 
            continue
        
        if node.parent is None:
            F_for_subquestion = np.zeros((number_of_children, number_of_children))
            for i in range(number_of_children):
                a = node.children_nodes.colour
                for j in range(number_of_children):
                    b = node.children_nodes.colour
                    F_for_subquestion[i, j] = F_matrix[a, b]

            # D_for_subquestion = np.array(
            #     [[abs(i-j) for i in range(number_of_children)] for j in range(number_of_children)]
            # )    

            D_for_subquestion = PretendMatrix(
                mode=PretendMatrixMode.DYNAMIC_CALCULATION, 
                size=(number_of_children, number_of_children),
                dynamic_calculator=lambda i, j: abs(i-j)
            )
            
            model = gurobi.Model("QAP")
            x = model.addVars(
                number_of_children, number_of_children, 
                vtype=gurobi.GRB.BINARY, name="x"
            )

            objective = gurobi.quicksum(
                F_for_subquestion[i, j] * D_for_subquestion[k, l] * x[i, k] * x[j, l]
                for i in range(number_of_children)
                for j in range(number_of_children)
                for k in range(number_of_children)
                for l in range(number_of_children)
            )
            model.setObjective(objective, gurobi.GRB.MINIMIZE)

            for i in range(number_of_children):
                model.addConstr(
                    gurobi.quicksum(x[i, k] for k in range(number_of_children)) == 1
                )

            for k in range(number_of_children):
                model.addConstr(
                    gurobi.quicksum(x[i, k] for i in range(number_of_children)) == 1
                )    

            model.optimize()
            assignment = [(i, i) for i in range(number_of_children)]
            if model.Status == gurobi.GRB.OPTIMAL:
                assignment = [
                    (i, k) for i in range(number_of_children) for k in range(number_of_children)
                    if x[i, k].X > 0.5
                ]

            assignment.sort(key=lambda x: x[1])
            for i, _ in assignment.items():
                colour_remapping[node.children_nodes[i]] = x 
                x += 1    

        else:
            F_for_subquestion = np.zeros((number_of_children+2, number_of_children+2))
            for i in range(number_of_children):
                a = node.children_nodes.colour
                for j in range(number_of_children):
                    b = node.children_nodes.colour
                    F_for_subquestion[i, j] = F_matrix[a, b]

            D_for_subquestion = PretendMatrix(
                mode=PretendMatrixMode.DYNAMIC_CALCULATION, 
                size=(number_of_children+2, number_of_children+2), 
                dynamic_calculator=lambda i, j: abs(i-j)
            ) 

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

            model = gurobi.Model("QAP_with_linear")
            x = model.addVars(
                number_of_children, number_of_children, 
                vtype=gurobi.GRB.BINARY, name="x"
            )

            C = PretendMatrix(
                mode=PretendMatrixMode.DYNAMIC_CALCULATION, 
                size=(number_of_children+2, number_of_children+2), 
                dynamic_calculator=lambda x, k, n_=number_of_children: float("inf") if (
                    (x == n_ and k != 0) or (x == n_+1 and k != n_+1) 
                ) else 0
            )

            base_objective = gurobi.quicksum(
                F_for_subquestion[i, j] * D_for_subquestion[k, l] * x[i, k] * x[j, l]
                for i in range(number_of_children+2)
                for j in range(number_of_children+2)
                for k in range(number_of_children+2)
                for l in range(number_of_children+2)
            )

            linear_term = gurobi.quicksum(
                C[i, k] * x[i, k] + C[j, l] * x[j, l] 
                for i in range(number_of_children+2)
                for j in range(number_of_children+2)
                for k in range(number_of_children+2)
                for l in range(number_of_children+2)   
            )
            model.setObjective(base_objective + linear_term, gurobi.GRB.MINIMIZE)

            for i in range(number_of_children):
                model.addConstr(
                    gurobi.quicksum(x[i, k] for k in range(number_of_children+2)) == 1
                )

            for k in range(number_of_children):
                model.addConstr(
                    gurobi.quicksum(x[i, k] for i in range(number_of_children+2)) == 1
                )    

            model.optimize()
            assignment = [(i, i) for i in range(number_of_children+2)]
            if model.Status == gurobi.GRB.OPTIMAL:
                assignment = [
                    (i, k) for i in range(number_of_children+2) for k in range(number_of_children+2)
                    if x[i, k].X > 0.5
                ]

            assignment.sort(key=lambda x: x[1])
            for i, _ in assignment.items():
                if i >= number_of_children: continue
                colour_remapping[node.children_nodes[i]] = x 
                x += 1        

        node.children_nodes.sort(
            key=lambda x, cr_=colour_remapping: cr_[x.colour]
        )    

        for child in node.children_nodes:
            Q.append(child)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        raise Exception(
            f"No file with contents for qap specified"
        )
    
    console_stdout = sys.stdout
    log_file = open(
        f"{os.path.dirname(os.path.abspath(__file__))}/python_logs/log_temp.txt", "w"
    )
    sys.stdout = log_file

    # Printing out all file contents for debugging purposes
    file_path = sys.argv[1]
    with open(file_path, "r") as file:
        print(file.read())

    file = open(file_path, "r")
    colour_hierarchy_root, max_colour_index = read_colour_hierarchy_from_file(file)
    F_matrix, row_count, col_count = build_F_matrix(file)
    if row_count != col_count:
        raise RuntimeError(
            f"Matrix must be square, not of shape ({row_count}, {col_count})"
        )
    file.close()
    # D_matrix = build_D_matrix(row_count)
    colour_remapping = [i for i in range(max_colour_index+1)]

    log_file.close()
    sys.stdout = console_stdout

    for i in range(colour_remapping):
        print(f"{i}>{colour_remapping[i]}", sep=" ")
    print("")    