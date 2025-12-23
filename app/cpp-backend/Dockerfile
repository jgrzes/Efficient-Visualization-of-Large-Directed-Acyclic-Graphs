FROM ubuntu:22.04

RUN apt update \
    && apt install cmake -y \
    && apt install git -y \
    && apt install libgtest-dev -y
    
RUN apt install gdb -y \ 
    && apt install gcc -y \
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
    && apt install build-essential -y \
    && apt install libopenblas-dev -y

RUN apt install dos2unix -y

RUN apt install python3 -y \
    && apt install python3-pip --fix-missing -y \
    && pip install numpy gurobipy scipy pytest

RUN apt install octave -y \
    && apt install mpirun

WORKDIR /app

COPY . . 

RUN chmod +x /app/compile_project.sh \
    && chmod +x /app/run_project.sh

RUN find /app -type f -exec dos2unix {} +    

EXPOSE 30311
EXPOSE 30312
EXPOSE 30313
EXPOSE 30314
EXPOSE 30315    

CMD ["bash", "-it"]
