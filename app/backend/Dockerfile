# create the image from inside backend directory

FROM tiagopeixoto/graph-tool:latest

WORKDIR /app

COPY . .

RUN python3 -m venv /opt/.venv --system-site-packages && \
    /opt/.venv/bin/pip install --upgrade pip && \
    /opt/.venv/bin/pip install -r requirements.txt

ENV PATH="/opt/.venv/bin:$PATH"

EXPOSE 30301
EXPOSE 30302
EXPOSE 30303
EXPOSE 30304
EXPOSE 30305

CMD ["bash", "-it"]
CMD ["python3", "src/flask_backend_server.py"]
