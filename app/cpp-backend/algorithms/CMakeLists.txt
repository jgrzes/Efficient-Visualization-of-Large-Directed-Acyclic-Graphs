target_sources(
    EGVB PRIVATE 
    algorithm_params_creation.cpp algorithm_params_creation.hpp 
    Graph_Colourer.cpp Graph_Colourer.h
    Layout_Drawer.cpp Layout_Drawer.h
)

target_include_directories(
    EGVB PRIVATE 
    ${CMAKE_CURRENT_SOURCE_DIR}
    ${CMAKE_CURRENT_SOURCE_DIR}/../utils
    ${CMAKE_CURRENT_SOURCE_DIR}/../data-structures
    ${CMAKE_CURRENT_SOURCE_DIR}/../graph-preprocessing
)