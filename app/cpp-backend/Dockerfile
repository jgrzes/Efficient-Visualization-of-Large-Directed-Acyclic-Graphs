FROM ubuntu:22.04

RUN apt update \
    && apt install cmake -y \
    && apt install git -y \
    && apt install libgtest-dev -y
    
RUN apt install gdb -y \ 
    && apt install g++ -y \
    && apt install libboost-all-dev -y

RUN apt install protobuf-compiler -y \
    && apt install libprotobuf-dev -y 

RUN apt install protobuf-compiler-grpc -y \
    && apt install libgrpc++-dev -y 

WORKDIR /app

RUN ls /app/net | grep net-compiled || mkdir /app/net/net-compiled

RUN protoc -I=. --cpp_out=/app/net/net-compiled/ /app/proto/cpp_to_py_backend.proto 

RUN chmod +x "$(which grpc_cpp_plugin)"

RUN protoc -I=. --grpc_out=/app/net/net-compiled/ --plugin=protoc-gen-grpc="$(which grpc_cpp_plugin)" /app/proto/cpp_to_py_backend.proto 

COPY . . 

EXPOSE 30311
EXPOSE 30312
EXPOSE 30313
EXPOSE 30314
EXPOSE 30315    

CMD ["bash", "-it"]
