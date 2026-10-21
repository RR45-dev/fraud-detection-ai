"""
Minimal in-memory vector store used to find transactions that "look like"
past confirmed fraud cases — a lightweight stand-in for the kind of vector
search JPMorgan-style fraud stacks run against embeddings in production
(e.g. pgvector, OpenSearch k-NN, or a managed vector DB). Swap this class
for a real vector index without touching the gRPC server code.
"""
from dataclasses import dataclass, field
import numpy as np


@dataclass
class VectorStore:
    vectors: dict = field(default_factory=dict)  # transaction_id -> np.ndarray

    def add(self, transaction_id: str, vector: np.ndarray):
        self.vectors[transaction_id] = vector.flatten()

    def top_similar(self, vector: np.ndarray, k: int = 3, min_similarity: float = 0.8):
        if not self.vectors:
            return []
        query = vector.flatten()
        query_norm = np.linalg.norm(query) or 1e-9
        scored = []
        for tx_id, v in self.vectors.items():
            v_norm = np.linalg.norm(v) or 1e-9
            similarity = float(np.dot(query, v) / (query_norm * v_norm))
            if similarity >= min_similarity:
                scored.append((tx_id, similarity))
        scored.sort(key=lambda x: x[1], reverse=True)
        return [tx_id for tx_id, _ in scored[:k]]
