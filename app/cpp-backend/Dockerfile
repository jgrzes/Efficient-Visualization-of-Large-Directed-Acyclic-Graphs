FROM ubuntu:22.04

RUN apt update \
    && apt install cmake -y \
    && apt install git -y 
    
RUN apt install gdb -y \ 
    && apt install g++ -y \
    && apt install libboost-all-dev -y

RUN apt install protobuf-compiler -y \
    && apt install libprotobuf-dev -y 

RUN apt install protobuf-compiler-grpc -y \
    && apt install libgrpc++-dev -y 

WORKDIR /app

COPY . . 

EXPOSE 30311
EXPOSE 30312
EXPOSE 30313
EXPOSE 30314
EXPOSE 30315    

CMD ["bash", "-it"]
