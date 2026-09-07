"""
Phase 6: Model Registry

Maintains a JSON registry of trained models without overwriting historical entries.
"""

import json
import os
import uuid
from datetime import datetime, timezone
from typing import Dict, Any

REGISTRY_PATH = os.path.join(os.path.dirname(__file__), "registry.json")

def load_registry() -> list:
    """Loads the model registry from disk."""
    if not os.path.exists(REGISTRY_PATH):
        return []
    with open(REGISTRY_PATH, "r") as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return []

def save_registry(registry_data: list):
    """Saves the model registry to disk."""
    with open(REGISTRY_PATH, "w") as f:
        json.dump(registry_data, f, indent=2)

def register_model(model_name: str, training_dataset_path: str, metrics: Dict[str, Any]) -> str:
    """
    Registers a new model version.
    Returns the generated model_version identifier.
    """
    registry_data = load_registry()
    
    # Generate deterministic/versioned identifier
    version_num = len(registry_data) + 1
    model_version = f"v{version_num}_{uuid.uuid4().hex[:8]}"
    
    entry = {
        "model_version": model_version,
        "model_name": model_name,
        "training_dataset_path": training_dataset_path,
        "metrics": metrics,
        "created_at": datetime.now(tz=timezone.utc).isoformat()
    }
    
    registry_data.append(entry)
    save_registry(registry_data)
    
    return model_version

def get_latest_model_info() -> Dict[str, Any] | None:
    """Returns the most recently registered model info."""
    registry_data = load_registry()
    if not registry_data:
        return None
    return registry_data[-1]
