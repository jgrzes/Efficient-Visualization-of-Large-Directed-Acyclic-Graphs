FROM tiagopeixoto/graph-tool:latest

WORKDIR /app
COPY python-backend /app
COPY proto /proto

RUN python3 -m venv /opt/.venv --system-site-packages && \
    /opt/.venv/bin/pip install --upgrade pip && \
    /opt/.venv/bin/pip install -r requirements.txt
    
RUN mkdir -p /opt/generated-proto && \
    /opt/.venv/bin/python -m grpc_tools.protoc \
        -I /proto \
        --python_out=/opt/generated-proto \
        --grpc_python_out=/opt/generated-proto \
        /proto/py_to_cpp_backend.proto

ENV PATH="/opt/.venv/bin:$PATH"
ENV PYTHONUNBUFFERED=1

WORKDIR /app/src

EXPOSE 30301 30302 30303 30304 30305

CMD ["sh", "-c", "exec gunicorn --workers ${GUNICORN_WORKERS:-2} --timeout ${GUNICORN_TIMEOUT:-1200} --bind ${SERVICE_IP_ADDRESS:-0.0.0.0}:${SERVICE_PORT:-30301} flask_layout_service:app"]
