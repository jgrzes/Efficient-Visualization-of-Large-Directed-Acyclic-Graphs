FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    cmake git libgtest-dev gdb g++ libboost-all-dev \
    autoconf libtool pkg-config \
    protobuf-compiler libprotobuf-dev \
    protobuf-compiler-grpc libgrpc-dev libgrpc++-dev \
    build-essential \
    dos2unix \
    python3 python3-pip \
    && rm -rf /var/lib/apt/lists/*

RUN pip3 install --no-cache-dir numpy gurobipy scipy

WORKDIR /app
COPY . .

RUN find /app -type f -exec dos2unix {} + && \
    chmod +x /app/compile_project.sh /app/run_project.sh

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 30311 30312 30313 30314 30315

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
