import pymongo

class MongoDatabaseManager:
    def __init__(self, db_uri: str, db_name: str):
        self.client_handle = pymongo.MongoClient(db_uri)
        self.db = self.client_handle[db_name]


        