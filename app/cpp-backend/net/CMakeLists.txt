set(PROTO_FILE
    ${CMAKE_CURRENT_SOURCE_DIR}/../../proto/py_to_cpp_backend.proto
)

set(PROTO_GENERATED_DIR
    ${CMAKE_CURRENT_BINARY_DIR}/generated
)

file(MAKE_DIRECTORY ${PROTO_GENERATED_DIR})

find_program(PROTOC_EXECUTABLE protoc REQUIRED)
find_program(GRPC_CPP_PLUGIN grpc_cpp_plugin REQUIRED)

set(PROTO_SRCS
    ${PROTO_GENERATED_DIR}/py_to_cpp_backend.pb.cc
    ${PROTO_GENERATED_DIR}/py_to_cpp_backend.grpc.pb.cc
)

set(PROTO_HDRS
    ${PROTO_GENERATED_DIR}/py_to_cpp_backend.pb.h
    ${PROTO_GENERATED_DIR}/py_to_cpp_backend.grpc.pb.h
)

add_custom_command(
    OUTPUT
        ${PROTO_SRCS}
        ${PROTO_HDRS}

    COMMAND ${PROTOC_EXECUTABLE}
        --proto_path=${CMAKE_CURRENT_SOURCE_DIR}/../../proto
        --cpp_out=${PROTO_GENERATED_DIR}
        --grpc_out=${PROTO_GENERATED_DIR}
        --plugin=protoc-gen-grpc=${GRPC_CPP_PLUGIN}
        ${PROTO_FILE}

    DEPENDS
        ${PROTO_FILE}

    COMMENT "Generating protobuf and gRPC C++ sources"
)

add_library(
    grpc_generated
    STATIC
    ${PROTO_SRCS}
    ${PROTO_HDRS}
)

target_include_directories(
    grpc_generated
    PUBLIC
    ${PROTO_GENERATED_DIR}
)

target_link_libraries(
    grpc_generated
    PUBLIC
    grpc++
    grpc
    protobuf
)


target_sources(
    EGVB PRIVATE
    Layout_Service.cpp
    Layout_Service.hpp
    serialized_message_processing.cpp
    serialized_message_processing.hpp
    Grpc_Layout_Service.cpp
    Grpc_Layout_Service.hpp
)

target_include_directories(
    EGVB PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}
    ${PROTO_GENERATED_DIR}
    ${CMAKE_CURRENT_SOURCE_DIR}/../data-structures
    ${CMAKE_CURRENT_SOURCE_DIR}/../concurrency
    ${CMAKE_CURRENT_SOURCE_DIR}/../algorithms
)
