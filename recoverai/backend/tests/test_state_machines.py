"""
Phase 2 Verification — State Machine Independence

Verifies that CaseState, ActionState, and AttemptState are fully
independent enums. They must NOT share a column, type name, or values
that could be confused across the three state machines.

Critical rule: ONE state field per entity. Never use a shared state
column to represent multiple lifecycles.

No database connection required.
"""

import pytest
import app.models  # noqa: F401
from app.database.base import Base
from app.models.enums import ActionState, AttemptState, CaseState, ExecutionMode


class TestEnumTypeIdentity:
    """The three state enums are distinct Python types."""

    def test_case_action_attempt_are_different_types(self):
        assert CaseState is not ActionState
        assert ActionState is not AttemptState
        assert CaseState is not AttemptState

    def test_execution_mode_is_separate_from_state_enums(self):
        assert ExecutionMode is not CaseState
        assert ExecutionMode is not ActionState
        assert ExecutionMode is not AttemptState

    def test_case_state_is_str_enum(self):
        import enum
        assert issubclass(CaseState, str)
        assert issubclass(CaseState, enum.Enum)

    def test_action_state_is_str_enum(self):
        import enum
        assert issubclass(ActionState, str)
        assert issubclass(ActionState, enum.Enum)

    def test_attempt_state_is_str_enum(self):
        import enum
        assert issubclass(AttemptState, str)
        assert issubclass(AttemptState, enum.Enum)


class TestStateColumnIndependence:
    """Each entity has its own 'state' column backed by its own enum type."""

    def _get_state_col(self, table_name: str):
        return Base.metadata.tables[table_name].c.get("state")

    def test_recovery_case_has_state_column(self):
        col = self._get_state_col("recovery_cases")
        assert col is not None, "recovery_cases must have a state column"

    def test_recovery_action_has_state_column(self):
        col = self._get_state_col("recovery_actions")
        assert col is not None, "recovery_actions must have a state column"

    def test_recovery_attempt_has_state_column(self):
        col = self._get_state_col("recovery_attempts")
        assert col is not None, "recovery_attempts must have a state column"

    def test_three_state_columns_are_different_columns(self):
        """The state columns on three different tables must be different objects."""
        case_col = self._get_state_col("recovery_cases")
        action_col = self._get_state_col("recovery_actions")
        attempt_col = self._get_state_col("recovery_attempts")
        assert case_col is not action_col
        assert action_col is not attempt_col
        assert case_col is not attempt_col

    def test_case_state_enum_type_name(self):
        col = self._get_state_col("recovery_cases")
        assert col.type.name == "casestate", (
            f"Expected enum type 'casestate', got: {col.type.name!r}"
        )

    def test_action_state_enum_type_name(self):
        col = self._get_state_col("recovery_actions")
        assert col.type.name == "actionstate", (
            f"Expected enum type 'actionstate', got: {col.type.name!r}"
        )

    def test_attempt_state_enum_type_name(self):
        col = self._get_state_col("recovery_attempts")
        assert col.type.name == "attemptstate", (
            f"Expected enum type 'attemptstate', got: {col.type.name!r}"
        )

    def test_three_enum_type_names_are_different(self):
        case_name = self._get_state_col("recovery_cases").type.name
        action_name = self._get_state_col("recovery_actions").type.name
        attempt_name = self._get_state_col("recovery_attempts").type.name
        assert len({case_name, action_name, attempt_name}) == 3, (
            f"State enum type names must all be distinct: "
            f"{case_name!r}, {action_name!r}, {attempt_name!r}"
        )


class TestCaseStateValues:
    """CaseState must contain only RecoveryCase-specific states."""

    CASE_ONLY_VALUES = {"DETECTED", "ANALYZING", "PREDICTED", "DIAGNOSED",
                        "PLANNED", "POLICY_CHECK", "RECOVERING", "RECOVERED",
                        "RECOVERY_WINDOW_EXPIRED", "CLOSED"}

    ACTION_ONLY_VALUES = {"PROPOSED", "APPROVED", "REJECTED", "EXECUTING",
                          "OUTCOME_UNKNOWN", "CANCELLED"}

    ATTEMPT_ONLY_VALUES = {"TIMEOUT", "UNKNOWN"}

    def test_case_state_has_no_action_only_values(self):
        case_values = {s.value for s in CaseState}
        leaked = case_values & self.ACTION_ONLY_VALUES
        assert not leaked, (
            f"CaseState contains values that belong to ActionState: {leaked}"
        )

    def test_case_state_has_no_attempt_only_values(self):
        case_values = {s.value for s in CaseState}
        leaked = case_values & self.ATTEMPT_ONLY_VALUES
        assert not leaked, (
            f"CaseState contains values that belong to AttemptState: {leaked}"
        )

    def test_action_state_has_no_case_only_values(self):
        action_values = {s.value for s in ActionState}
        leaked = action_values & self.CASE_ONLY_VALUES
        assert not leaked, (
            f"ActionState contains values that belong to CaseState: {leaked}"
        )

    def test_attempt_state_has_no_case_only_values(self):
        attempt_values = {s.value for s in AttemptState}
        leaked = attempt_values & self.CASE_ONLY_VALUES
        assert not leaked, (
            f"AttemptState contains values that belong to CaseState: {leaked}"
        )

    def test_case_state_terminal_states_exist(self):
        """RECOVERED, RECOVERY_WINDOW_EXPIRED, CLOSED are terminal states."""
        assert CaseState.RECOVERED in CaseState
        assert CaseState.RECOVERY_WINDOW_EXPIRED in CaseState
        assert CaseState.CLOSED in CaseState

    def test_action_state_terminal_states_exist(self):
        """SUCCEEDED, FAILED, OUTCOME_UNKNOWN, CANCELLED, REJECTED are terminal."""
        assert ActionState.SUCCEEDED in ActionState
        assert ActionState.FAILED in ActionState
        assert ActionState.OUTCOME_UNKNOWN in ActionState
        assert ActionState.CANCELLED in ActionState

    def test_attempt_state_has_timeout(self):
        """TIMEOUT is an AttemptState-specific terminal — not on CaseState."""
        assert AttemptState.TIMEOUT in AttemptState
        assert not hasattr(CaseState, "TIMEOUT")
        assert not hasattr(ActionState, "TIMEOUT")


class TestNoSharedStateColumns:
    """No table should have more than one 'state' column."""

    def test_no_table_has_duplicate_state_columns(self):
        for table_name, table in Base.metadata.tables.items():
            state_cols = [c for c in table.columns if c.name == "state"]
            assert len(state_cols) <= 1, (
                f"Table '{table_name}' has {len(state_cols)} state columns — "
                f"each entity must have exactly one state column"
            )

    def test_recovery_case_has_exactly_one_state_column(self):
        state_cols = [
            c for c in Base.metadata.tables["recovery_cases"].columns
            if c.name == "state"
        ]
        assert len(state_cols) == 1

    def test_recovery_action_has_exactly_one_state_column(self):
        state_cols = [
            c for c in Base.metadata.tables["recovery_actions"].columns
            if c.name == "state"
        ]
        assert len(state_cols) == 1

    def test_recovery_attempt_has_exactly_one_state_column(self):
        state_cols = [
            c for c in Base.metadata.tables["recovery_attempts"].columns
            if c.name == "state"
        ]
        assert len(state_cols) == 1
