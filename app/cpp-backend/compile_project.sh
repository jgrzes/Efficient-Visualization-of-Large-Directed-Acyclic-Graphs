build_dir="build"

export CMAKE_PREFIX_PATH=/usr/local:$CMAKE_PREFIX_PATH
cmake -S . -B ${build_dir}
cmake --build ${build_dir}