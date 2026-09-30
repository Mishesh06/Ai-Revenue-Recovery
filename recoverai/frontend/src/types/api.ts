// ─────────────────────────────────────────────────────────────────────
// PayRecover v3.2 — API Response Types
// MUST match actual FastAPI response schemas exactly.
// ─────────────────────────────────────────────────────────────────────

// ── Enums (actual DB values) ─────────────────────────────────────────
export type CaseState =
  | "DETECTED" | "ANALYZING" | "PREDICTED" | "DIAGNOSED"
  | "PLANNED" | "POLICY_CHECK" | "RECOVERING" | "RECOVERED"
  | "RECOVERY_WINDOW_EXPIRED" | "CLOSED";

export type ActionState =
  | "PROPOSED" | "APPROVED" | "REJECTED" | "EXECUTING"
  | "SUCCEEDED" | "FAILED" | "OUTCOME_UNKNOWN" | "CANCELLED";

export type AttemptState =
  | "STARTED" | "SUCCEEDED" | "FAILED" | "TIMEOUT" | "UNKNOWN";

// ── Dashboard / Analytics ─────────────────────────────────────────────
export interface RecoverySummary {
  total_cases: number;
  cases_recovered: number;
  cases_pending: number;
  cases_expired: number;
  recovery_rate: number;
  intervention_success_rate: number;
}

export interface FinancialSummary {
  total_failed_amount: number;
  total_recovered_amount: number;
  recoverable_revenue: number;
  revenue_at_risk: number;
  recovery_cost: number;
  avoided_loss: number;
  net_revenue_impact: number;
  currency: string;
}

export interface RevenueLeakMap {
  total_revenue: number;
  successful: number;
  failed: number;
  temporary_failure: number;
  expired_card: number;
  other_failure: number;
  recoverable: number;
  recovered: number;
}

export interface AgentSummary {
  total_runs: number;
  successful_runs: number;
  failed_runs: number;
  avg_latency_ms: number | null;
}

export interface DashboardResponse {
  merchant_id: string;
  recovery: RecoverySummary;
  financial: FinancialSummary;
  leak_map: RevenueLeakMap;
  agents: AgentSummary;
  message: string;
}

// ── Transaction ───────────────────────────────────────────────────────
export interface TransactionOut {
  id: string;
  merchant_id: string;
  customer_id?: string;
  external_transaction_id?: string;
  amount: number;
  currency: string;
  status: string;
  payment_method?: string;
  failed_at?: string;
  error_code?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

// ── Recovery Case ────────────────────────────────────────────────────
export interface RecoveryCaseOut {
  id: string;
  merchant_id: string;
  transaction_id: string;
  state: CaseState;
  correlation_id: string;
  confidence?: number;
  recovery_window_started_at?: string;
  recovery_window_ends_at?: string;
  recovered_at?: string;
  created_at: string;
  updated_at: string;
}

// ── Recovery Action ──────────────────────────────────────────────────
export interface RecoveryActionOut {
  id: string;
  merchant_id: string;
  recovery_case_id: string;
  action_id: string;
  state: ActionState;
  execution_mode: "LIVE" | "SIMULATION";
  idempotency_key: string;
  created_at: string;
  updated_at: string;
}

// ── Recovery Attempt ─────────────────────────────────────────────────
export interface RecoveryAttemptOut {
  id: string;
  recovery_action_id: string;
  attempt_number: number;
  state: AttemptState;
  started_at?: string;
  completed_at?: string;
  error_code?: string;
  error_message?: string;
}

// ── Policy ───────────────────────────────────────────────────────────
export interface PolicyOut {
  id: string;
  merchant_id: string;
  name: string;
  description?: string;
  rules: Record<string, any>;
  is_active: boolean;
  created_at: string;
}

export interface PolicyEvaluationOut {
  decision: "APPROVED" | "REVIEW" | "BLOCKED";
  reason_code: string;
  reason: string;
  policy_id: string;
  policy_version: string;
  evaluated_at: string;
  risk_level: string;
  requires_human_review: boolean;
}

// ── Agent ─────────────────────────────────────────────────────────────
export interface AgentRunOut {
  id: string;
  agent_name: string;
  agent_version: string;
  input_reference?: string | null;
  output?: Record<string, any> | null;
  status: string;
  latency?: number | null;
  timestamp?: string;
  created_at?: string;
}

export interface AgentHealthItem {
  agent_name: string;
  last_run_status: string | null;
  last_run_at: string | null;
  total_runs: number;
  success_rate: number | null;
}

export interface AgentStatusResponse {
  agents: AgentHealthItem[];
  message: string;
}

export interface AgentActivityResponse {
  recent_runs: AgentRunOut[];
  total: number;
  message: string;
}

// ── Manual Review ─────────────────────────────────────────────────────
export interface ManualReviewOut {
  id: string;
  merchant_id: string;
  recovery_case_id: string;
  reason: string;
  reviewer?: string | null;
  decision?: string | null;
  timestamp?: string;
  comment?: string | null;
  created_at: string;
  updated_at?: string;
}

// ── Simulation ───────────────────────────────────────────────────────
export interface SimulationMetricsOut {
  transactions_analyzed?: number;
  opportunities_detected?: number;
  actions_approved?: number;
  successful_recoveries?: number;
  revenue_recovered?: number;
  recovery_rate?: number;
  policy_blocks?: number;
  manual_reviews?: number;
  unknown_outcomes?: number;
}

export interface SimulationCreateRequest {
  scenario: string;
  execution_mode?: "LIVE" | "SIMULATION";
  configuration?: Record<string, any>;
}

export interface SimulationCreateResponse {
  simulation_id: string;
  scenario: string;
  execution_mode: "LIVE" | "SIMULATION";
  status: string;
  message: string;
  metrics: SimulationMetricsOut;
  generated_cases: string[];
}

export interface SimulationRunOut {
  id: string;
  merchant_id: string;
  scenario: string;
  status: string;
  metrics?: SimulationMetricsOut;
  created_at: string;
}

export interface SimulationResultOut {
  id: string;
  simulation_run_id: string;
  metric_name: string;
  metric_value: number;
}

// ── Analytics Time-Series ─────────────────────────────────────────────
export interface AnalyticsTimeSeriesPoint {
  date: string;
  value: number;
}

export interface AnalyticsResponse {
  merchant_id: string;
  recovery_rate_series: AnalyticsTimeSeriesPoint[];
  failed_amount_series: AnalyticsTimeSeriesPoint[];
  recovered_amount_series: AnalyticsTimeSeriesPoint[];
  message: string;
}

// ── Audit ─────────────────────────────────────────────────────────────
export interface AuditEventOut {
  id: string;
  merchant_id: string;
  recovery_case_id?: string;
  transaction_id?: string;
  correlation_id: string;
  event_type: string;
  event_data: Record<string, any> | null;
  timestamp: string;
}

// ── Pagination ────────────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

// ── Errors ────────────────────────────────────────────────────────────
export interface APIError {
  detail: string | Array<{ loc: string[]; msg: string; type: string }>;
}
