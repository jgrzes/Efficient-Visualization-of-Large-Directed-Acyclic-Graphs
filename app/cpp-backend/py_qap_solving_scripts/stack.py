from typing import Any, List, TypeVar


class Stack:
    def __init__(self):
        self.stack: List[Any] = []

    def emplace(self, new_element: Any) -> None:
        self.stack.append(new_element)

    def peek_top(self) -> Any:
        return self.stack[-1]

    def pop(self) -> Any:
        return self.stack.pop()

    def empty(self) -> None:
        self.stack = []

    def is_empty(self) -> bool:
        return len(self.stack) > 0
