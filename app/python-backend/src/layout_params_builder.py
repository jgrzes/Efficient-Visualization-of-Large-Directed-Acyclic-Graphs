import math
from dataclasses import dataclass

import graph_tool as gt

from graph_analysis import analyze_dag_basic, compute_hierarchy_levels
from layout_presets import (
    GraphColourerParams,
    LayoutDrawerParams,
    LayoutPreset,
)


@dataclass(frozen=True)
class GraphCharacteristics:
    num_vertices: int
    num_edges: int

    avg_out_degree: float
    max_out_degree: int

    num_roots: int
    num_leaves: int

    max_depth: int
    max_level_width: int


def clamp(
    value: float,
    minimum: float,
    maximum: float,
) -> float:
    return max(minimum, min(value, maximum))


def lerp(
    minimum: float,
    maximum: float,
    t: float,
) -> float:
    """
    Linear interpolation.

    t = 0.0 -> minimum
    t = 1.0 -> maximum
    """
    return minimum + (maximum - minimum) * t


def calculate_graph_characteristics(
    graph: gt.Graph,
) -> GraphCharacteristics:
    basic = analyze_dag_basic(graph)
    levels = compute_hierarchy_levels(graph)

    max_depth = max(levels.keys(), default=0)
    max_level_width = max(levels.values(), default=0)

    return GraphCharacteristics(
        num_vertices=basic["n_vertices"],
        num_edges=basic["n_edges"],
        avg_out_degree=basic["out_degree"]["avg"],
        max_out_degree=basic["out_degree"]["max"],
        num_roots=basic["roots"]["count"],
        num_leaves=basic["sinks"]["count"],
        max_depth=max_depth,
        max_level_width=max_level_width,
    )


def calculate_graph_size_score(
    characteristics: GraphCharacteristics,
) -> float:
    """
    Calculate normalized graph size in range [0, 1].

    Around 100 000 vertices the score reaches 1.0.
    Logarithmic scaling prevents large graphs from dominating the metric.
    """

    return clamp(
        math.log1p(characteristics.num_vertices)
        / math.log1p(100_000),
        0.0,
        1.0,
    )


def calculate_layout_params(
    characteristics: GraphCharacteristics,
    size_score: float,
) -> LayoutPreset:

    box_width_coeff = lerp(
        2.0,
        4.0,
        size_score,
    )

    min_level_distance = lerp(
        6.0,
        14.0,
        size_score,
    )

    nested_colour_child_padding = lerp(
        0.3,
        0.5,
        size_score,
    )

    noise_interval_width_percentage = lerp(
        0.02,
        0.05,
        size_score,
    )

    return LayoutPreset(
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

            box_width_coeff=box_width_coeff,
            noise_interval_width_percentage=(
                noise_interval_width_percentage
            ),

            nested_colour_child_padding=(
                nested_colour_child_padding
            ),
            min_required_distance_between_adjacent_levels=(
                min_level_distance
            ),
        ),
    )

def build_layout_params(
    graph: gt.Graph,
) -> LayoutPreset:
    characteristics = calculate_graph_characteristics(graph)

    size_score = calculate_graph_size_score(
        characteristics
    )

    params = calculate_layout_params(
        characteristics,
        size_score,
    )

    return params