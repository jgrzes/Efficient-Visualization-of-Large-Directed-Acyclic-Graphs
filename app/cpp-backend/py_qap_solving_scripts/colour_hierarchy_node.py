from typing import List, Optional

class ColourHierarchyNode:
    def __init__(self, colour: int, parent = None):
        self.colour: int = colour
        self.children_nodes: List[int] = []
        self.parent: ColourHierarchyNode = parent


    def add_child(self, child_colour: int) -> None:
        self.children_nodes.append(ColourHierarchyNode(child_colour, parent=self))    