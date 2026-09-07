import os
import sys
import pandas as pd
import pytest

# Add paths for imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from ml.data.generate_dataset import generate_dataset
from ml.training.train import train_model
from ml.evaluation.evaluate import evaluate_model
from ml.models.registry import load_registry, save_registry, register_model
from ml.predict import predict_recovery

# Test artifacts paths
TEST_DATA_DIR = "ml/tests/test_artifacts"
DATASET_PATH = f"{TEST_DATA_DIR}/dataset.csv"
TEST_DATASET_PATH = f"{TEST_DATA_DIR}/test.csv"
MODEL_PATH = f"{TEST_DATA_DIR}/model_latest.pkl"
import ml.models.registry
ml.models.registry.REGISTRY_PATH = f"{TEST_DATA_DIR}/registry.json"

@pytest.fixture(scope="session", autouse=True)
def setup_test_env():
    os.makedirs(TEST_DATA_DIR, exist_ok=True)
    yield
    # Cleanup could go here

def test_dataset_generation():
    df = generate_dataset(num_records=10000, seed=42, output_path=DATASET_PATH)
    
    # row count = 10,000
    assert len(df) == 10000
    
    # required feature columns
    expected_cols = {
        "transaction_amount", "failure_code", "customer_risk_score", 
        "time_since_failure_hours", "previous_attempt_count", "recovered"
    }
    assert set(df.columns) == expected_cols
    
    # target contains both classes
    assert len(df["recovered"].unique()) == 2
    assert 0 in df["recovered"].values
    assert 1 in df["recovered"].values
    
    # no target leakage (future fields not present)
    assert "recovery_success_timestamp" not in df.columns
    assert "final_payment_status" not in df.columns
    
    # Reproducibility with seed 42
    df2 = generate_dataset(num_records=1000, seed=42, output_path=None)
    df3 = generate_dataset(num_records=1000, seed=42, output_path=None)
    pd.testing.assert_frame_equal(df2, df3)

def test_model_training_and_separation():
    # Run training
    train_model(DATASET_PATH, MODEL_PATH, TEST_DATASET_PATH)
    
    # Verify train/test separation and existence
    assert os.path.exists(MODEL_PATH)
    assert os.path.exists(TEST_DATASET_PATH)
    
    test_df = pd.read_csv(TEST_DATASET_PATH)
    # Test set is 20% of 10,000
    assert len(test_df) == 2000
    assert "recovered" in test_df.columns

def test_model_evaluation_and_business_cost(capsys):
    evaluate_model(TEST_DATASET_PATH, MODEL_PATH, DATASET_PATH)
    
    captured = capsys.readouterr().out
    assert "Evaluation Results" in captured
    assert "ROC-AUC:" in captured
    assert "=== Threshold Analysis ===" in captured
    assert "Threshold: 0.30" in captured
    assert "Threshold: 0.80" in captured
    assert "Business Cost:" in captured

def test_registry_preserves_historical_versions():
    # Empty it first
    save_registry([])
    
    # Register model 1
    v1 = register_model("Model_A", "dummy_path", {"f1": 0.5})
    reg = load_registry()
    assert len(reg) == 1
    assert reg[0]["model_version"] == v1
    
    # Register model 2
    v2 = register_model("Model_B", "dummy_path", {"f1": 0.6})
    reg = load_registry()
    assert len(reg) == 2
    assert reg[0]["model_version"] == v1
    assert reg[1]["model_version"] == v2
    assert v1 != v2

def test_prediction_output():
    # Use the test trained model
    import ml.predict
    ml.predict._PIPELINE = None  # Force reload
    
    res = predict_recovery(
        transaction_id="tx_123",
        recovery_case_id="case_456",
        transaction_amount=150.0,
        failure_code="insufficient_funds",
        customer_risk_score=0.2,
        time_since_failure_hours=24.0,
        previous_attempt_count=0,
        model_path=MODEL_PATH
    )
    
    assert res["transaction_id"] == "tx_123"
    assert res["recovery_case_id"] == "case_456"
    assert "model_version" in res
    
    prob = res["probability"]
    conf = res["confidence"]
    
    # Probability range 0..1
    assert 0.0 <= prob <= 1.0
    
    # Confidence range 0..1
    assert 0.0 <= conf <= 1.0
    
    # Confidence definition: max(p, 1-p)
    assert conf == max(prob, 1.0 - prob)
