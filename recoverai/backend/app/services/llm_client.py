"""
RecoverAI v3.2 — LLM Client Stub

Simulates an external LLM call. Used for testing failure modes and timeouts.
"""
import json
import time

class LLMTimeoutError(Exception):
    pass

class LLMUnavailableError(Exception):
    pass

class MockLLMClient:
    """
    A mock LLM client to simulate agent execution.
    Can be configured to inject failures.
    """
    def __init__(self):
        self.inject_timeout = False
        self.inject_unavailable = False
        self.inject_malformed_json = False
        self.inject_invalid_schema = False
        
        self.mock_diagnosis_response = {
            "failure_category": "TEMPORARY_FAILURE",
            "confidence": 0.91,
            "evidence": ["Previous successful payments", "Transient gateway response"]
        }
        
        self.mock_planner_response = {
            "recommended_action": "RETRY_PAYMENT",
            "priority": "HIGH",
            "reason_code": "HIGH_RECOVERY_PROBABILITY",
            "confidence": 0.89
        }

    def generate_json(self, prompt: str, agent_type: str) -> str:
        """Simulates generating a JSON response from an LLM."""
        if self.inject_timeout:
            time.sleep(0.5)
            raise LLMTimeoutError("LLM generation timed out.")
        
        if self.inject_unavailable:
            raise LLMUnavailableError("LLM service is currently unavailable.")
            
        if self.inject_malformed_json:
            return '{"failure_category": "TEMPORARY_FAILURE", "confidence": 0.91, "evidence": ["Missing bracket"'
            
        if self.inject_invalid_schema:
            return '{"wrong_key": "value", "confidence": "high"}'
            
        # Return valid mock response based on agent type
        if agent_type == "diagnosis":
            return json.dumps(self.mock_diagnosis_response)
        else:
            return json.dumps(self.mock_planner_response)

# Global singleton for testing injection
llm_client = MockLLMClient()
