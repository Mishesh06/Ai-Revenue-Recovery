"""
Phase 6: Training Pipeline

Trains a RandomForestClassifier using scikit-learn.
Saves the complete preprocessing + model pipeline.
Splits data and saves the test set for the evaluation step.
"""

import os
import joblib
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.ensemble import RandomForestClassifier

def train_model(
    data_path: str = "ml/data/dataset.csv",
    model_output_path: str = "ml/models/model_latest.pkl",
    test_data_output_path: str = "ml/data/test.csv"
):
    """Loads data, splits it, builds pipeline, trains, and saves artifacts."""
    
    # 1. Load data
    df = pd.read_csv(data_path)
    
    # 2. Define exact features to prevent target leakage
    features = [
        "transaction_amount",
        "failure_code",
        "customer_risk_score",
        "time_since_failure_hours",
        "previous_attempt_count"
    ]
    target = "recovered"
    
    X = df[features]
    y = df[target]
    
    # 3. Train/test split with stratify and reproducible seed
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    # Save test set for evaluate.py
    test_df = X_test.copy()
    test_df[target] = y_test
    test_df.to_csv(test_data_output_path, index=False)
    print(f"Saved test set to {test_data_output_path} ({len(test_df)} rows)")
    
    # 4. Preprocessing
    categorical_features = ["failure_code"]
    numeric_features = [
        "transaction_amount",
        "customer_risk_score",
        "time_since_failure_hours",
        "previous_attempt_count"
    ]
    
    preprocessor = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), numeric_features),
            ("cat", OneHotEncoder(handle_unknown="ignore"), categorical_features)
        ]
    )
    
    # 5. Complete Pipeline
    pipeline = Pipeline(steps=[
        ("preprocessor", preprocessor),
        ("classifier", RandomForestClassifier(n_estimators=100, random_state=42, max_depth=10))
    ])
    
    # 6. Train
    print("Training model...")
    pipeline.fit(X_train, y_train)
    
    # 7. Save complete pipeline
    os.makedirs(os.path.dirname(model_output_path), exist_ok=True)
    joblib.dump(pipeline, model_output_path)
    print(f"Saved model pipeline to {model_output_path}")

if __name__ == "__main__":
    train_model()
