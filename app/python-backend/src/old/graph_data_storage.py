from typing import Dict, Any, List
from time import sleep
from queue import Queue
import graph_tool as gt
from threading import Lock, Thread
from uuid import uuid4, UUID
from typing import Optional 
from logging import Logger
from enum import Enum


class KeepaliveMessageType(Enum):
    INTERVAL = 1,
    VISIBLE = 2, 
    HIDDEN = 3,
    CLOSED = 4 

    @staticmethod
    def from_string(graph_display_state_str: str):
        if graph_display_state_str == "interval":
            return KeepaliveMessageType.INTERVAL
        elif graph_display_state_str == "visible":
            return KeepaliveMessageType.VISIBLE
        elif graph_display_state_str == "hidden":
            return KeepaliveMessageType.HIDDEN
        elif graph_display_state_str == "closed":
            return KeepaliveMessageType.CLOSED 
        else:
            raise Exception("Unknown graph display state")


# Setting `max_capacity` to a negative value will result in no limit in storing on RAM
class GraphDataStorage:
    DEFAULT_KEEPALIVE_MESSAGE_PROCESSOR_SLEEP_TIME_S = 5
    DEFAULT_MAX_NUM_OF_CYCLES_WITHOUT_KEEPALIVE = 5

    def __init__(
        self, max_capacity: int = -1, 
        keepalive_message_processor_sleep_time_s: int = DEFAULT_KEEPALIVE_MESSAGE_PROCESSOR_SLEEP_TIME_S, 
        max_num_of_cycles_without_keepalive: int = DEFAULT_MAX_NUM_OF_CYCLES_WITHOUT_KEEPALIVE, 
        logger: Optional[Logger] = None
    ):
        self.data_storage_running = True
        self.max_capacity = max_capacity
        self.graph_hashmap: Dict[str, Dict[str, Any]] = {}

        self.graph_cycles_without_keepalive_hashmap: Dict[str, int] = {}
        self.graph_visible: Dict[str, bool] = {}
        # self.graph_last_keepalive_date: Dict[str, ]
        
        self.keepalive_message_queue: Queue = Queue()
        self.graph_hashmap_mutex: Lock = Lock()
        self.keepalive_message_processor_sleep_time_s: int = keepalive_message_processor_sleep_time_s
        
        self.max_num_of_cycles_without_keepalive = max_num_of_cycles_without_keepalive
        self.logger: Optional[Logger] = logger
        self.keepalive_message_reader_thread: Thread = Thread(
            target=self._keepalive_message_processor_function
        )
        self.keepalive_message_reader_thread.start()
        

    def _keepalive_message_processor_function(self):
        try:
            while self.data_storage_running:
                graphs_to_prune_uuids: List[str] = []
                while not self.keepalive_message_queue.empty():
                    graph_uuid, datetime, event_type_str = self.keepalive_message_queue.get()
                    print(f"From queue: {graph_uuid}")
                    event_type = None
                    try:
                        event_type = KeepaliveMessageType.from_string(event_type_str)
                    except Exception as e: # TODO: Decide how to log errors here
                        print(f"Could not convert from: {event_type_str}, which is of type: {type(event_type_str)}")      

                    if graph_uuid in self.graph_cycles_without_keepalive_hashmap:
                        self.graph_cycles_without_keepalive_hashmap[graph_uuid] = -1

                        # TODO: Decide if mutex locking is neccessary here
                        if event_type == KeepaliveMessageType.CLOSED:
                            graphs_to_prune_uuids.append(graph_uuid)
                        elif event_type == KeepaliveMessageType.HIDDEN:
                            self.graph_visible[graph_uuid] = False 
                        elif event_type == KeepaliveMessageType.VISIBLE:
                            self.graph_visible[graph_uuid] = True   
                        print(f"Graph visible for {graph_uuid}: {self.graph_visible[graph_uuid]}")     

                self.graph_hashmap_mutex.acquire()
                for graph_uuid in self.graph_cycles_without_keepalive_hashmap:
                    if not self.graph_visible[graph_uuid]:
                        self.graph_cycles_without_keepalive_hashmap[graph_uuid] = 0
                    else:
                        self.graph_cycles_without_keepalive_hashmap[graph_uuid] += 1
                self.graph_hashmap_mutex.release()    

                self.graph_hashmap_mutex.acquire()
                for graph_uuid in graphs_to_prune_uuids:
                    if graph_uuid not in self.graph_hashmap:
                        continue
                    self.graph_hashmap.pop(graph_uuid)
                    self.graph_cycles_without_keepalive_hashmap.pop(graph_uuid)
                    self.graph_visible.pop(graph_uuid)
                self.graph_hashmap_mutex.release()

                current_graph_uuids = [uuid for uuid in self.graph_cycles_without_keepalive_hashmap.keys()]
                self.graph_hashmap_mutex.acquire()
                for graph_uuid in current_graph_uuids:
                    if (self.graph_cycles_without_keepalive_hashmap[graph_uuid] > self.max_num_of_cycles_without_keepalive) and self.graph_visible[graph_uuid]:
                        self.graph_hashmap.pop(graph_uuid)
                        self.graph_cycles_without_keepalive_hashmap.pop(graph_uuid)
                        self.graph_visible.pop(graph_uuid)
                self.graph_hashmap_mutex.release()    

                # TODO: Decide if, and if so how many, active uuids should be displated here.
                # TODO: Logger does not work here for whatever reason, maybe because __name__ != __main__
                print(
                    f"Active graph uuids: {[uuid for uuid in self.graph_cycles_without_keepalive_hashmap.keys()]}"
                )
                sleep(self.keepalive_message_processor_sleep_time_s)  
            else:
                print(f"Graph data storage running: {self.data_storage_running}")    

        except Exception as e:
            print(f"Exception in keepalive message processor: {e}")         


    def register_new_graph_data(self, graph_data: Dict[str, Any]):
        new_uuid = str(uuid4())
        self.graph_hashmap_mutex.acquire()
        self.graph_hashmap[new_uuid] = graph_data   
        self.graph_cycles_without_keepalive_hashmap[new_uuid] = 0
        self.graph_visible[new_uuid] = True
        self.graph_hashmap_mutex.release()
        return new_uuid


    def get_graph_data_for_id(self, uuid: str) -> Dict[str, Any]:
        self.graph_hashmap_mutex.acquire()
        if uuid not in self.graph_hashmap:
            raise RuntimeError(f"No graph data under uuid {uuid}")
        graph_data = self.graph_hashmap[uuid]
        self.graph_hashmap_mutex.release()
        return graph_data


    def delete_graph_data_for_id(self, uuid: str):
        if uuid not in self.graph_hashmap: return 
        self.graph_hashmap_mutex.acquire()
        self.graph_hashmap.pop(uuid)
        self.graph_cycles_without_keepalive_hashmap.pop(uuid)
        self.graph_visible.pop(uuid)
        self.graph_hashmap_mutex.release()