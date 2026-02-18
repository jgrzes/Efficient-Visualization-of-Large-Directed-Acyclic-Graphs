from typing import List, Optional


class ColourHierarchyNode:
    def __init__(self, colour: int, parent=None):
        self.colour: int = colour
        self.children_nodes: List[int] = []
        self.parent: ColourHierarchyNode = parent

    def add_child(self, child_colour: int) -> None:
        self.children_nodes.append(ColourHierarchyNode(child_colour, parent=self))

    def __str__(self) -> str:
        return f"<colour: {self.colour}, parent: {None if self.parent is None else self.parent.colour}>"

    def __repr__(self) -> str:
        return self.__str__()
