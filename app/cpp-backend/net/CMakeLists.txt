add_subdirectory(net_compiled_from_proto)

target_sources(
    EGVB PRIVATE
    Layout_Service.cpp Layout_Service.hpp
    serialized_message_processing.cpp serialized_message_processing.hpp
    Grpc_Layout_Service.cpp Grpc_Layout_Service.hpp
)

target_include_directories(
    EGVB PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}
    ${CMAKE_CURRENT_SOURCE_DIR}../data_structures
    ${CMAKE_CURRENT_SOURCE_DIR}../concurrency
    ${CMAKE_CURRENT_SOURCE_DIR}../algorithms
)