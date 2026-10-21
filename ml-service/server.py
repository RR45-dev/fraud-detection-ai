import logging
import time
from concurrent import futures

import grpc
from prometheus_client import start_http_server, Counter, Histogram
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter

import fraud_pb2
import fraud_pb2_grpc
from model import FraudModel
from vector_store import VectorStore

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("fraud-ml-service")

# --- OpenTelemetry: traces the scoring path so it can be correlated with the
# gateway's spans in a real collector (Jaeger/Tempo/X-Ray). Console exporter
# keeps this runnable with no extra infra; swap for an OTLP exporter in prod.
trace.set_tracer_provider(TracerProvider())
trace.get_tracer_provider().add_span_processor(BatchSpanProcessor(ConsoleSpanExporter()))
tracer = trace.get_tracer(__name__)

# --- Prometheus metrics
SCORED_TOTAL = Counter("fraud_transactions_scored_total", "Transactions scored")
FLAGGED_TOTAL = Counter("fraud_transactions_flagged_total", "Transactions flagged as risky")
SCORE_LATENCY = Histogram("fraud_score_latency_seconds", "Time to score a transaction")

RISK_THRESHOLD = 0.6


class FraudScorerServicer(fraud_pb2_grpc.FraudScorerServicer):
    def __init__(self):
        self.model = FraudModel()
        self.vector_store = VectorStore()

    def ScoreTransaction(self, request, context):
        with tracer.start_as_current_span("score_transaction"), SCORE_LATENCY.time():
            features = self.model.extract_features(request)
            risk_score = self.model.score(features)
            flagged = risk_score >= RISK_THRESHOLD

            similar = self.vector_store.top_similar(features)
            # remember this transaction's feature vector for future similarity lookups
            self.vector_store.add(request.transaction_id, features)

            SCORED_TOTAL.inc()
            if flagged:
                FLAGGED_TOTAL.inc()

            logger.info(
                "tx=%s risk=%.3f flagged=%s similar=%s",
                request.transaction_id, risk_score, flagged, similar,
            )

            return fraud_pb2.ScoreResponse(
                transaction_id=request.transaction_id,
                risk_score=risk_score,
                flagged=flagged,
                similar_transaction_ids=similar,
            )


def serve():
    start_http_server(9100)  # Prometheus scrape endpoint
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    fraud_pb2_grpc.add_FraudScorerServicer_to_server(FraudScorerServicer(), server)
    server.add_insecure_port("[::]:50051")
    server.start()
    logger.info("FraudScorer gRPC server listening on :50051 (metrics on :9100)")
    try:
        while True:
            time.sleep(86400)
    except KeyboardInterrupt:
        server.stop(0)


if __name__ == "__main__":
    serve()
