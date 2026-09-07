import pytest
from app.services.simulator import SimulatorService
from unittest.mock import MagicMock

@pytest.fixture
def mock_db():
    db_mock = MagicMock()
    db_mock.added_items = []
    
    def add(item):
        db_mock.added_items.append(item)
    db_mock.add.side_effect = add
    
    def mock_query(model):
        class QueryMock:
            def filter_by(self, **kwargs):
                self.kwargs = kwargs
                return self
            def first(self):
                for item in db_mock.added_items:
                    if isinstance(item, model):
                        match = True
                        for k, v in getattr(self, "kwargs", {}).items():
                            if getattr(item, k, None) != v:
                                match = False
                                break
                        if match:
                            return item
                return None
            def all(self):
                res = []
                for item in db_mock.added_items:
                    if isinstance(item, model):
                        match = True
                        for k, v in getattr(self, "kwargs", {}).items():
                            if getattr(item, k, None) != v:
                                match = False
                                break
                        if match:
                            res.append(item)
                return res
            def count(self):
                return len(self.all())
        return QueryMock()
        
    db_mock.query.side_effect = mock_query
    
    # We also mock flush and commit to do nothing
    db_mock.flush.return_value = None
    db_mock.commit.return_value = None
    return db_mock

import uuid

def test_scenario_a_deterministic_selection(mock_db):
    m_id = uuid.uuid4()
    result1 = SimulatorService.run_scenario(mock_db, m_id, "A", sample_size=10, seed=42)
    
    # Clear db mock for second run
    mock_db.added_items = []
    
    result2 = SimulatorService.run_scenario(mock_db, m_id, "A", sample_size=10, seed=42)
    assert result1["metrics"] == result2["metrics"]

def test_scenario_b_high_risk_filtering(mock_db):
    result = SimulatorService.run_scenario(mock_db, uuid.uuid4(), "B", sample_size=10, seed=42)
    assert result["metrics"]["transactions_analyzed"] > 0

def test_scenario_c_forces_unknown(mock_db):
    result = SimulatorService.run_scenario(mock_db, uuid.uuid4(), "C", sample_size=10, seed=42)
    metrics = result["metrics"]
    
    # Prove that C produces unknown outcomes and manual reviews
    assert metrics["unknown_outcomes"] > 0
    assert metrics["manual_reviews"] > 0
    assert metrics["unknown_outcomes"] == metrics["manual_reviews"]
    
    # Prove no successful recoveries
    assert metrics["successful_recoveries"] == 0

def test_scenario_d_high_opportunity(mock_db):
    result = SimulatorService.run_scenario(mock_db, uuid.uuid4(), "D", sample_size=10, seed=42)
    # Should only process insufficient_funds
    assert result["metrics"]["transactions_analyzed"] > 0

def test_scenario_e_policy_heavy(mock_db):
    result = SimulatorService.run_scenario(mock_db, uuid.uuid4(), "E", sample_size=10, seed=42)
    # Exceeds max retries -> creates policy blocks
    assert result["metrics"]["policy_blocks"] > 0

def test_metrics_isolated_to_simulation_run(mock_db):
    # Run A
    res1 = SimulatorService.run_scenario(mock_db, uuid.uuid4(), "A", sample_size=5, seed=42)
    # Run C (without clearing db)
    res2 = SimulatorService.run_scenario(mock_db, uuid.uuid4(), "C", sample_size=15, seed=42)
    
    assert res1["metrics"]["transactions_analyzed"] == 5
    assert res2["metrics"]["transactions_analyzed"] == 15
