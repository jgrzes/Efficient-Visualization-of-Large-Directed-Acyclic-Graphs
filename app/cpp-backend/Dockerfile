FROM ubuntu:22.04

RUN apt update \
    && apt install cmake -y \
    && apt install git -y \
    && apt install libgtest-dev -y
    
RUN apt install gdb -y \ 
    && apt install g++ -y \
    && apt install libboost-all-dev -y

RUN apt install autoconf -y \
    && apt install libtool -y \
    && apt install pkg-config -y

RUN apt install protobuf-compiler -y \
    && apt install libprotobuf-dev -y 

RUN apt install protobuf-compiler-grpc -y \
    && apt install libgrpc-dev -y \
    && apt install libgrpc++-dev -y \
    && apt install build-essential -y

RUN apt install dos2unix -y

RUN chmod u+x /app/compile_project.sh \
    && chmod u+x /app/run_project.sh

RUN apt install python3 -y \
    && apt install python3-pip -y \
    && pip install numpy gurobipy scipy -y

WORKDIR /app

COPY . . 

# RUN ls /app/net | grep net-compiled || mkdir /app/net/net-compiled
    
# RUN mkdir -p /app/net/net-compiled

# RUN protoc -I=. --cpp_out=/app/net/net-compiled/ /app/proto/cpp_to_py_backend.proto 

# RUN chmod +x "$(which grpc_cpp_plugin)"

# RUN protoc -I=. --grpc_out=/app/net/net-compiled/ --plugin=protoc-gen-grpc="$(which grpc_cpp_plugin)" /app/proto/cpp_to_py_backend.proto 

EXPOSE 30311
EXPOSE 30312
EXPOSE 30313
EXPOSE 30314
EXPOSE 30315    

CMD ["bash", "-it"]
