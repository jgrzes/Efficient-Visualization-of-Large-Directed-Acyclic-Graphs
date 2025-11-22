import socket 
import graph_tool as gt 
from typing import List, Tuple 
from random import uniform
from copy import copy
import threading

LayoutPositionsT = List[Tuple[float, float]]
MAX_CHUNK_LENGTH = 900 # For now
# TODO: Should probably try switching to:
# MAX_UINT16_T_IN_CPP = np.iinfo(np.uint16).max
MAX_UINT16_T_IN_CPP = 65_530 

class ThinStringWrapper:
    def __init__(self, thread_safe_req: bool = True):
        self.string = ""
        self.mutex = threading.Lock()

    def append_to_string(self, new_data: str):    
        self.

class ThinBoolWrapper:
    def __init__(self, initial_val: bool):
        self.boolean_flag = initial_val


def generate_random_graph_id_between(low: int = 0, high: int = MAX_UINT16_T_IN_CPP):
    random_graph_id = uniform(low, high)
    return random_graph_id


def continuously_read_from_socket(server_socket: socket.socket, dest: ThinStringWrapper, keep_receiving: ThinBoolWrapper):
    default_wait_time_in_sec = 2
    server_socket.settimeout(default_wait_time_in_sec)
    while True:
        recv_bytes = server_socket.recv(1024)
        dest.    


def create_layout_position_array(server_socket: socket.socket, n: int) -> LayoutPositionsT:
    layout_positions: LayoutPositionsT = [None for _ in range (n)]
    extraction_function = 


def request_graph_layout_computation(
    G_gt: gt.Graph, server_ip_addr: str, server_port: int
) -> LayoutPositionsT:
    
    global MAX_CHUNK_LENGTH
    middle_part_length = len(" is_final=false ")
    graph_id = generate_random_graph_id_between(low=0, high=MAX_UINT16_T_IN_CPP)
    
    initial_message_head = f"graph_id={graph_id}"
    initial_message_tail = f"n={n}" + "E={"

    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as server_socket:
        server_socket.connect((server_ip_addr, server_port))
        n = G_gt.num_vertices()
        current_message_head = copy(initial_message_head)
        current_message_tail = copy(initial_message_tail)
        for u in range(n):
            Nu = G_gt.get_out_neighbors(G_gt.vertex(u))
            if initial_message_tail != "{":
                current_message_tail += " "
            current_message_tail += f"{u}:["
            for j in range (len(Nu)):
                v = int(Nu[j])
                if len(current_message_head) + len(current_message_tail) + middle_part_length + len(f",{v}" + "}") > MAX_CHUNK_LENGTH-1:
                    message_to_be_sent = f"|{current_message_head} is_final=false {current_message_tail+"}"}|"
                    server_socket.sendall(message_to_be_sent)
                    current_message_head = copy(initial_message_head)
                    current_message_tail = copy(initial_message_tail)

                current_message_tail += f",{v}"  
            current_message_tail += "]"


        current_message_tail += "}"
        message_to_be_sent = f"|{current_message_head}| is_final=true {current_message_tail}|"
        server_socket.sendall(message_to_be_sent)
            


