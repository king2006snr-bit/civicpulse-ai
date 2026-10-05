"""Shared constants for training and inference so both use identical feature definitions."""
from __future__ import annotations

import numpy as np

# Features the model is trained on. Every one of these can be computed from the live
# complaint + infrastructure tables (see src/server/predictions.ts). Features that were
# evaluated and dropped (previous_risk_score, damage_frequency, lat/lon, location, type)
# are documented in ml/README.md together with the CV numbers behind that decision.
NUMERIC_FEATURES = [
    "complaint_count",
    "complaints_last_7_days",
    "complaints_last_30_days",
    "complaint_severity_1_to_5",
    "infrastructure_age_years",
    "previous_incidents",
    "maintenance_delay_days",
    "unresolved_complaints",
]
CATEGORICAL_FEATURES = ["infrastructure_condition"]  # ordinal: Good < Fair < Poor
CONDITION_ORDER = ["Good", "Fair", "Poor"]
FEATURES = NUMERIC_FEATURES + CATEGORICAL_FEATURES

TARGET = "risk_score"

# Label convention of the training data (verified against all 80 rows in train.py).
LEVEL_CUTS = [(35.0, "LOW"), (60.0, "MEDIUM"), (80.0, "HIGH")]
LEVELS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]


def level_for(score: float) -> str:
    for upper, name in LEVEL_CUTS:
        if score < upper:
            return name
    return "CRITICAL"


def normalize_condition(value):
    """Map free-text conditions onto the training vocabulary; unknown -> None (imputed)."""
    if value is None:
        return None
    v = str(value).strip().lower()
    if v in ("good", "excellent", "new"):
        return "Good"
    if v in ("fair", "moderate", "average"):
        return "Fair"
    if v in ("poor", "bad", "critical", "failed"):
        return "Poor"
    return None


def to_float(value):
    if value is None or value == "":
        return np.nan
    try:
        f = float(value)
    except (TypeError, ValueError):
        return np.nan
    return f if np.isfinite(f) else np.nan
