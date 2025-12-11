import numpy as np
from pretend_matrix import PretendMatrix, PretendMatrixMode
from typing import Tuple, List, Optional


# Returns tuple (remapping, was_successful)
def primitive_try_qap_solve(
    F_matrix: np.ndarray, D_matrix: PretendMatrix
) -> Tuple[Optional[List[int]], bool]:
    
    return None, False


def primitve_try_qap_solve_with_borders_fixed(
    F_matrix: np.ndarray, D_matrix: PretendMatrix
) -> Tuple[Optional[List[int]], bool]:
    
    return None, False