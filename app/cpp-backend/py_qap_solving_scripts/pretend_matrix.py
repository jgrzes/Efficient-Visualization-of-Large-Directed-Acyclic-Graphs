from typing import Callable, Optional, Any, Dict, Tuple
from enum import Enum

class PretendMatrixMode(Enum):
    DYNAMIC_CALCULATION = 1, 
    UNIFORM = 2


class PretendMatrix:
    def __init__(self, mode: PretendMatrixMode, **kwargs):
        self.mode = mode 
        self.dynamic_calculator: Optional[Callable[[int, int], Any]] = None
        self.default_value: Optional[Any] = None
        self.except_fields: Dict[Tuple[int, int], Any] = {}

        self.size = (float("inf"), float("inf")) # Infinite in size by default
        if "size" in kwargs:
            self.size = kwargs["size"]

        if mode == PretendMatrixMode.DYNAMIC_CALCULATION:
            if "dynamic_calculator" not in kwargs:
                raise RuntimeError(
                    f"Pretend matrix in dynamic calculator mode needs a callable at `dynamic_calculator` flag argument"
                )
            self.dynamic_calculator = kwargs["dynamic_calculator"]
        elif mode == PretendMatrixMode.UNIFORM:
            if "default_value" not in kwargs:
                raise RuntimeError(
                    f"Pretend matrx in uniform mode needs a default value"
                )    
            self.default_value = kwargs["default_value"]
            if "except_cells_dict" in kwargs:
                self.except_fields = kwargs["except_cells_dict"]


    def __getitem__(self, i: int, j: int) -> Any:
        if self.mode == PretendMatrixMode.DYNAMIC_CALCULATION:
            return self.dynamic_calculator(i, j)
        else:
            if (i, j) in self.except_fields:
                return self.except_fields[(i, j)]

            return self.default_value


    def __setitem__(self, i: int, j: int, val: Any) -> None:
        if self.mode == PretendMatrixMode.DYNAMIC_CALCULATION: return 
        else:
            self.except_fields[(i, j)] = val                  

