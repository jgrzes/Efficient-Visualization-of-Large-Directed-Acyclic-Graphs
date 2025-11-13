target_sources(
    EGVB PRIVATE 
    Thread_Pool.cpp Thread_Pool.hpp
)

target_include_directories(
    EGVB PRIVATE 
    ${CMAKE_CURRENT_SOURCE_DIR}
)