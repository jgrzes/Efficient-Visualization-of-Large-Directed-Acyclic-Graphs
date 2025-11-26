target_sources(
    EGVB PRIVATE
    py_to_cpp_backend.grpc.pb.cc py_to_cpp_backend.grpc.pb.h 
    py_to_cpp_backend.pb.cc py_to_cpp_backend.pb.h
)

target_include_directories(
    EGVB PRIVATE 
    ${CMAKE_CURRENT_SOURCE_DIR}
)