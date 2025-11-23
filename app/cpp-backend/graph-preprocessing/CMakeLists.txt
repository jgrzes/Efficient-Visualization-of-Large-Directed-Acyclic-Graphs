target_sources(
    EGVB PRIVATE 
    assign_levels.cpp assign_levels.h 
    edge_and_vertex_processing_functions.cpp edge_and_vertex_processing_functions.h
)

target_include_directories(
    EGVB PRIVATE 
    ${CMAKE_CURRENT_SOURCE_DIR}
    ${CMAKE_CURRENT_SOURCE_DIR}/../data-structures
)