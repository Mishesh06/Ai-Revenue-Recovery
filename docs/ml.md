# RecoverAI v3.2 — Machine Learning Pipeline

## Overview
The Phase 6 ML Pipeline predicts the probability that a failed payment will successfully recover after an allowed intervention.

## Ground Truth Definition
A transaction is considered `recovered` (Target = 1) **ONLY** when the failed transaction successfully completes after an allowed recovery intervention, and the successful completion occurs within the defined recovery window.

## Synthetic Dataset Limitations
**IMPORTANT**: The dataset generated in this repository (`ml/data/generate_dataset.py`) is entirely **synthetic**. It is designed for development and demonstration purposes only. Synthetic performance metrics must NOT be interpreted as real-world production model performance. 

## Dataset Generation
The generation script synthesizes 10,000 records. Rather than using a simple deterministic rule (which would allow the model to cheat and perfectly learn the rule), the script uses a complex underlying propensity score combined with bounded random noise to generate realistic, probabilistic class outcomes.

## Feature Definitions
- `transaction_amount` (float): Positive monetary values (skewed log-normal distribution).
- `failure_code` (categorical): E.g., `insufficient_funds`, `do_not_honor`, `expired_card`.
- `customer_risk_score` (float): Bounded 0.0 to 1.0.
- `time_since_failure_hours` (float): Non-negative, bounded by the recovery window.
- `previous_attempt_count` (int): Number of previous recovery attempts (integer).

## Leakage Prevention
The feature matrix rigorously excludes:
- `recovered`
- `recovery_success_timestamp`
- `final_payment_status`
- Any future recovery result

This ensures absolute target leakage prevention. The preprocessing steps (e.g., StandardScaler) are strictly fitted only on the training set, and the test data remains completely held out until the final evaluation step.

## Architecture
- **Algorithm**: `RandomForestClassifier` (scikit-learn).
- **Preprocessing**: `ColumnTransformer` applying `StandardScaler` to numerics and `OneHotEncoder` to categoricals. The entire preprocessing + model sequence is persisted as a single pipeline (`model_latest.pkl`).
- **Data Splitting**: Stratified 80/20 train/test split with `random_state=42`. Evaluation happens **only** on the 20% held-out test set.

## Evaluation, Threshold Analysis & Business Cost
Metrics calculated on the test set:
- ROC-AUC (measuring global rank-ordering ability).
- Threshold Analysis: The model is evaluated across thresholds (e.g., 0.30 to 0.80) calculating Precision, Recall, F1, TP, FP, FN, and Business Cost for each.

**Business Cost Interpretation**:
- **False Positive Cost (Unnecessary intervention)**: $0.50 per occurrence (cost of executing a retry that ultimately fails).
- **False Negative Cost (Missed recovery)**: Equal to the transaction amount (the revenue lost by not attempting a retry that would have succeeded).
The threshold analysis helps business stakeholders pick an optimal operating point that minimizes the total combined dollar cost, balancing the cheap cost of retries against the high penalty of missed recoveries.

## Model Output & Confidence (Not Calibrated)
The prediction service returns:
- `probability`: The raw tree-ensemble predicted probability P(recovered = 1).
- `confidence`: Defined explicitly as `max(probability, 1 - probability)`.
  - *Example*: probability = 0.90 -> confidence = 0.90
  - *Example*: probability = 0.30 -> confidence = 0.70

**Important Clarification**: `confidence` is a certainty-like score representing how strongly the model leans toward a particular class (either 0 or 1). It is **NOT** claimed to be a mathematically calibrated probability confidence interval. It simply maps the prediction's distance from the decision boundary.

## Phase 5 Compatibility
The ML Model does **not** directly approve, reject, or execute actions. It strictly outputs evidence (`probability`, `confidence`) which is then passed to the deterministic Policy Engine (Phase 5) to yield a final `APPROVED`, `REVIEW`, or `BLOCKED` decision.

## Future Production Requirements
Moving to production will require replacing the synthetic dataset generator with a secure ETL pipeline connected to the actual PostgreSQL database, tracking true historical recovery outcomes without data leakage.
