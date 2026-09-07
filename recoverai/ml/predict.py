"""
Phase 6: Prediction Service

Loads the active model, applies the exact saved preprocessing pipeline,
and produces probabilistic recovery predictions.
"""

import os
import joblib
import pandas as pd
from typing import Dict, Any

from ml.models.registry import get_latest_model_info

# Cache the loaded pipeline
_PIPELINE = None
_MODEL_VERSION = None

def get_pipeline(model_path: str = "ml/models/model_latest.pkl"):
    global _PIPELINE, _MODEL_VERSION
    if _PIPELINE is None:
        _PIPELINE = joblib.load(model_path)
        info = get_latest_model_info()
        _MODEL_VERSION = info["model_version"] if info else "unknown"
    return _PIPELINE, _MODEL_VERSION

def predict_recovery(
    transaction_id: str,
    recovery_case_id: str,
    transaction_amount: float,
    failure_code: str,
    customer_risk_score: float,
    time_since_failure_hours: float,
    previous_attempt_count: int,
    model_path: str = "ml/models/model_latest.pkl"
) -> Dict[str, Any]:
    """
    Predicts recovery probability and confidence.
    """
    pipeline, model_version = get_pipeline(model_path)
    
    # Build dataframe for prediction
    df = pd.DataFrame([{
        "transaction_amount": transaction_amount,
        "failure_code": failure_code,
        "customer_risk_score": customer_risk_score,
        "time_since_failure_hours": time_since_failure_hours,
        "previous_attempt_count": previous_attempt_count
    }])
    
    # Predict probability of class 1 (recovered)
    probability = float(pipeline.predict_proba(df)[0][1])
    
    # Confidence is max(probability, 1 - probability)
    confidence = float(max(probability, 1.0 - probability))
    
    return {
        "model_version": model_version,
        "probability": probability,
        "confidence": confidence,
        "transaction_id": transaction_id,
        "recovery_case_id": recovery_case_id
    }
