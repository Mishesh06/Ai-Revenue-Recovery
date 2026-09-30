"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard, User, AlertTriangle, ShieldCheck,
  BrainCircuit, Activity, Map, Play, CheckCircle2,
  XCircle, Copy, CheckCheck, Sparkles, Clock,
  FileText, ArrowRight, Shield, Layers, Building2,
  UserCheck, AlertOctagon, RefreshCw, Check
} from "lucide-react";
import { AuditEventOut } from "@/types/api";
import { ReviewItemExtended } from "./ReviewDecisionModal";
import { StatusBadge, PolicyDecisionBadge, ConfidenceBadge } from "@/components/ui-custom/StatusBadge";
import { AuditTimelineItem } from "@/components/ui-custom/TimelineEvent";
import { formatCurrency, formatDateTime, formatRelativeTime, truncateId, cn } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";

/* ─────────────────────────────────────────────────────────────────────────────
   ReviewWorkspace — PayRecover 3-Column Human Decision Workspace
   LEFT: Case & Transaction Context
   CENTER: AI Recommendation + Structured Evidence & Policy Bounds
   RIGHT: Human Decision Panel & Traceable Audit Timeline
   ──────────────────────────────────────────────────────────────────────────── */

interface ReviewWorkspaceProps {
  review: ReviewItemExtended;
  onSubmitDecision: (reviewId: string, decision: "APPROVED" | "REJECTED", notes: string) => Promise<void>;
  auditEvents: AuditEventOut[];
  isLoadingAudit?: boolean;
  currency?: string;
  className?: string;
}

export function ReviewWorkspace({
  review,
  onSubmitDecision,
  auditEvents,
  isLoadingAudit,
  currency = "INR",
  className,
}: ReviewWorkspaceProps) {
  const { toast } = useToast();
  const [operatorNotes, setOperatorNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [confirmingAction, setConfirmingAction] = useState<"APPROVED" | "REJECTED" | null>(null);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    toast.success("Copied to clipboard", `${label}: ${truncateId(text, 14)}`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleExecuteDecision = async (decision: "APPROVED" | "REJECTED") => {
    setIsSubmitting(true);
    try {
      await onSubmitDecision(review.id, decision, operatorNotes);
      toast.success(
        decision === "APPROVED" ? "Intervention Authorized" : "Intervention Rejected",
        decision === "APPROVED"
          ? "Case escalated to Action Adapter for live execution."
          : "Case safely closed and idempotency lock released."
      );
      setConfirmingAction(null);
      setOperatorNotes("");
    } catch (err) {
      toast.error("Decision submission failed", String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const amount = review.amount || 34990;
  const whyReview =
    review.why_human_review ||
    review.reason ||
    "Payment gateway timed out during execution. Blind retries were blocked by deterministic safety policy to prevent duplicate customer charges.";

  return (
    <div
      className={cn(
        "rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden shadow-[var(--shadow-md)]",
        className
      )}
    >
      {/* Workspace Top Header */}
      <div className="p-5 border-b border-[var(--border-subtle)] bg-[var(--bg-surface-alt)]/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--status-review-subtle)] border border-[var(--status-review-border)] flex items-center justify-center text-[var(--status-review-text)] shadow-[var(--shadow-xs)] flex-shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-[var(--fg-primary)]">
                Human Review Workspace
              </span>
              <span className="font-mono text-xs font-bold text-[var(--brand-primary)] bg-[var(--brand-primary-muted)] px-2 py-0.5 rounded-[var(--radius-xs)] border border-[var(--brand-primary-ring)]">
                #{truncateId(review.id, 10)}
              </span>
              <button
                onClick={() => handleCopy(review.id, "Review ID")}
                className="text-[var(--fg-tertiary)] hover:text-[var(--fg-primary)]"
                title="Copy Review UUID"
              >
                {copiedKey === "Review ID" ? (
                  <CheckCheck className="w-3.5 h-3.5 text-[var(--status-success)]" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            <span className="text-xs text-[var(--fg-tertiary)] font-mono block mt-0.5">
              Escalated for operator clearance: {formatDateTime(review.created_at)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end md:self-auto">
          <div className="text-right">
            <span className="text-[10px] uppercase font-mono font-bold text-[var(--fg-tertiary)] block">
              At-Risk Capital
            </span>
            <span className="text-xl sm:text-2xl font-black font-mono text-[var(--fg-primary)] tabular-nums">
              {formatCurrency(amount, currency)}
            </span>
          </div>

          <span
            className={cn(
              "px-2.5 py-1 rounded-[var(--radius-xs)] text-xs font-mono font-bold border",
              review.risk_level === "CRITICAL" || review.risk_level === "HIGH"
                ? "bg-[var(--status-danger-subtle)] text-[var(--status-danger-text)] border-[var(--status-danger-border)]"
                : "bg-[var(--status-warning-subtle)] text-[var(--status-warning-text)] border-[var(--status-warning-border)]"
            )}
          >
            {review.risk_level || "HIGH"} RISK
          </span>
        </div>
      </div>

      {/* 3-Column Decision Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[var(--border-subtle)]">
        {/* ── LEFT COLUMN: Case & Transaction Context (3.5 cols) ─────────── */}
        <div className="lg:col-span-4 p-5 sm:p-6 space-y-5 bg-[var(--bg-surface)]">
          <div className="flex items-center gap-2 pb-2 border-b border-[var(--border-subtle)]">
            <CreditCard className="w-4 h-4 text-[var(--brand-primary)]" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--fg-primary)]">
              1. Case & Transaction Context
            </h3>
          </div>

          {/* Context Details */}
          <div className="space-y-3 font-mono text-xs">
            <div className="p-3 rounded-[var(--radius-md)] bg-[var(--bg-surface-alt)] border border-[var(--border-subtle)] space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[var(--fg-tertiary)]">Case ID:</span>
                <Link
                  href={`/recovery?caseId=${review.recovery_case_id}`}
                  className="font-semibold text-[var(--brand-primary-light)] hover:underline flex items-center gap-1"
                  title="Inspect Case in Recovery Center"
                >
                  {truncateId(review.recovery_case_id, 12)}
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--fg-tertiary)]">Merchant:</span>
                <span className="text-[var(--fg-secondary)]">
                  {truncateId(review.merchant_id, 10)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--fg-tertiary)]">Channel:</span>
                <span className="text-[var(--fg-primary)] font-semibold">
                  UPI Intent (HDFC Bank)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--fg-tertiary)]">Attempts Executed:</span>
                <span className="text-[var(--status-warning-text)] font-bold">
                  1 of 3 allowed
                </span>
              </div>
            </div>

            {/* Why Human Review Alert Box */}
            <div className="p-3.5 rounded-[var(--radius-md)] bg-[var(--status-review-subtle)] border border-[var(--status-review-border)] space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--status-review-text)]">
                <AlertTriangle className="w-4 h-4 text-[var(--status-review-text)]" />
                <span>Trigger Reason:</span>
              </div>
              <p className="text-xs text-[var(--status-review-text)] leading-relaxed break-words">
                {whyReview}
              </p>
            </div>
          </div>
        </div>

        {/* ── CENTER COLUMN: AI Recommendation + Structured Evidence (4.5 cols) ─── */}
        <div className="lg:col-span-4 p-5 sm:p-6 space-y-5 bg-[var(--bg-surface)]">
          <div className="flex items-center gap-2 pb-2 border-b border-[var(--border-subtle)]">
            <BrainCircuit className="w-4 h-4 text-[var(--brand-primary)]" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--fg-primary)]">
              2. AI Recommendation & Evidence
            </h3>
          </div>

          {/* AI Recommendation Card */}
          <div className="p-4 rounded-[var(--radius-md)] bg-[var(--brand-primary-muted)] border border-[var(--brand-primary-ring)] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase font-bold text-[var(--brand-primary)]">
                AI PROPOSED INTERVENTION
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white text-[var(--brand-primary)] font-bold">
                RecoveryPlanner v2.0
              </span>
            </div>
            <h4 className="text-xs font-bold text-[var(--fg-primary)]">
              {review.recommended_action || "Smart Exponential Retry (+180s window)"}
            </h4>
            <p className="text-xs text-[var(--fg-secondary)] leading-relaxed">
              Dispatches retry through secondary gateway route with 180s latency recovery buffer.
            </p>
          </div>

          {/* ML Probability & Calibration */}
          <div className="p-3.5 rounded-[var(--radius-md)] bg-[var(--bg-surface-alt)] border border-[var(--border-subtle)] space-y-2 font-mono text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[var(--fg-tertiary)]">ML Recovery Probability:</span>
              <ConfidenceBadge value={review.recovery_probability || 0.82} showBar />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--fg-tertiary)]">Diagnosis Attribution:</span>
              <span className="font-semibold text-[var(--brand-primary)]">
                {review.failure_category || "Transient Gateway Latency"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--fg-tertiary)]">Policy Gate Evaluation:</span>
              <PolicyDecisionBadge decision="REVIEW" />
            </div>
          </div>

          {/* Structured Evidence Payload */}
          <div className="space-y-1.5 font-mono text-xs">
            <span className="text-[10px] uppercase font-bold text-[var(--fg-tertiary)] block">
              Structured Evidence Signals (Zero Chain-of-Thought)
            </span>
            <pre className="p-2.5 rounded-[var(--radius-md)] bg-[var(--bg-surface-alt)] border border-[var(--border-subtle)] text-[11px] text-[var(--fg-secondary)] overflow-x-auto max-h-36">
              {JSON.stringify(
                review.evidence_signals || {
                  gateway_status: "READ_TIMEOUT",
                  circuit_breaker: "ACTIVE",
                  idempotency_key: "idem_sec_c_948f2a",
                  customer_risk_tier: "ENTERPRISE",
                },
                null,
                2
              )}
            </pre>
          </div>
        </div>

        {/* ── RIGHT COLUMN: Human Decision Panel & Audit Trail (4 cols) ─────── */}
        <div className="lg:col-span-4 p-5 sm:p-6 space-y-5 bg-[var(--bg-surface-alt)]/30">
          <div className="flex items-center gap-2 pb-2 border-b border-[var(--border-subtle)]">
            <ShieldCheck className="w-4 h-4 text-[var(--status-success)]" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--fg-primary)]">
              3. Human Decision Panel
            </h3>
          </div>

          {/* Distinction Breakdown Pill */}
          <div className="p-3 rounded-[var(--radius-md)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-2 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-[var(--fg-tertiary)]">1. AI Recommendation:</span>
              <span className="font-mono font-bold text-[var(--brand-primary)]">PROPOSED</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--fg-tertiary)]">2. Deterministic Policy:</span>
              <span className="font-mono font-bold text-[var(--status-review-text)]">ESCALATED</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--fg-tertiary)]">3. Operator Authority:</span>
              <span className="font-mono font-bold text-[var(--status-success-text)]">FINAL CLEARANCE</span>
            </div>
          </div>

          {/* Operator Notes Input */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono font-semibold text-[var(--fg-secondary)] block">
              Operator Compliance Notes:
            </label>
            <textarea
              value={operatorNotes}
              onChange={(e) => setOperatorNotes(e.target.value)}
              placeholder="Provide reason for authorization / rejection for immutable audit ledger..."
              rows={3}
              className="w-full p-2.5 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-surface)] text-xs font-mono text-[var(--fg-primary)] placeholder:text-[var(--fg-tertiary)] outline-none focus:border-[var(--brand-primary)]"
            />
          </div>

          {/* Decision Buttons (Mapped to real submitReview API) */}
          <div className="space-y-2 pt-1">
            {confirmingAction ? (
              <div className="p-3.5 rounded-[var(--radius-md)] border border-[var(--status-warning-border)] bg-[var(--status-warning-subtle)] space-y-3">
                <span className="text-xs font-bold text-[var(--status-warning-text)] block">
                  Confirm {confirmingAction === "APPROVED" ? "Authorization" : "Rejection"}?
                </span>
                <p className="text-[11px] text-[var(--status-warning-text)] leading-relaxed">
                  {confirmingAction === "APPROVED"
                    ? `This will immediately dispatch the recovery action on PayRecover for ${formatCurrency(amount, currency)}.`
                    : "This will terminate recovery attempts and safely close this case."}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleExecuteDecision(confirmingAction)}
                    disabled={isSubmitting}
                    className="flex-1 h-9 rounded-[var(--radius-xs)] bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? "Executing..." : "Confirm & Sign"}
                  </button>
                  <button
                    onClick={() => setConfirmingAction(null)}
                    disabled={isSubmitting}
                    className="px-3 h-9 rounded-[var(--radius-xs)] border border-[var(--border-default)] bg-[var(--bg-surface)] text-xs font-semibold text-[var(--fg-secondary)]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => setConfirmingAction("APPROVED")}
                  disabled={isSubmitting}
                  className="h-10 px-3 rounded-[var(--radius-md)] bg-[var(--status-success)] hover:bg-[#15803D] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-[var(--shadow-xs)] transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Approve Action</span>
                </button>

                <button
                  onClick={() => setConfirmingAction("REJECTED")}
                  disabled={isSubmitting}
                  className="h-10 px-3 rounded-[var(--radius-md)] border border-[var(--status-danger-border)] bg-[var(--status-danger-subtle)] hover:bg-[var(--status-danger)]/20 text-[var(--status-danger-text)] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Reject</span>
                </button>
              </div>
            )}
          </div>

          {/* Traceable Decision Audit Stream */}
          <div className="pt-3 border-t border-[var(--border-subtle)] space-y-2">
            <span className="text-[10px] font-mono uppercase font-bold text-[var(--fg-tertiary)] block">
              Traceable Decision History ({auditEvents.length})
            </span>

            {isLoadingAudit ? (
              <div className="py-4 text-center text-xs font-mono text-[var(--fg-tertiary)]">
                Loading audit trail…
              </div>
            ) : auditEvents.length === 0 ? (
              <div className="py-3 text-center text-[11px] font-mono text-[var(--fg-tertiary)] border border-dashed rounded-[var(--radius-sm)]">
                Zero previous operator overrides.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {auditEvents.slice(0, 5).map((evt, idx) => (
                  <div key={evt.id || idx} className="p-2 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[10px] font-mono flex items-center justify-between">
                    <span className="text-[var(--fg-secondary)] truncate max-w-[140px]">{evt.event_type}</span>
                    <span className="text-[var(--fg-tertiary)]">{formatRelativeTime(evt.timestamp)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
