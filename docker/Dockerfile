FROM tiagopeixoto/graph-tool:latest

WORKDIR /app

COPY . .

RUN python3 -m venv /opt/venv --system-site-packages && \
    /opt/venv/bin/pip install --upgrade pip && \
    /opt/venv/bin/pip install -r requirements.txt

ENV PATH="/opt/venv/bin:$PATH"

CMD ["python", "app/main.py"]