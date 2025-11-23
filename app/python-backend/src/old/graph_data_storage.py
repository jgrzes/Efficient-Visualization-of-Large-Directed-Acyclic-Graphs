from typing import Dict, Any
import graph_tool as gt
from threading import Lock
from uuid import uuid4, UUID

# Setting `max_capacity` to a negative value will result in no limit in storing on RAM
class GraphDataStorage:
    def __init__(self, max_capacity: int = -1):
        self.max_capacity = max_capacity
        self.graph_hashmap: Dict[str, Dict[str, Any]] = {}

        self.graph_hashmap_mutex: Lock = Lock()


    def register_new_graph_data(self, graph_data: Dict[str, Any]):
        new_uuid = str(uuid4())
        self.graph_hashmap_mutex.acquire()
        self.graph_hashmap[new_uuid] = graph_data   
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
        self.graph_hashmap_mutex.release()