# set(PREFIX ${CMAKE_CURRENT_SOURCE_DIR})

# Adding target sources
target_sources(
    EGVB PRIVATE
    # ${PREFIX}/traits.cpp ${PREFIX}/traits.h
    traits.cpp traits.h
    Counting_Allocator.cpp Counting_Allocator.h
    input_generation_for_qap.cpp input_generation_for_qap.h
)

# Exposing this directory to the include collection
target_include_directories(
    EGVB PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}
)