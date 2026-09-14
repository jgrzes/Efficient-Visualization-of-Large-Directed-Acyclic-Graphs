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
class LayoutPreset:
    graph_colourer: GraphColourerParams
    layout_drawer: LayoutDrawerParams

def layout_preset_to_proto(preset: LayoutPreset) -> py_to_cpp_backend_pb2.LayoutParams:
    return py_to_cpp_backend_pb2.LayoutParams(
        graph_colourer=py_to_cpp_backend_pb2.GraphColourerParams(
            d_edges_threshold_coeff=preset.graph_colourer.d_edges_threshold_coeff,
            min_cum_count_of_vertices=preset.graph_colourer.min_cum_count_of_vertices,
            merge_common_vertices_threshold=preset.graph_colourer.merge_common_vertices_threshold,
            min_number_of_vertices_at_starting_level=preset.graph_colourer.min_number_of_vertices_at_starting_level,
        ),
        layout_drawer=py_to_cpp_backend_pb2.LayoutDrawerParams(
            x_interspring_weight=preset.layout_drawer.x_interspring_weight,
            x_interspring_power=preset.layout_drawer.x_interspring_power,
            interspring_upwards_transfer_coeff=preset.layout_drawer.interspring_upwards_transfer_coeff,
            box_width_coeff=preset.layout_drawer.box_width_coeff,
            noise_interval_width_percentage=preset.layout_drawer.noise_interval_width_percentage,
            nested_colour_child_padding=preset.layout_drawer.nested_colour_child_padding,
            min_required_distance_between_adjacent_levels=preset.layout_drawer.min_required_distance_between_adjacent_levels,
        ),
    )

DEFAULT_PRESET = LayoutPreset(
    graph_colourer=GraphColourerParams(
        d_edges_threshold_coeff=3,
        min_cum_count_of_vertices=3,
        merge_common_vertices_threshold=3,
        min_number_of_vertices_at_starting_level=3,
    ),
    layout_drawer=LayoutDrawerParams(
        x_interspring_weight=3.0,
        x_interspring_power=1.0,
        interspring_upwards_transfer_coeff=0.75,
        box_width_coeff=3.0,
        noise_interval_width_percentage=0.04,
        nested_colour_child_padding=0.4,
        min_required_distance_between_adjacent_levels=10.0,
    ),
)