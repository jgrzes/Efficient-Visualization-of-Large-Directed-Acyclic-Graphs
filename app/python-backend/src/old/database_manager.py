import pymongo
from bson.objectid import ObjectId
from typing import Dict, List, Tuple, Optional, Union, Any
import json
import graph_tool as gt

LayoutT = List[Tuple[float, float]]

class DatabaseManager:
    DB_NAME = "dagmara"
    GRAPH_DATA_COLLECTION_NAME = "graph_data"

    def __init__(self, db_uri: str):
        self.mongo_client_handle = pymongo.MongoClient(db_uri)
        self.db = self.mongo_client_handle[self.DB_NAME]
        self.graph_data_collection = self.db[self.GRAPH_DATA_COLLECTION_NAME]

    def fetch_graph_data(self, graph_id: Union[ObjectId, str]) -> Dict:
        if isinstance(graph_id, str):
            graph_id = ObjectId(graph_id)
        sought_graph_data = self.graph_data_collection.find_one({
            "_id": graph_id
        })

        return sought_graph_data
    
    def push_new_entry(
        self, name: str, G: gt.Graph, 
        layout: Optional[LayoutT], vertices_text_data: List[Tuple[str, str]]
    ) -> str:
        n = G.num_vertices()
        result = self.graph_data_collection.insert_one({
            "name": name, 
            "num_of_vertices": n, 
            "vertices": [
                {
                    "index": i, 
                    "name": vertices_text_data[i][0], 
                    "description": vertices_text_data[i][1], 
                    "neighbours": G.get_out_neighbors(i), 
                    "pos_in_layout": list(layout[i]) if layout is not None else 0
                } for i in range(0, n)
            ]
        })

        return str(result.inserted_id)

    def update_entry(self, graph_id: Union[ObjectId, str], new_vals: Dict) -> None:
        if isinstance(graph_id, str):
            graph_id = ObjectId(graph_id)

        self.graph_data_collection.update_one(
            {"_id": graph_id}, 
            self._build_update_dict(new_vals)
        )

    def _build_update_dict(self, new_vals: Dict) -> Dict:
        update_dict: Dict[str, Any] = {"$set": {}}
        if "name" in new_vals:
            update_dict["$set"]["name"] = new_vals["name"]
        
        if "vertices" in new_vals:
            vertices_updates_list = new_vals["vertices"]
            n = len(vertices_updates_list)
            for i in range(0, n):
                vertex_index, vertex_update_list = vertices_updates_list[i]
                for field, new_val in vertex_update_list:
                    if field not in {"name", "description", "pos_in_layout"}:
                        raise RuntimeError(
                            "For a vertex only name, description and layout position can be updated after creation"
                        )
                    
                    update_dict["$set"][f"vertices.{vertex_index}.{field}"] = new_val 

        return update_dict


    def delete_entry(self, graph_id: Union[ObjectId, str]) -> None:
        if isinstance(graph_id, str):
            graph_id = ObjectId(graph_id)
        self.graph_data_collection.delete_one({"_id": graph_id})           