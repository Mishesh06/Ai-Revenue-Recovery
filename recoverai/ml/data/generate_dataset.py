"""
Phase 6: Dataset Generator

Generates a realistic, synthetic dataset for predicting recovery likelihood.
Uses a probabilistic generation formula rather than a simple deterministic rule.
"""

import os
import pandas as pd
import numpy as np

def generate_dataset(num_records: int = 10000, seed: int = 42, output_path: str = "dataset.csv") -> pd.DataFrame:
    """Generates synthetic dataset and saves it to output_path."""
    np.random.seed(seed)
    
    # 1. Generate features with realistic distributions
    
    # transaction_amount: positive, skewed (e.g. log-normal distribution)
    # Mean of underlying normal ~ 4 (exp(4) ~ 54), sigma ~ 1.2
    transaction_amount = np.random.lognormal(mean=4.0, sigma=1.2, size=num_records)
    transaction_amount = np.clip(transaction_amount, 1.0, 50000.0) # bounded
    
    # customer_risk_score: 0.0 to 1.0 (uniform or beta)
    customer_risk_score = np.random.beta(a=2, b=5, size=num_records)
    
    # failure_code: categorical
    failure_codes = ["insufficient_funds", "do_not_honor", "generic_decline", "expired_card", "stolen_card", "limit_exceeded"]
    probs = [0.4, 0.25, 0.15, 0.1, 0.05, 0.05]
    failure_code = np.random.choice(failure_codes, p=probs, size=num_records)
    
    # time_since_failure_hours: non-negative bounded by recovery window (e.g. 168 hours = 7 days)
    time_since_failure_hours = np.random.uniform(0, 168, size=num_records)
    
    # previous_attempt_count: non-negative integer (e.g. 0 to 3)
    previous_attempt_count = np.random.poisson(lam=0.5, size=num_records)
    previous_attempt_count = np.clip(previous_attempt_count, 0, 3)
    
    # 2. Calculate underlying recovery propensity
    # Base log-odds
    log_odds = np.zeros(num_records)
    
    # Risk score effect (higher risk -> lower recovery)
    log_odds -= 3.0 * customer_risk_score
    
    # Amount effect (higher amount -> slightly lower recovery)
    log_odds -= 0.005 * transaction_amount
    
    # Time effect (older -> lower recovery)
    log_odds -= 0.01 * time_since_failure_hours
    
    # Attempt count effect (more attempts -> lower recovery)
    log_odds -= 0.5 * previous_attempt_count
    
    # Failure code effects
    code_effects = {
        "insufficient_funds": 1.0,  # likely to recover eventually
        "do_not_honor": -0.5,
        "generic_decline": 0.0,
        "expired_card": -1.5,
        "stolen_card": -5.0,        # very unlikely
        "limit_exceeded": 0.5,
    }
    for i in range(num_records):
        log_odds[i] += code_effects.get(failure_code[i], 0.0)
        
    # 3. Add bounded random noise
    noise = np.random.normal(loc=0.0, scale=1.0, size=num_records)
    log_odds += noise
    
    # 4. Convert to probability
    prob = 1.0 / (1.0 + np.exp(-log_odds))
    
    # 5. Convert to probabilistic binary outcome
    recovered = np.random.binomial(n=1, p=prob)
    
    # Build dataframe
    df = pd.DataFrame({
        "transaction_amount": transaction_amount,
        "customer_risk_score": customer_risk_score,
        "failure_code": failure_code,
        "time_since_failure_hours": time_since_failure_hours,
        "previous_attempt_count": previous_attempt_count,
        "recovered": recovered
    })
    
    # Save
    if output_path:
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        df.to_csv(output_path, index=False)
        print(f"Generated {num_records} records at {output_path}")
        print(df["recovered"].value_counts())
        
    return df

if __name__ == "__main__":
    generate_dataset(num_records=10000, seed=42, output_path="ml/data/dataset.csv")
