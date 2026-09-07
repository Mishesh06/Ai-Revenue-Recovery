"use client";

import React from "react";
import Link from "next/link";
import {
  CheckCircle2, AlertTriangle, ShieldCheck, ShieldAlert,
  ArrowRight, ExternalLink, RefreshCw, Sparkles, Building2,
  Lock, CreditCard, Activity, ArrowUpRight, Copy, CheckCheck
} from "lucide-react";
import { formatCurrency, formatTime, formatPercent, truncateId, cn } from "@/lib/utils";
import { SimulationMetricsOut, AuditEventOut } from "@/types/api";
import { useToast } from "@/context/ToastContext";

interface SimulationResultCardProps {
  scenario: string;
  scenarioName: string;
  caseId: string;
  transactionId?: string | null;
  originalAmount?: number | null;
  recoveredAmount?: number | null;
  recoveryOutcome: "SUCCEEDED" | "REVIEW_REQUIRED" | "TIMEOUT_LOCKED" | "BLOCKED";
  actionTaken: string;
  attemptOutcome: string;
  finalCaseState: string;
  policyDecision: "APPROVED" | "REVIEW" | "BLOCKED";
  policyReason?: string | null;
  executionMode?: string;
  metrics?: SimulationMetricsOut | null;
  auditEvents?: AuditEventOut[];
  className?: string;
}

export function SimulationResultCard({
  scenario,
  scenarioName,
  caseId,
  transactionId,
  originalAmount,
  recoveredAmount,
  recoveryOutcome,
  actionTaken,
  attemptOutcome,
  finalCaseState,
  policyDecision,
  policyReason,
  executionMode = "SIMULATION",
  metrics,
  auditEvents = [],
  className,
}: SimulationResultCardProps) {
  const { toast } = useToast();
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    toast.success("Copied to clipboard", `${label}: ${truncateId(text, 12)}`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const isSuccess = recoveryOutcome === "SUCCEEDED";
  const isReview = recoveryOutcome === "REVIEW_REQUIRED";
  const isTimeout = recoveryOutcome === "TIMEOUT_LOCKED";
  const isBlocked = recoveryOutcome === "BLOCKED";

  const outcomeTitle = isSuccess
    ? "Autonomous Recovery Confirmed"
    : isReview
    ? "Human Review Required"
    : isTimeout
    ? "Safe Failover Lock Active"
    : "Intervention Halted by Policy";

  const outcomeBadgeVariant = isSuccess
    ? "bg-[var(--status-success-subtle)] text-[var(--status-success-text)] border-[var(--status-success-border)]"
    : isReview
    ? "bg-[var(--status-review-subtle)] text-[var(--status-review-text)] border-[var(--status-review-border)]"
    : isTimeout
    ? "bg-[var(--status-danger-subtle)] text-[var(--status-danger-text)] border-[var(--status-danger-border)]"
    : "bg-[var(--status-warning-subtle)] text-[var(--status-warning-text)] border-[var(--status-warning-border)]";

  const resolvedRecoveredAmount = recoveredAmount ?? (metrics?.revenue_recovered || 0);

  return (
    <div
      className={cn(
        "rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-[var(--shadow-sm)] space-y-6 transition-all",
        className
      )}
    >
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--brand-primary-muted)] text-[var(--brand-primary-light)] border border-[var(--brand-primary-ring)]">
              SCENARIO {scenario} OUTCOME
            </span>
            <span className={cn("text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase", outcomeBadgeVariant)}>
              {outcomeTitle}
            </span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--bg-raised)] text-[var(--fg-tertiary)] border border-[var(--border-subtle)]">
              MODE: {executionMode}
            </span>
          </div>

          <h3 className="text-xl sm:text-2xl font-black text-[var(--fg-primary)] tracking-tight">
            {isSuccess ? (
              <span className="text-[var(--status-success-text)]">
                {formatCurrency(resolvedRecoveredAmount, "INR")} recovered
              </span>
            ) : isReview ? (
              <span className="text-[var(--status-review-text)]">
                ₹0.00 recovered — Escalated for Operator Review
              </span>
            ) : isTimeout ? (
              <span className="text-[var(--status-danger-text)]">
                ₹0.00 recovered — Gateway Timeout (Zero Blind Retries)
              </span>
            ) : (
              <span className="text-[var(--status-warning-text)]">
                ₹0.00 recovered — Policy Limit Enforced
              </span>
            )}
          </h3>
          <p className="text-xs text-[var(--fg-secondary)] mt-1">
            {scenarioName} — Verified against deterministic policy rules and settlement ledger.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/recovery?caseId=${caseId}`}
            className="h-8 px-3 rounded-[var(--radius-sm)] text-xs font-semibold text-[var(--fg-primary)] bg-[var(--bg-surface-alt)] hover:bg-[var(--bg-raised)] border border-[var(--border-subtle)] flex items-center gap-1.5 transition-colors"
          >
            <span>Case File</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          {(isReview || isTimeout) && (
            <Link
              href={`/review?caseId=${caseId}`}
              className="h-8 px-3 rounded-[var(--radius-sm)] text-xs font-bold text-white transition-all flex items-center gap-1.5"
              style={{ background: "var(--brand-primary)", boxShadow: "var(--glow-brand)" }}
            >
              <span>Review Queue</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          )}
          <Link
            href={`/audit?recovery_case_id=${caseId}`}
            className="h-8 px-3 rounded-[var(--radius-sm)] text-xs font-semibold text-[var(--fg-secondary)] hover:text-[var(--fg-primary)] bg-[var(--bg-surface-alt)] border border-[var(--border-subtle)] flex items-center gap-1.5 transition-colors"
          >
            <span>Audit Trail</span>
          </Link>
        </div>
      </div>

      {/* Primary Business Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Capital Impact */}
        <div className="p-4 rounded-[var(--radius-lg)] bg-[var(--bg-surface-alt)] border border-[var(--border-subtle)] space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--fg-tertiary)] block">
            Original Transaction Amount
          </span>
          <div className="text-lg font-black font-mono text-[var(--fg-primary)]">
            {originalAmount != null ? formatCurrency(originalAmount, "INR") : formatCurrency(resolvedRecoveredAmount, "INR")}
          </div>
          <span className="text-[11px] text-[var(--fg-quaternary)] block">
            Failed invoice value in INR
          </span>
        </div>

        {/* Metric 2: Policy Decision */}
        <div className="p-4 rounded-[var(--radius-lg)] bg-[var(--bg-surface-alt)] border border-[var(--border-subtle)] space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--fg-tertiary)] block">
            Policy Decision
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className={cn(
                "text-xs font-mono font-bold px-2 py-0.5 rounded border uppercase",
                policyDecision === "APPROVED"
                  ? "bg-[var(--status-success-subtle)] text-[var(--status-success-text)] border-[var(--status-success-border)]"
                  : policyDecision === "REVIEW"
                  ? "bg-[var(--status-review-subtle)] text-[var(--status-review-text)] border-[var(--status-review-border)]"
                  : "bg-[var(--status-warning-subtle)] text-[var(--status-warning-text)] border-[var(--status-warning-border)]"
              )}
            >
              {policyDecision}
            </span>
          </div>
          <span className="text-[11px] text-[var(--fg-quaternary)] block truncate" title={policyReason || "Rule evaluated"}>
            {policyReason || "Deterministic boundary pass"}
          </span>
        </div>

        {/* Metric 3: Action Taken */}
        <div className="p-4 rounded-[var(--radius-lg)] bg-[var(--bg-surface-alt)] border border-[var(--border-subtle)] space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--fg-tertiary)] block">
            Action Taken
          </span>
          <div className="text-sm font-bold text-[var(--fg-primary)] truncate mt-0.5" title={actionTaken}>
            {actionTaken}
          </div>
          <span className="text-[11px] text-[var(--fg-quaternary)] block truncate">
            {attemptOutcome}
          </span>
        </div>

        {/* Metric 4: Final Case State */}
        <div className="p-4 rounded-[var(--radius-lg)] bg-[var(--bg-surface-alt)] border border-[var(--border-subtle)] space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--fg-tertiary)] block">
            Final Case State
          </span>
          <div className="text-sm font-mono font-bold text-[var(--brand-primary-light)] mt-0.5">
            {finalCaseState}
          </div>
          <span className="text-[11px] text-[var(--fg-quaternary)] block">
            Ledger status verified
          </span>
        </div>
      </div>

      {/* Reference Badges & Technical Lineage */}
      <div className="p-3.5 rounded-[var(--radius-md)] bg-[var(--bg-surface-alt)]/60 border border-[var(--border-subtle)] flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-4 flex-wrap text-[var(--fg-secondary)]">
          <div className="flex items-center gap-1.5">
            <span className="text-[var(--fg-tertiary)]">Case Reference:</span>
            <span className="font-bold text-[var(--fg-primary)]">{caseId}</span>
            <button
              onClick={() => handleCopy(caseId, "Case ID")}
              className="text-[var(--fg-tertiary)] hover:text-[var(--fg-primary)]"
              title="Copy Case ID"
            >
              {copiedKey === "Case ID" ? <CheckCheck className="w-3.5 h-3.5 text-[var(--status-success)]" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          {transactionId && (
            <div className="flex items-center gap-1.5">
              <span className="text-[var(--fg-tertiary)]">Tx Reference:</span>
              <span className="font-bold text-[var(--fg-primary)]">{transactionId}</span>
              <button
                onClick={() => handleCopy(transactionId, "Tx ID")}
                className="text-[var(--fg-tertiary)] hover:text-[var(--fg-primary)]"
                title="Copy Transaction ID"
              >
                {copiedKey === "Tx ID" ? <CheckCheck className="w-3.5 h-3.5 text-[var(--status-success)]" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 text-[var(--fg-tertiary)] text-[11px]">
          <span>Events Emitted: <strong className="text-[var(--fg-primary)]">{auditEvents.length}</strong></span>
          <span>•</span>
          <span>Currency: <strong className="text-[var(--fg-primary)]">INR (₹)</strong></span>
        </div>
      </div>
    </div>
  );
}
