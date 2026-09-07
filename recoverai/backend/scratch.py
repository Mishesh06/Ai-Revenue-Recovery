import pytest
import uuid
import sys
import os

# add backend dir to sys.path
sys.path.insert(0, os.path.abspath('.'))

from app.services.simulator import SimulatorService
from unittest.mock import MagicMock
from app.models.transaction import Transaction

db_mock = MagicMock()
db_mock.added_items = []

def add(item):
    print("ADDED:", type(item).__name__, getattr(item, 'id', None), getattr(item, 'merchant_id', None))
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

m_id = uuid.uuid4()
print("Using merchant_id:", m_id, type(m_id))
res = SimulatorService.run_scenario(db_mock, m_id, "B", 10, 42)
print("Metrics:", res["metrics"])
