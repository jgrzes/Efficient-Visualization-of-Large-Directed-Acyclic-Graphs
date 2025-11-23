target_sources(
    EGVB PRIVATE 
    boost_logging.cpp boost_logging.hpp
)

target_include_directories(
    EGVB PRIVATE 
    ${CMAKE_CURRENT_SOURCE_DIR}
)