"""Initial RecoverAI v3.2 schema — all 21 tables.

Revision ID: 001_initial_schema
Revises:
Create Date: 2026-08-25 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── PostgreSQL ENUM types ────────────────────────────────────
    casestate = postgresql.ENUM(
        "DETECTED", "ANALYZING", "PREDICTED", "DIAGNOSED", "PLANNED",
        "POLICY_CHECK", "RECOVERING", "RECOVERED", "RECOVERY_WINDOW_EXPIRED",
        "CLOSED",
        name="casestate",
    )
    actionstate = postgresql.ENUM(
        "PROPOSED", "APPROVED", "REJECTED", "EXECUTING",
        "SUCCEEDED", "FAILED", "OUTCOME_UNKNOWN", "CANCELLED",
        name="actionstate",
    )
    attemptstate = postgresql.ENUM(
        "STARTED", "SUCCEEDED", "FAILED", "TIMEOUT", "UNKNOWN",
        name="attemptstate",
    )
    executionmode = postgresql.ENUM(
        "LIVE", "SIMULATION",
        name="executionmode",
    )
    casestate.create(op.get_bind(), checkfirst=True)
    actionstate.create(op.get_bind(), checkfirst=True)
    attemptstate.create(op.get_bind(), checkfirst=True)
    executionmode.create(op.get_bind(), checkfirst=True)

    # ── 1. users ─────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"])

    # ── 2. merchants ─────────────────────────────────────────────
    op.create_table(
        "merchants",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("api_key", sa.String(512), nullable=True, unique=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("settings", postgresql.JSONB, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_merchants_api_key", "merchants", ["api_key"])

    # ── 3. customers ─────────────────────────────────────────────
    op.create_table(
        "customers",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("merchant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("merchants.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("external_customer_id", sa.String(255), nullable=True),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("phone", sa.String(50), nullable=True),
        sa.Column("name", sa.String(255), nullable=True),
        sa.Column("metadata", postgresql.JSONB, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_customers_merchant_id", "customers", ["merchant_id"])
    op.create_index("ix_customers_external_id", "customers", ["merchant_id", "external_customer_id"])

    # ── 4. transactions ───────────────────────────────────────────
    op.create_table(
        "transactions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("merchant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("merchants.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("customer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("customers.id", ondelete="SET NULL"), nullable=True),
        sa.Column("external_transaction_id", sa.String(255), nullable=True),
        sa.Column("amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False, server_default="INR"),
        sa.Column("status", sa.String(64), nullable=True),
        sa.Column("payment_method", sa.String(64), nullable=True),
        sa.Column("gateway_response", postgresql.JSONB, nullable=True),
        sa.Column("failed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_transactions_merchant_id", "transactions", ["merchant_id"])
    op.create_index("ix_transactions_customer_id", "transactions", ["customer_id"])
    op.create_index("ix_transactions_external_id", "transactions", ["merchant_id", "external_transaction_id"])

    # ── 5. recovery_cases ─────────────────────────────────────────
    op.create_table(
        "recovery_cases",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("merchant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("merchants.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("transaction_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("transactions.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("state", sa.Enum("DETECTED","ANALYZING","PREDICTED","DIAGNOSED","PLANNED","POLICY_CHECK","RECOVERING","RECOVERED","RECOVERY_WINDOW_EXPIRED","CLOSED", name="casestate", create_type=False), nullable=False, server_default="DETECTED"),
        sa.Column("correlation_id", sa.String(255), nullable=False, unique=True),
        sa.Column("confidence", sa.Float, nullable=True),
        sa.Column("recovery_window_started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("recovery_window_ends_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("recovered_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_recovery_cases_merchant_id", "recovery_cases", ["merchant_id"])
    op.create_index("ix_recovery_cases_transaction_id", "recovery_cases", ["transaction_id"])
    op.create_index("ix_recovery_cases_state", "recovery_cases", ["state"])
    op.create_index("ix_recovery_cases_correlation_id", "recovery_cases", ["correlation_id"])

    # ── 6. recovery_opportunities ─────────────────────────────────
    op.create_table(
        "recovery_opportunities",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("merchant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("merchants.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("transaction_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("transactions.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("recovery_case_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("recovery_cases.id", ondelete="SET NULL"), nullable=True),
        sa.Column("opportunity_score", sa.Float, nullable=True),
        sa.Column("detected_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("metadata", postgresql.JSONB, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_recovery_opportunities_merchant_id", "recovery_opportunities", ["merchant_id"])
    op.create_index("ix_recovery_opportunities_transaction_id", "recovery_opportunities", ["transaction_id"])
    op.create_index("ix_recovery_opportunities_case_id", "recovery_opportunities", ["recovery_case_id"])

    # ── 7. policies ───────────────────────────────────────────────
    op.create_table(
        "policies",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("merchant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("merchants.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_policies_merchant_id", "policies", ["merchant_id"])

    # ── 8. policy_versions ────────────────────────────────────────
    op.create_table(
        "policy_versions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("policy_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("policies.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("version", sa.Integer, nullable=False),
        sa.Column("rules", postgresql.JSONB, nullable=False),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("policy_id", "version", name="uq_policy_versions_policy_version"),
    )
    op.create_index("ix_policy_versions_policy_id", "policy_versions", ["policy_id"])

    # ── 9. model_versions ─────────────────────────────────────────
    op.create_table(
        "model_versions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("model_name", sa.String(255), nullable=False),
        sa.Column("version", sa.String(64), nullable=False),
        sa.Column("framework", sa.String(128), nullable=True),
        sa.Column("artifact_path", sa.String(1024), nullable=True),
        sa.Column("metrics", postgresql.JSONB, nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("model_name", "version", name="uq_model_versions_name_version"),
    )

    # ── 10. agent_runs ────────────────────────────────────────────
    op.create_table(
        "agent_runs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("agent_name", sa.String(255), nullable=False),
        sa.Column("agent_version", sa.String(64), nullable=False),
        sa.Column("input_reference", sa.String(512), nullable=True),
        sa.Column("output", postgresql.JSONB, nullable=True),
        sa.Column("status", sa.String(64), nullable=False),
        sa.Column("latency", sa.Float, nullable=True),
        sa.Column("timestamp", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_agent_runs_agent_name", "agent_runs", ["agent_name"])
    op.create_index("ix_agent_runs_status", "agent_runs", ["status"])
    op.create_index("ix_agent_runs_timestamp", "agent_runs", ["timestamp"])

    # ── 11. model_predictions ─────────────────────────────────────
    op.create_table(
        "model_predictions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("model_version_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("model_versions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("transaction_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("transactions.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("recovery_case_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("recovery_cases.id", ondelete="SET NULL"), nullable=True),
        sa.Column("probability", sa.Float, nullable=False),
        sa.Column("confidence", sa.Float, nullable=False),
        sa.Column("prediction_data", postgresql.JSONB, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_model_predictions_transaction_id", "model_predictions", ["transaction_id"])
    op.create_index("ix_model_predictions_case_id", "model_predictions", ["recovery_case_id"])
    op.create_index("ix_model_predictions_model_version_id", "model_predictions", ["model_version_id"])

    # ── 12. ai_decisions ─────────────────────────────────────────
    op.create_table(
        "ai_decisions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("prediction_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("model_predictions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("recovery_case_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("recovery_cases.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("agent_run_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("agent_runs.id", ondelete="SET NULL"), nullable=True),
        sa.Column("recommendation", sa.String(255), nullable=False),
        sa.Column("rationale", sa.Text, nullable=True),
        sa.Column("confidence", sa.Float, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_ai_decisions_recovery_case_id", "ai_decisions", ["recovery_case_id"])
    op.create_index("ix_ai_decisions_prediction_id", "ai_decisions", ["prediction_id"])

    # ── 13. policy_evaluations ────────────────────────────────────
    op.create_table(
        "policy_evaluations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("policy_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("policies.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("policy_version", sa.Integer, nullable=False),
        sa.Column("recovery_case_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("recovery_cases.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("decision", sa.String(64), nullable=False),
        sa.Column("reason_code", sa.String(128), nullable=True),
        sa.Column("reason", sa.Text, nullable=True),
        sa.Column("risk_level", sa.String(64), nullable=True),
        sa.Column("requires_human_review", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("evaluated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("evaluation_data", postgresql.JSONB, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_policy_evaluations_policy_id", "policy_evaluations", ["policy_id"])
    op.create_index("ix_policy_evaluations_case_id", "policy_evaluations", ["recovery_case_id"])

    # ── 14. recovery_actions ──────────────────────────────────────
    op.create_table(
        "recovery_actions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("merchant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("merchants.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("recovery_case_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("recovery_cases.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("action_id", sa.String(255), nullable=False),
        sa.Column("state", sa.Enum("PROPOSED","APPROVED","REJECTED","EXECUTING","SUCCEEDED","FAILED","OUTCOME_UNKNOWN","CANCELLED", name="actionstate", create_type=False), nullable=False, server_default="PROPOSED"),
        sa.Column("execution_mode", sa.Enum("LIVE","SIMULATION", name="executionmode", create_type=False), nullable=False, server_default="LIVE"),
        sa.Column("idempotency_key", sa.String(800), nullable=False),
        sa.Column("policy_evaluation_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("policy_evaluations.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("idempotency_key", name="uq_recovery_actions_idempotency_key"),
    )
    op.create_index("ix_recovery_actions_merchant_id", "recovery_actions", ["merchant_id"])
    op.create_index("ix_recovery_actions_case_id", "recovery_actions", ["recovery_case_id"])
    op.create_index("ix_recovery_actions_state", "recovery_actions", ["state"])
    op.create_index("ix_recovery_actions_idempotency_key", "recovery_actions", ["idempotency_key"])

    # ── 15. recovery_attempts ─────────────────────────────────────
    op.create_table(
        "recovery_attempts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("recovery_action_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("recovery_actions.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("attempt_number", sa.Integer, nullable=False),
        sa.Column("state", sa.Enum("STARTED","SUCCEEDED","FAILED","TIMEOUT","UNKNOWN", name="attemptstate", create_type=False), nullable=False, server_default="STARTED"),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("error_code", sa.String(64), nullable=True),
        sa.Column("error_message", sa.Text, nullable=True),
        sa.Column("adapter_response_reference", sa.String(512), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("recovery_action_id", "attempt_number", name="uq_recovery_attempts_action_attempt"),
    )
    op.create_index("ix_recovery_attempts_action_id", "recovery_attempts", ["recovery_action_id"])
    op.create_index("ix_recovery_attempts_state", "recovery_attempts", ["state"])

    # ── 16. audit_events (append-only) ────────────────────────────
    op.create_table(
        "audit_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("merchant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("merchants.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("correlation_id", sa.String(255), nullable=False),
        sa.Column("recovery_case_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("recovery_cases.id", ondelete="SET NULL"), nullable=True),
        sa.Column("transaction_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("transactions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("event_type", sa.String(128), nullable=False),
        sa.Column("event_data", postgresql.JSONB, nullable=True),
        sa.Column("timestamp", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        # NOTE: No updated_at — this table is append-only
    )
    op.create_index("ix_audit_events_merchant_id", "audit_events", ["merchant_id"])
    op.create_index("ix_audit_events_correlation_id", "audit_events", ["correlation_id"])
    op.create_index("ix_audit_events_recovery_case_id", "audit_events", ["recovery_case_id"])
    op.create_index("ix_audit_events_transaction_id", "audit_events", ["transaction_id"])
    op.create_index("ix_audit_events_event_type", "audit_events", ["event_type"])
    op.create_index("ix_audit_events_timestamp", "audit_events", ["timestamp"])

    # ── 17. system_events ─────────────────────────────────────────
    op.create_table(
        "system_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("event_type", sa.String(128), nullable=False),
        sa.Column("source", sa.String(255), nullable=True),
        sa.Column("event_data", postgresql.JSONB, nullable=True),
        sa.Column("timestamp", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_system_events_event_type", "system_events", ["event_type"])
    op.create_index("ix_system_events_timestamp", "system_events", ["timestamp"])

    # ── 18. model_evaluations ─────────────────────────────────────
    op.create_table(
        "model_evaluations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("model_version_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("model_versions.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("precision", sa.Float, nullable=True),
        sa.Column("recall", sa.Float, nullable=True),
        sa.Column("f1", sa.Float, nullable=True),
        sa.Column("roc_auc", sa.Float, nullable=True),
        sa.Column("confusion_matrix", postgresql.JSONB, nullable=True),
        sa.Column("evaluation_dataset", sa.String(512), nullable=True),
        sa.Column("evaluated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_model_evaluations_model_version_id", "model_evaluations", ["model_version_id"])

    # ── 19. manual_reviews ────────────────────────────────────────
    op.create_table(
        "manual_reviews",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("merchant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("merchants.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("recovery_case_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("recovery_cases.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("reason", sa.Text, nullable=False),
        sa.Column("reviewer", sa.String(255), nullable=True),
        sa.Column("decision", sa.String(64), nullable=True),
        sa.Column("timestamp", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("comment", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_manual_reviews_merchant_id", "manual_reviews", ["merchant_id"])
    op.create_index("ix_manual_reviews_case_id", "manual_reviews", ["recovery_case_id"])

    # ── 20. simulation_runs ───────────────────────────────────────
    op.create_table(
        "simulation_runs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("merchant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("merchants.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("scenario", sa.String(255), nullable=False),
        sa.Column("execution_mode", sa.Enum("LIVE","SIMULATION", name="executionmode", create_type=False), nullable=False, server_default="SIMULATION"),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(64), nullable=False, server_default="PENDING"),
        sa.Column("configuration", postgresql.JSONB, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_simulation_runs_merchant_id", "simulation_runs", ["merchant_id"])
    op.create_index("ix_simulation_runs_status", "simulation_runs", ["status"])

    # ── 21. simulation_results ────────────────────────────────────
    op.create_table(
        "simulation_results",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("simulation_run_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("simulation_runs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("metric_name", sa.String(255), nullable=False),
        sa.Column("metric_value", sa.Float, nullable=True),
        sa.Column("metric_data", postgresql.JSONB, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_simulation_results_run_id", "simulation_results", ["simulation_run_id"])


def downgrade() -> None:
    # Drop tables in reverse dependency order
    op.drop_table("simulation_results")
    op.drop_table("simulation_runs")
    op.drop_table("manual_reviews")
    op.drop_table("model_evaluations")
    op.drop_table("system_events")
    op.drop_table("audit_events")
    op.drop_table("recovery_attempts")
    op.drop_table("recovery_actions")
    op.drop_table("policy_evaluations")
    op.drop_table("ai_decisions")
    op.drop_table("model_predictions")
    op.drop_table("agent_runs")
    op.drop_table("model_versions")
    op.drop_table("policy_versions")
    op.drop_table("policies")
    op.drop_table("recovery_opportunities")
    op.drop_table("recovery_cases")
    op.drop_table("transactions")
    op.drop_table("customers")
    op.drop_table("merchants")
    op.drop_table("users")

    # Drop enum types
    sa.Enum(name="executionmode").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="attemptstate").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="actionstate").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="casestate").drop(op.get_bind(), checkfirst=True)
