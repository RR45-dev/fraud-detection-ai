# Build context is the project root (see docker-compose.yml: context: ., dockerfile: ml-service/Dockerfile)
# so this can COPY the shared proto/ directory alongside the service code.
FROM python:3.11-slim
WORKDIR /app

COPY ml-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY proto/fraud.proto ./fraud.proto
RUN python -m grpc_tools.protoc -I. --python_out=. --grpc_python_out=. fraud.proto

COPY ml-service/model.py ml-service/vector_store.py ml-service/server.py ./

EXPOSE 50051 9100
CMD ["python", "server.py"]
