from typing import Dict, Any
from time import sleep
from queue import Queue
import graph_tool as gt
from threading import Lock, Thread
from uuid import uuid4, UUID
from typing import Optional 
from logging import Logger

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
        while self.data_storage_running:
            while not self.keepalive_message_queue.empty():
                graph_uuid, datetime = self.keepalive_message_queue.get()
                if graph_uuid in self.graph_cycles_without_keepalive_hashmap:
                    self.graph_cycles_without_keepalive_hashmap[graph_uuid] = -1

            for graph_uuid in self.graph_cycles_without_keepalive_hashmap:
                self.graph_cycles_without_keepalive_hashmap[graph_uuid] += 1

            current_graph_uuids = [uuid for uuid in self.graph_cycles_without_keepalive_hashmap.keys()]
            self.graph_hashmap_mutex.acquire()
            for graph_uuid in current_graph_uuids:
                if self.graph_cycles_without_keepalive_hashmap[graph_uuid] > self.max_num_of_cycles_without_keepalive:
                    self.graph_hashmap.pop(graph_uuid)
                    self.graph_cycles_without_keepalive_hashmap.pop(graph_uuid)
            self.graph_hashmap_mutex.release()    

            # TODO: Decide if, and if so how many, active uuids should be displated here.
            # TODO: Logger does not work here for whatever reason, maybe because __name__ != __main__
            # if self.logger is not None: print(
            #     f"Active graph uuids: {[uuid for uuid in self.graph_cycles_without_keepalive_hashmap.keys()]}"
            # )
            sleep(self.keepalive_message_processor_sleep_time_s)   


    def register_new_graph_data(self, graph_data: Dict[str, Any]):
        new_uuid = str(uuid4())
        self.graph_hashmap_mutex.acquire()
        self.graph_hashmap[new_uuid] = graph_data   
        self.graph_cycles_without_keepalive_hashmap[new_uuid] = 0
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
        self.graph_hashmap_mutex.release()