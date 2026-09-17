from dataclasses import dataclass

import py_to_cpp_backend_pb2


@dataclass(frozen=True)
class GraphColourerParams:
    d_edges_threshold_coeff: int
    min_cum_count_of_vertices: int
    merge_common_vertices_threshold: int
    min_number_of_vertices_at_starting_level: int


@dataclass(frozen=True)
class LayoutDrawerParams:
    x_interspring_weight: float
    x_interspring_power: float
    interspring_upwards_transfer_coeff: float

    box_width_coeff: float
    noise_interval_width_percentage: float

    nested_colour_child_padding: float
    min_required_distance_between_adjacent_levels: float


@dataclass(frozen=True)
class LayoutTuningParams:
    graph_colourer: GraphColourerParams
    layout_drawer: LayoutDrawerParams


def layout_params_to_proto(
    params: LayoutTuningParams,
) -> py_to_cpp_backend_pb2.LayoutParams:
    return py_to_cpp_backend_pb2.LayoutParams(
        graph_colourer=py_to_cpp_backend_pb2.GraphColourerParams(
            d_edges_threshold_coeff=params.graph_colourer.d_edges_threshold_coeff,
            min_cum_count_of_vertices=params.graph_colourer.min_cum_count_of_vertices,
            merge_common_vertices_threshold=params.graph_colourer.merge_common_vertices_threshold,
            min_number_of_vertices_at_starting_level=params.graph_colourer.min_number_of_vertices_at_starting_level,
        ),
        layout_drawer=py_to_cpp_backend_pb2.LayoutDrawerParams(
            x_interspring_weight=params.layout_drawer.x_interspring_weight,
            x_interspring_power=params.layout_drawer.x_interspring_power,
            interspring_upwards_transfer_coeff=params.layout_drawer.interspring_upwards_transfer_coeff,
            box_width_coeff=params.layout_drawer.box_width_coeff,
            noise_interval_width_percentage=params.layout_drawer.noise_interval_width_percentage,
            nested_colour_child_padding=params.layout_drawer.nested_colour_child_padding,
            min_required_distance_between_adjacent_levels=params.layout_drawer.min_required_distance_between_adjacent_levels,
        ),
    )
