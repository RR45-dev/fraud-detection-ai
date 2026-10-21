"""
Trains a small unsupervised anomaly-detection model (Isolation Forest) on
synthetic transaction data at startup. In a real deployment this would load
a model trained offline on historical transactions and periodically
retrained; here it's generated in-process so the whole service is runnable
with zero external data.

Features per transaction:
  - amount (USD)
  - hour_of_day (0-23)
  - distance_from_home_km (haversine distance between transaction and the
    account's registered home location)
"""
import numpy as np
from sklearn.ensemble import IsolationForest
from math import radians, sin, cos, sqrt, atan2

RNG = np.random.default_rng(42)


def haversine_km(lat1, lon1, lat2, lon2):
    r = 6371.0
    dlat, dlon = radians(lat2 - lat1), radians(lon2 - lon1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    return 2 * r * atan2(sqrt(a), sqrt(1 - a))


def _synthetic_training_data(n=2000):
    # "normal" spending: small-to-moderate amounts, daytime hours, near home
    amounts = RNG.gamma(shape=2.0, scale=30.0, size=n)
    hours = RNG.normal(loc=14, scale=4, size=n).clip(0, 23)
    distances = RNG.exponential(scale=5.0, size=n)
    return np.column_stack([amounts, hours, distances])


class FraudModel:
    def __init__(self):
        self.features = _synthetic_training_data()
        self.model = IsolationForest(
            n_estimators=200, contamination=0.03, random_state=42
        )
        self.model.fit(self.features)

    def extract_features(self, req) -> np.ndarray:
        distance = haversine_km(req.home_lat, req.home_lon, req.lat, req.lon)
        return np.array([[req.amount, req.hour_of_day, distance]])

    def score(self, feature_vector: np.ndarray) -> float:
        """Returns a risk score in [0, 1] — higher means riskier.
        IsolationForest's decision_function is higher for normal points,
        so we invert and rescale it."""
        raw = self.model.decision_function(feature_vector)[0]
        risk = 1 / (1 + np.exp(raw * 5))  # sigmoid squashes to (0, 1)
        return float(risk)
