"""
Test: Enum definitions match the RecoverAI v3.2 specification exactly.

No database connection required.
"""

from app.models.enums import ActionState, AttemptState, CaseState, ExecutionMode


class TestCaseState:
    EXPECTED = {
        "DETECTED",
        "ANALYZING",
        "PREDICTED",
        "DIAGNOSED",
        "PLANNED",
        "POLICY_CHECK",
        "RECOVERING",
        "RECOVERED",
        "RECOVERY_WINDOW_EXPIRED",
        "CLOSED",
    }

    def test_all_values_present(self):
        actual = {s.value for s in CaseState}
        assert actual == self.EXPECTED

    def test_exact_count(self):
        assert len(CaseState) == 10

    def test_is_str_enum(self):
        assert isinstance(CaseState.DETECTED, str)

    def test_no_extra_values(self):
        actual = {s.value for s in CaseState}
        assert actual == self.EXPECTED, f"Unexpected states: {actual - self.EXPECTED}"


class TestActionState:
    EXPECTED = {
        "PROPOSED",
        "APPROVED",
        "REJECTED",
        "EXECUTING",
        "SUCCEEDED",
        "FAILED",
        "OUTCOME_UNKNOWN",
        "CANCELLED",
    }

    def test_all_values_present(self):
        actual = {s.value for s in ActionState}
        assert actual == self.EXPECTED

    def test_exact_count(self):
        assert len(ActionState) == 8

    def test_independent_from_case_state(self):
        """ActionState and CaseState must not share any values."""
        case_values = {s.value for s in CaseState}
        action_values = {s.value for s in ActionState}
        overlap = case_values & action_values
        assert not overlap, f"Shared values between enums: {overlap}"


class TestAttemptState:
    EXPECTED = {
        "STARTED",
        "SUCCEEDED",
        "FAILED",
        "TIMEOUT",
        "UNKNOWN",
    }

    def test_all_values_present(self):
        actual = {s.value for s in AttemptState}
        assert actual == self.EXPECTED

    def test_exact_count(self):
        assert len(AttemptState) == 5

    def test_independent_from_action_state(self):
        """AttemptState must be its own independent enum."""
        action_values = {s.value for s in ActionState}
        attempt_values = {s.value for s in AttemptState}
        # SUCCEEDED and FAILED overlap is acceptable (same concept, independent enums)
        # But the enum types themselves must be different
        assert AttemptState is not ActionState


class TestExecutionMode:
    EXPECTED = {"LIVE", "SIMULATION"}

    def test_all_values_present(self):
        actual = {m.value for m in ExecutionMode}
        assert actual == self.EXPECTED

    def test_exact_count(self):
        assert len(ExecutionMode) == 2

    def test_is_str_enum(self):
        assert isinstance(ExecutionMode.LIVE, str)
        assert isinstance(ExecutionMode.SIMULATION, str)
