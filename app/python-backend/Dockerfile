# create the image from inside backend directory

FROM tiagopeixoto/graph-tool:latest

WORKDIR /app 

COPY . . 

RUN python3 -m venv /opt/.venv --system-site-packages && \ 
    /opt/.venv/bin/pip install --upgrade pip && \
    /opt/.venv/bin/pip install -r requirements.txt 

# RUN pacman -Syu --noconfirm protobuf \
#     && pacman -Scc --noconfirm

ENV PATH="/opt/.venv/bin:$PATH"

# RUN ls /app/src/net | grep net-compiled || mkdir /app/src/net/net-compiled \
# RUN mkdir -p /app/src/net/net-compiled \
#     && python -m grpc_tools.protoc -I. \
#     && --python_out=/app/src/net/net-compiled/ \
#     && --grpc_python_out=/app/src/net/net-compiled/ \
#     && /app/src/proto/cpp_to_py_backend.proto

EXPOSE 30301
EXPOSE 30302
EXPOSE 30303
EXPOSE 30304
EXPOSE 30305

CMD ["bash", "-it"]
