cmake_minimum_required(VERSION 3.10)
# Makes relative paths in cmake subdirs work properly, look at cmake --help-policy CMP0076
cmake_policy(SET CMP0076 NEW) 

# EGVB - Efficient Graph Visualizer Backend
project(EGVB LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED True)

# Creating the executable
add_executable(EGVB main.cpp)

# Adding libraries to the same executable
add_subdirectory(utils)
add_subdirectory(data-structures)
add_subdirectory(graph-preprocessing)
add_subdirectory(algorithms)

# Uncomment these two options if you want to check for double frees, memory corruptions etc.
# target_compile_options(EGVB PRIVATE -Wall -fsanitize=address,undefined -fno-omit-frame-pointer -g)
# target_link_options(EGVB PRIVATE -fsanitize=address,undefined)

# Otherwise use this 
target_compile_options(EGVB PRIVATE -Wall -g)