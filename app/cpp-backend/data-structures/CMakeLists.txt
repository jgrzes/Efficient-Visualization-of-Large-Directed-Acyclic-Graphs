target_sources(
    EGVB PRIVATE 
    # Array of arrays classes
    Array_of_Arrays.cpp Array_of_Arrays.h 
    Array_of_Arrays_View.cpp Array_of_Arrays_View.h 
    Array_of_Arrays_Interface.cpp Array_of_Arrays_Interface.h 
    # Graph classes
    Graph.cpp Graph.h 
    Coloured_Graph.cpp Coloured_Graph.h 
    Partially_Disabled_Graph.cpp Partially_Disabled_Graph.h 
    Graph_Interface.cpp Graph_Interface.h
)

target_include_directories(
    EGVB PRIVATE 
    ${CMAKE_CURRENT_SOURCE_DIR}
)