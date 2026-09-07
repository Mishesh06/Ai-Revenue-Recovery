"""
Phase 6: Evaluation Pipeline

Evaluates the trained model on the held-out test set.
Calculates standard classification metrics and custom business cost.
Registers the model in the Model Registry.
"""

import joblib
import pandas as pd
import sys
import os
from sklearn.metrics import precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix

# Add parent directory to path to import registry
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from models.registry import register_model

def evaluate_model(
    test_data_path: str = "ml/data/test.csv",
    model_path: str = "ml/models/model_latest.pkl",
    training_data_path: str = "ml/data/dataset.csv"
):
    """Evaluates the model and registers it."""
    
    # 1. Load resources
    df = pd.read_csv(test_data_path)
    pipeline = joblib.load(model_path)
    
    features = [
        "transaction_amount",
        "failure_code",
        "customer_risk_score",
        "time_since_failure_hours",
        "previous_attempt_count"
    ]
    target = "recovered"
    
    X_test = df[features]
    y_test = df[target]
    
    # 2. Predict
    y_pred = pipeline.predict(X_test)
    y_prob = pipeline.predict_proba(X_test)[:, 1]
    
    # 3. Calculate metrics
    precision = precision_score(y_test, y_pred)
    recall = recall_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred)
    roc_auc = roc_auc_score(y_test, y_prob)
    cm = confusion_matrix(y_test, y_pred)
    
    tn, fp, fn, tp = cm.ravel()
    
    # 4. Calculate business cost
    # False Positive Cost: unnecessary intervention cost = $0.50
    fp_cost = fp * 0.50
    
    # False Negative Cost: missed recovery opportunity = transaction amount
    # We need the amounts of the False Negative transactions
    fn_mask = (y_test == 1) & (y_pred == 0)
    fn_amounts = df.loc[fn_mask, "transaction_amount"].sum()
    
    business_cost = {
        "false_positive_count": int(fp),
        "false_negative_count": int(fn),
        "total_intervention_cost": float(fp_cost),
        "total_missed_recovery_value": float(fn_amounts),
        "combined_business_cost": float(fp_cost + fn_amounts)
    }
    
    metrics = {
        "precision": float(precision),
        "recall": float(recall),
        "f1": float(f1),
        "roc_auc": float(roc_auc),
        "confusion_matrix": {
            "tn": int(tn),
            "fp": int(fp),
            "fn": int(fn),
            "tp": int(tp)
        },
        "test_samples": int(len(y_test)),
        "positive_class_count": int(y_test.sum()),
        "negative_class_count": int(len(y_test) - y_test.sum()),
        "business_cost": business_cost,
        "threshold_analysis": {}
    }
    
    # 5. Threshold Analysis
    print("=== Evaluation Results ===")
    print(f"ROC-AUC:   {roc_auc:.4f}\n")
    print("=== Threshold Analysis ===")
    thresholds = [0.30, 0.40, 0.50, 0.60, 0.70, 0.80]
    for t in thresholds:
        y_pred_t = (y_prob >= t).astype(int)
        prec_t = precision_score(y_test, y_pred_t, zero_division=0)
        rec_t = recall_score(y_test, y_pred_t, zero_division=0)
        f1_t = f1_score(y_test, y_pred_t, zero_division=0)
        cm_t = confusion_matrix(y_test, y_pred_t)
        if cm_t.size == 4:
            tn_t, fp_t, fn_t, tp_t = cm_t.ravel()
        else:
            tn_t, fp_t, fn_t, tp_t = cm_t[0][0], 0, 0, 0
            
        fp_cost_t = fp_t * 0.50
        fn_mask_t = (y_test == 1) & (y_pred_t == 0)
        fn_amounts_t = df.loc[fn_mask_t, "transaction_amount"].sum()
        total_cost_t = fp_cost_t + fn_amounts_t
        
        metrics["threshold_analysis"][str(t)] = {
            "precision": float(prec_t),
            "recall": float(rec_t),
            "f1": float(f1_t),
            "tp": int(tp_t),
            "fp": int(fp_t),
            "fn": int(fn_t),
            "business_cost": float(total_cost_t)
        }
        
        print(f"Threshold: {t:.2f} | Prec: {prec_t:.4f} | Rec: {rec_t:.4f} | F1: {f1_t:.4f}")
        print(f"  TP: {tp_t}, FP: {fp_t}, FN: {fn_t}")
        print(f"  Business Cost: ${total_cost_t:.2f} (FP Cost=${fp_cost_t:.2f}, FN Cost=${fn_amounts_t:.2f})")
    print("")
    
    # 6. Register Model
    model_version = register_model(
        model_name="RandomForest_Recovery_Predictor",
        training_dataset_path=training_data_path,
        metrics=metrics
    )
    print(f"Registered model version: {model_version}")

if __name__ == "__main__":
    evaluate_model()
