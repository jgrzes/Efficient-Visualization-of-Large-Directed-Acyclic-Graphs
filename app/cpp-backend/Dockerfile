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
    && apt install build-essential -y \
    && apt install libopenblas-dev -y

RUN apt install dos2unix -y

RUN apt install python3 -y \
    && apt install python3-pip -y \
    && pip install numpy gurobipy scipy pytest

RUN apt install octave -y \
    && apt install mpirun

RUN pip3 install --no-cache-dir numpy gurobipy scipy

WORKDIR /app
COPY . .

RUN find /app -type f -exec dos2unix {} + && \
    chmod +x /app/compile_project.sh /app/run_project.sh

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 30311 30312 30313 30314 30315

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]