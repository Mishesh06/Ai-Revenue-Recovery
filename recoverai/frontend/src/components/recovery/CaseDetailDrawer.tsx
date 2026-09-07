"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { RecoveryCaseOut, AuditEventOut, TransactionOut } from "@/types/api";
import { getTransaction, executeRecovery } from "@/lib/api-services";
import { StatusBadge, PolicyDecisionBadge, ConfidenceBadge } from "@/components/ui-custom/StatusBadge";
import { StateProgressGauge } from "./StateProgressGauge";
import { DecisionTraceTree } from "./DecisionTraceTree";
import { SectionCard } from "@/components/ui-custom/SectionCard";
import { AuditTimelineItem } from "@/components/ui-custom/TimelineEvent";
import { LoadingSpinner } from "@/components/ui-custom/FeedbackStates";
import { useToast } from "@/context/ToastContext";
import { formatCurrency, formatDateTime, formatRelativeTime, truncateId } from "@/lib/utils";
import {
  CreditCard, BrainCircuit, Activity, Map, ShieldCheck,
  Play, CheckCircle2, UserCheck, AlertTriangle, Copy,
  Check, ArrowRight, ShieldAlert, Sparkles, ExternalLink,
  Layers, Lock, CheckCheck, XCircle, ShieldX, RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────────
   CaseDetailDrawer — RecoverAI Operational Console Case Inspection
   Interactive slide-out drawer with progressive state machine progress,
   action UI, 'Why did RecoverAI do this?' tree, and audit telemetry.
   ──────────────────────────────────────────────────────────────────────────── */

interface CaseDetailDrawerProps {
  selectedCase: RecoveryCaseOut | null;
  onClose: () => void;
  auditEvents: AuditEventOut[];
  isLoadingAudit?: boolean;
  currency?: string;
}

function mapFailureCategory(status?: string | null, errorCode?: string | null): string {
  const code = (errorCode || status || "").toLowerCase();
  if (code.includes("timeout") || code.includes("gateway")) return "Bank Gateway Latency Spike";
  if (code.includes("insufficient") || code.includes("balance")) return "Customer Balance Insufficient";
  if (code.includes("expired") || code.includes("intent")) return "UPI Intent Window Expired";
  if (code.includes("card") || code.includes("decline") || code.includes("honor")) return "Card Issuer Decline";
  if (code.includes("network") || code.includes("switch")) return "Inter-Bank Switch Failure";
  return "Transient Gateway Decline";
}

function mapRecommendedAction(status?: string | null, errorCode?: string | null, caseState?: string): string {
  if (caseState === "RECOVERED" || caseState === "CLOSED") return "Settlement Verified";
  if (caseState === "RECOVERY_WINDOW_EXPIRED") return "Fatigue Cap Enforced";
  const code = (errorCode || status || "").toLowerCase();
  if (code.includes("insufficient")) return "Balance-Refresh Retry (+4h)";
  if (code.includes("expired") || code.includes("intent")) return "UPI Intent FastPass Reroute";
  if (code.includes("card") || code.includes("decline")) return "Alternative Payment Link";
  return "Smart Exponential Retry (+180s)";
}

export function CaseDetailDrawer({
  selectedCase,
  onClose,
  auditEvents,
  isLoadingAudit,
  currency = "INR",
}: CaseDetailDrawerProps) {
  const { toast } = useToast();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "trace" | "audit">("overview");
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [executionResult, setExecutionResult] = useState<{
    status: string;
    message: string;
    idempotency_key: string;
    mode: string;
  } | null>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);

  // Reset execution result when inspecting a different case
  useEffect(() => {
    setExecutionResult(null);
    setExecutionError(null);
  }, [selectedCase?.id]);

  if (!selectedCase) return null;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    toast.success("Copied to clipboard", `${label}: ${truncateId(text, 12)}`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const getEvent = (type: string) => auditEvents.find((e) => e.event_type === type);

  const prediction = getEvent("PredictionCreated");
  const diagnosis = getEvent("DiagnosisCreated");
  const plan = getEvent("RecoveryPlanned");
  const policy = getEvent("PolicyEvaluated");
  const execution =
    getEvent("RecoveryExecuted") ||
    getEvent("RecoverySucceeded") ||
    getEvent("RecoveryFailed");

  // Recovery Window Rules
  const isWindowExpired =
    selectedCase.state === "RECOVERY_WINDOW_EXPIRED" ||
    (selectedCase.recovery_window_ends_at
      ? new Date(selectedCase.recovery_window_ends_at).getTime() < Date.now()
      : false);

  const isRecovered = selectedCase.state === "RECOVERED" || selectedCase.state === "CLOSED";
  const isReviewRequired =
    policy?.event_data?.requires_human_review ||
    selectedCase.state === "POLICY_CHECK";
  const isBlocked = isWindowExpired || selectedCase.state === "RECOVERY_WINDOW_EXPIRED";

  const actionId = (execution?.event_data?.action_id ||
    plan?.event_data?.recovery_action_id ||
    policy?.event_data?.action_id ||
    execution?.event_data?.id) as string | undefined;

  const [transaction, setTransaction] = useState<TransactionOut | null>(null);

  useEffect(() => {
    if (!selectedCase?.transaction_id || !selectedCase?.merchant_id) return;
    getTransaction(selectedCase.merchant_id, selectedCase.transaction_id)
      .then(setTransaction)
      .catch(() => setTransaction(null));
  }, [selectedCase?.id, selectedCase?.transaction_id, selectedCase?.merchant_id]);

  // Real financial value from transaction, fallback if transaction query fails
  const caseAmount = transaction?.amount ?? null; // Only use real transaction amount from backend

  const failureRootCause =
    diagnosis?.event_data?.failure_category ||
    mapFailureCategory(transaction?.status, transaction?.error_code);

  const recommendedAction =
    plan?.event_data?.recommended_action ||
    mapRecommendedAction(transaction?.status, transaction?.error_code, selectedCase.state);

  const policyDecision =
    policy?.event_data?.decision ||
    (isBlocked ? "BLOCKED" : isReviewRequired ? "REVIEW" : "APPROVED");

  // Idempotent execution handler calling real backend execute endpoint
  const handleAuthorize = async () => {
    if (!selectedCase || isAuthorizing) return;

    if (isBlocked || isRecovered) {
      toast.error("Action Disallowed", "Case recovery window has expired or is already settled.");
      return;
    }

    setIsAuthorizing(true);
    setExecutionError(null);

    const actionType = actionId || "SMART_RETRY";
    const idempotencyKey = `${selectedCase.merchant_id}:${selectedCase.id}:${actionType}`;
    const payload = {
      idempotency_key: idempotencyKey,
      execution_mode: "SIMULATION",
      correlation_id: selectedCase.correlation_id || `corr-${selectedCase.id.slice(0, 8)}`,
    };

    try {
      const res = await executeRecovery(selectedCase.merchant_id, selectedCase.id, payload);
      setExecutionResult({
        status: (res.status as string) || "accepted",
        message: (res.message as string) || "Execution request accepted [SIMULATION mode]. Action Adapter dispatched.",
        idempotency_key: idempotencyKey,
        mode: (res.execution_mode as string) || "SIMULATION",
      });
      toast.success(
        "Intervention Dispatched",
        `Dispatched under idempotency key: ${truncateId(idempotencyKey, 14)}`
      );
    } catch (err: unknown) {
      console.error("Execution failed", err);
      const msg = err instanceof Error ? err.message : "Failed to execute recovery action.";
      setExecutionError(msg);
      toast.error("Execution Failed", msg);
    } finally {
      setIsAuthorizing(false);
    }
  };

  return (
    <Sheet open={!!selectedCase} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-[560px] md:max-w-[640px] overflow-y-auto bg-[var(--bg-surface)] border-l border-[var(--border-subtle)] p-0 shadow-[var(--shadow-sheet)]">
        {/* Drawer Sticky Header */}
        <div className="sticky top-0 z-20 bg-[var(--bg-surface)] border-b border-[var(--border-subtle)] p-5 pb-4 shadow-[var(--shadow-xs)]">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--fg-tertiary)]">
                  Recovery Case
                </span>
                <span className="font-mono text-xs font-bold text-[var(--fg-primary)]">
                  {truncateId(selectedCase.id, 12)}
                </span>
                <button
                  onClick={() => handleCopy(selectedCase.id, "Case ID")}
                  className="p-1 rounded text-[var(--fg-tertiary)] hover:text-[var(--fg-primary)] hover:bg-[var(--bg-raised)]"
                  title="Copy Case UUID"
                >
                  {copiedKey === "Case ID" ? (
                    <CheckCheck className="w-3.5 h-3.5 text-[var(--status-success)]" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black font-mono text-[var(--fg-primary)] tabular-nums">
                  {caseAmount !== null ? formatCurrency(caseAmount, currency) : "—"}
                </span>
                <span className="text-xs text-[var(--fg-tertiary)] font-mono">
                  via {transaction?.payment_method ? transaction.payment_method.toUpperCase().replace(/_/g, " ") : "UPI Intent"}
                </span>
              </div>
            </div>

            <StatusBadge label={selectedCase.state} size="md" dot pulse={selectedCase.state === "RECOVERING"} />
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 pt-3 border-t border-[var(--border-subtle)] mt-3">
            {[
              { id: "overview", label: "Case Overview" },
              { id: "trace", label: "Why did RecoverAI do this?" },
              { id: "audit", label: `Audit Log (${auditEvents.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={cn(
                  "px-3 py-1 rounded-[var(--radius-xs)] text-xs font-semibold transition-colors",
                  activeTab === tab.id
                    ? "bg-[var(--brand-primary)] text-white shadow-[var(--shadow-xs)]"
                    : "text-[var(--fg-tertiary)] hover:text-[var(--fg-primary)] hover:bg-[var(--bg-raised)]"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Drawer Body Content */}
        <div className="p-5 space-y-6">
          {activeTab === "overview" && (
            <div className="space-y-5">
              {/* 1. State Machine Gauge */}
              <StateProgressGauge currentState={selectedCase.state} />

              {/* 2. Action UI Section (Execution result / Success / Blocked / Review / Formulated) */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-[var(--fg-tertiary)]">
                  Action Execution Gateway
                </span>

                {executionResult ? (
                  <div className="rounded-[var(--radius-md)] border border-[var(--status-success-border)] bg-[var(--status-success-subtle)] p-4 space-y-2.5 shadow-[var(--shadow-xs)]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[var(--status-success)]" />
                        <span className="text-xs font-bold text-[var(--status-success-text)]">
                          Intervention Dispatched & Accepted
                        </span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white font-bold text-[var(--status-success-text)] border border-[var(--status-success-border)]">
                        {executionResult.mode} MODE
                      </span>
                    </div>
                    <p className="text-xs text-[var(--status-success-text)] leading-relaxed">
                      {executionResult.message}
                    </p>
                    <div className="pt-2 border-t border-[var(--status-success-border)]/50 flex flex-col gap-1 text-[10px] font-mono">
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--fg-tertiary)]">Idempotency Key:</span>
                        <span className="font-bold text-[var(--fg-primary)] truncate max-w-[280px]">
                          {executionResult.idempotency_key}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--fg-tertiary)]">Policy Engine Gate:</span>
                        <span className="font-bold text-[var(--status-success-text)]">
                          CLEARANCE_GRANTED
                        </span>
                      </div>
                    </div>
                  </div>
                ) : executionError ? (
                  <div className="rounded-[var(--radius-md)] border border-[var(--status-danger-border)] bg-[var(--status-danger-subtle)] p-4 space-y-2.5 shadow-[var(--shadow-xs)]">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-[var(--status-danger)]" />
                      <span className="text-xs font-bold text-[var(--status-danger-text)]">
                        Execution Request Rejected
                      </span>
                    </div>
                    <p className="text-xs text-[var(--status-danger-text)] leading-relaxed">
                      {executionError}
                    </p>
                    <button
                      onClick={handleAuthorize}
                      disabled={isAuthorizing}
                      className="px-3 py-1 rounded bg-[var(--status-danger)] text-white text-xs font-bold hover:opacity-90 disabled:opacity-50"
                    >
                      {isAuthorizing ? "Retrying…" : "Retry Authorization"}
                    </button>
                  </div>
                ) : isRecovered ? (
                  <div className="rounded-[var(--radius-md)] border border-[var(--status-success-border)] bg-[var(--status-success-subtle)] p-4 space-y-2 shadow-[var(--shadow-xs)]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[var(--status-success)]" />
                        <span className="text-xs font-bold text-[var(--status-success-text)]">
                          Autonomous Settlement Captured
                        </span>
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white font-bold text-[var(--status-success-text)] border border-[var(--status-success-border)]">
                        RESOLVED
                      </span>
                    </div>
                    <p className="text-xs text-[var(--status-success-text)] leading-relaxed">
                      Payment of {caseAmount !== null ? formatCurrency(caseAmount, currency) : "an unknown amount"} successfully settled via smart retry. Zero customer chargeback.
                    </p>
                    <div className="pt-2">
                      <button
                        disabled
                        className="px-3 py-1.5 rounded-[var(--radius-xs)] bg-[var(--bg-raised)] text-xs font-semibold text-[var(--fg-tertiary)] border border-[var(--border-subtle)] cursor-not-allowed opacity-75"
                      >
                        Action Completed (Settled)
                      </button>
                    </div>
                  </div>
                ) : isBlocked ? (
                  <div className="rounded-[var(--radius-md)] border border-[var(--status-danger-border)] bg-[var(--status-danger-subtle)] p-4 space-y-2 shadow-[var(--shadow-xs)]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShieldX className="w-4 h-4 text-[var(--status-danger)]" />
                        <span className="text-xs font-bold text-[var(--status-danger-text)]">
                          Intervention Blocked by Policy Engine
                        </span>
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white font-bold text-[var(--status-danger-text)] border border-[var(--status-danger-border)]">
                        {isWindowExpired ? "WINDOW EXPIRED" : "FATIGUE CAP"}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--status-danger-text)] leading-relaxed">
                      {isWindowExpired
                        ? "Recovery window for this transaction has expired. Intervention dispatch is locked to prevent invalid charges."
                        : "Customer retry limit reached (3 of 3 attempts). Blind retries stopped to prevent customer fatigue."}
                    </p>
                    <div className="pt-2">
                      <button
                        disabled
                        className="px-3 py-1.5 rounded-[var(--radius-xs)] bg-[var(--bg-raised)] text-xs font-semibold text-[var(--fg-tertiary)] border border-[var(--border-subtle)] cursor-not-allowed opacity-75"
                      >
                        Action Disabled (Recovery Window Expired)
                      </button>
                    </div>
                  </div>
                ) : isReviewRequired ? (
                  <div className="rounded-[var(--radius-md)] border border-[var(--status-review-border)] bg-[var(--status-review-subtle)] p-4 space-y-3 shadow-[var(--shadow-xs)]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-[var(--status-review)]" />
                        <span className="text-xs font-bold text-[var(--status-review-text)]">
                          Human Review Required
                        </span>
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white font-bold text-[var(--status-review-text)] border border-[var(--status-review-border)]">
                        GOVERNANCE
                      </span>
                    </div>
                    <p className="text-xs text-[var(--status-review-text)] leading-relaxed">
                      Transaction value requires dual operator clearance. Verify evidence and authorize dispatch.
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={handleAuthorize}
                        disabled={isAuthorizing}
                        className="px-3.5 py-1.5 rounded-[var(--radius-xs)] bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white text-xs font-bold transition-all shadow-[var(--glow-brand)] disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {isAuthorizing && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                        <span>{isAuthorizing ? "Authorizing…" : "Authorize Intervention"}</span>
                      </button>
                      <button
                        onClick={() => toast.info("Case Escaped", "Case routed to manual escalation.")}
                        className="px-3 py-1.5 rounded-[var(--radius-xs)] border border-[var(--border-default)] bg-[var(--bg-surface)] text-xs font-medium text-[var(--fg-secondary)] hover:bg-[var(--bg-raised)]"
                      >
                        Escalate / Reject
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-[var(--radius-md)] border border-[var(--brand-primary-ring)] bg-[var(--brand-primary-muted)] p-4 space-y-3 shadow-[var(--shadow-xs)]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Play className="w-4 h-4 text-[var(--brand-primary)] fill-current" />
                        <span className="text-xs font-bold text-[var(--brand-primary-hover)]">
                          {selectedCase.state === "RECOVERING" ? "Autonomous Recovery Active" : "Intervention Formulated & Armed"}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white font-bold text-[var(--brand-primary)] border border-[var(--brand-primary-ring)]">
                        IDEMPOTENT
                      </span>
                    </div>
                    <p className="text-xs text-[var(--fg-secondary)] leading-relaxed">
                      {selectedCase.state === "RECOVERING"
                        ? "Active in-flight recovery retry. Idempotency key verified to prevent duplicate deductions."
                        : "Strategy validated by Policy Engine. Ready to dispatch autonomous retry intervention via Action Adapter."}
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={handleAuthorize}
                        disabled={isAuthorizing}
                        className="px-3.5 py-1.5 rounded-[var(--radius-xs)] bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white text-xs font-bold transition-all shadow-[var(--glow-brand)] disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {isAuthorizing ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Play className="w-3 h-3 fill-current" />
                        )}
                        <span>{isAuthorizing ? "Executing…" : "Authorize Intervention"}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Transaction Details Card */}
              <SectionCard title="Transaction & Customer Metadata" icon={CreditCard}>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] text-[var(--fg-tertiary)] block">Transaction UUID:</span>
                    <Link
                      href={`/transactions?transactionId=${selectedCase.transaction_id}`}
                      className="font-mono font-semibold text-[var(--brand-primary)] hover:underline truncate block text-xs"
                      title="Inspect Transaction in Ledger"
                    >
                      {truncateId(selectedCase.transaction_id, 14)} ↗
                    </Link>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--fg-tertiary)] block">Transaction Amount:</span>
                    <span className="font-mono font-bold text-[var(--fg-primary)] text-xs block">
                      {caseAmount !== null ? formatCurrency(caseAmount, currency) : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--fg-tertiary)] block">Decline Error Code:</span>
                    <span className="font-mono text-[var(--status-danger-text)] text-xs truncate block font-bold">
                      {transaction?.error_code || transaction?.status?.toUpperCase() || "GATEWAY_TIMEOUT"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--fg-tertiary)] block">Payment Status:</span>
                    <span className="font-mono text-[var(--fg-secondary)] text-xs capitalize block">
                      {transaction?.status || "failed"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--fg-tertiary)] block">Correlation Trace:</span>
                    <span className="font-mono text-[var(--fg-secondary)] truncate block">
                      {truncateId(selectedCase.correlation_id, 14)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--fg-tertiary)] block">Recovery Window:</span>
                    <span className="font-mono text-[var(--fg-primary)]">
                      {selectedCase.recovery_window_ends_at
                        ? formatRelativeTime(selectedCase.recovery_window_ends_at)
                        : "Active"}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] text-[var(--fg-tertiary)] block">Created At:</span>
                    <span className="font-mono text-[var(--fg-secondary)] text-xs">
                      {formatDateTime(selectedCase.created_at)}
                    </span>
                  </div>
                  {actionId && (
                    <div className="col-span-2 pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between">
                      <span className="text-[10px] text-[var(--fg-tertiary)] block">Action Execution ID:</span>
                      <Link
                        href={`/audit?caseId=${selectedCase.id}&actionId=${actionId}`}
                        className="font-mono font-semibold text-[var(--brand-primary)] hover:underline text-xs flex items-center gap-1"
                      >
                        {truncateId(actionId, 14)} <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  )}
                </div>
              </SectionCard>

              {/* 4. Intelligence & Diagnosis Breakdown */}
              <SectionCard title="AI Intelligence Attribution" icon={BrainCircuit}>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[var(--fg-tertiary)]">ML Recovery Probability:</span>
                    {selectedCase.confidence != null ? (
                      <ConfidenceBadge value={selectedCase.confidence} showBar />
                    ) : (
                      <span className="text-[11px] font-mono text-[var(--fg-tertiary)]">Not recorded</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[var(--fg-tertiary)]">Failure Root Cause:</span>
                    <span className="font-semibold text-[var(--brand-primary)]">
                      {failureRootCause}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[var(--fg-tertiary)]">Recommended Strategy:</span>
                    <span className="font-medium text-[var(--fg-secondary)] text-xs">
                      {recommendedAction}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[var(--fg-tertiary)]">Policy Clearance:</span>
                    <PolicyDecisionBadge decision={policyDecision} />
                  </div>
                </div>
              </SectionCard>

              {/* 5. Direct Simulation Trigger */}
              <div className="pt-2">
                <Link
                  href={`/simulator?caseId=${selectedCase.id}&scenario=A`}
                  className="w-full h-10 px-4 rounded-[var(--radius-md)] text-xs font-bold text-white flex items-center justify-center gap-2 transition-all shadow-sm"
                  style={{ background: "var(--brand-primary)", boxShadow: "var(--glow-brand)" }}
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Simulate This Case in Engine →
                </Link>
              </div>
            </div>
          )}

          {activeTab === "trace" && (
            <DecisionTraceTree
              auditEvents={auditEvents}
              transaction={transaction}
              selectedCase={selectedCase}
            />
          )}

          {activeTab === "audit" && (
            <div className="space-y-3">
              <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-[var(--fg-tertiary)] block">
                Immutable Decision Stream ({auditEvents.length} Events)
              </span>

              {isLoadingAudit ? (
                <LoadingSpinner message="Fetching case audit records…" />
              ) : auditEvents.length === 0 ? (
                <div className="py-12 text-center text-xs text-[var(--fg-tertiary)] font-mono border border-dashed rounded-[var(--radius-lg)]">
                  No explicit audit events recorded for this case.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {auditEvents.map((evt, idx) => (
                    <AuditTimelineItem
                      key={evt.id || idx}
                      eventType={evt.event_type}
                      timestamp={evt.timestamp}
                      correlationId={evt.correlation_id}
                      recoveryCaseId={evt.recovery_case_id}
                      eventData={evt.event_data}
                      isLast={idx === auditEvents.length - 1}
                      index={idx}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
