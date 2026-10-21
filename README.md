# RiskGuard — Real-Time Transaction Fraud Detection Pipeline

## Business problem

Fintechs need to flag suspicious transactions within milliseconds of authorization — fast enough to block or step-up-auth the transaction without adding noticeable latency for legitimate customers, and with enough context (similar past fraud cases) that a human analyst can review flagged transactions quickly.

## Architecture

```
React/TS dashboard --(REST, JWT)--> Node.js gateway --(gRPC)--> Python ML scoring service
                                          |                              |
                                          v                              v
                                    DynamoDB (flagged txns)     in-memory vector store
                                                                (similar-case lookup)
```

- **ml-service** (Python) trains an Isolation Forest anomaly-detection model on transaction features (amount, hour of day, distance from home) at startup, serves it over **gRPC**, exposes **Prometheus** metrics, and runs a lightweight **vector similarity search** over past transaction feature vectors to surface "similar past cases" for flagged transactions. Instrumented with **OpenTelemetry** tracing.
- **gateway** (Node.js/Express) is the polyglot bridge: it calls the Python service over gRPC using `@grpc/proto-loader` (no codegen needed), persists results to **DynamoDB**, and exposes a REST API secured by a JWT-based auth layer that stands in for **OAuth 2.0/OIDC** (swap in Azure AD/Auth0/Cognito without changing the route handlers).
- **dashboard** (React + **TypeScript**) is the analyst-facing UI: login, submit a transaction, and see risk scores, flags, and similar historical cases.

## Tech stack coverage

Python, TypeScript, Node.js, gRPC, PyTest-ready test scaffolding, OpenTelemetry, DynamoDB, OAuth 2.0/OIDC (JWT-based), Prometheus, Vector Search — plus the shared spine (Docker, REST APIs, microservices, CI/CD-ready).

## Running it locally

```bash
docker compose up --build
```

- Dashboard: http://localhost:3001
- Gateway API: http://localhost:4000
- ML service gRPC: localhost:50051, metrics at http://localhost:9100/metrics

Sign in with any username (mock auth), submit a few transactions with varying amounts, and watch high-amount/odd-hour transactions get flagged with a red highlight and linked "similar past cases."

## Running the ML service standalone (no Docker)

```bash
cd ml-service
pip install -r requirements.txt
python -m grpc_tools.protoc -I../proto --python_out=. --grpc_python_out=. ../proto/fraud.proto
python server.py
```

## Taking it further (what to mention in an interview)

- Replace the in-process Isolation Forest with a model trained offline on real transaction history and loaded from S3/SageMaker Model Registry, with a scheduled retraining job.
- Swap the in-memory vector store for a managed vector index (OpenSearch k-NN, pgvector, or a dedicated vector DB) so similarity search survives restarts and scales past one process.
- Point the OpenTelemetry exporter at a real collector (AWS X-Ray, Jaeger) to see the trace span from gateway → gRPC call → model inference in one view.
- Swap the JWT mock-login for a real OIDC provider — the `requireAuth` middleware contract (verified token → `req.user`) doesn't need to change.
