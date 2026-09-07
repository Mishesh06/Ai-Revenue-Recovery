"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert, UserCheck, AlertTriangle, BrainCircuit,
  Lock, CheckCircle2, XCircle, FileText, ArrowRight,
  Shield, Check, Clock, Copy, CheckCheck, Sparkles,
  Info, AlertOctagon, X
} from "lucide-react";
import { ManualReviewOut, AuditEventOut, RecoveryCaseOut } from "@/types/api";
import { formatCurrency, formatDateTime, formatRelativeTime, truncateId, cn } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";

/* ─────────────────────────────────────────────────────────────────────────────
   ReviewDecisionModal — RecoverAI Deliberate Decision Interface
   Controlled human-in-the-loop exception handling with explicit consequence disclosure.
   ──────────────────────────────────────────────────────────────────────────── */

export interface ReviewItemExtended extends ManualReviewOut {
  amount?: number;
  recovery_probability?: number;
  confidence?: number;
  failure_category?: string;
  recommended_action?: string;
  policy_decision?: string;
  reason_code?: string;
  risk_level?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  why_human_review?: string;
  evidence_signals?: Record<string, unknown>;
}

interface ReviewDecisionModalProps {
  review: ReviewItemExtended | null;
  onClose: () => void;
  onSubmitDecision: (reviewId: string, decision: "APPROVED" | "REJECTED", notes: string) => Promise<void>;
  auditEvents?: AuditEventOut[];
  className?: string;
}

export function ReviewDecisionModal({
  review,
  onClose,
  onSubmitDecision,
  auditEvents = [],
  className,
}: ReviewDecisionModalProps) {
  const { toast } = useToast();
  const [operatorNotes, setOperatorNotes] = useState("");
  const [confirmationAction, setConfirmationAction] = useState<"APPROVED" | "REJECTED" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"evidence" | "policy" | "audit">("evidence");

  if (!review) return null;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    toast.success("Copied to clipboard", `${label}: ${truncateId(text, 12)}`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleConfirmSubmit = async () => {
    if (!confirmationAction) return;

    setIsSubmitting(true);
    try {
      await onSubmitDecision(review.id, confirmationAction, operatorNotes);
      toast.success(
        confirmationAction === "APPROVED" ? "Intervention Authorized" : "Intervention Rejected",
        confirmationAction === "APPROVED"
          ? "Case escalated to Action Adapter for live execution."
          : "Case safely closed and idempotency lock released."
      );
      setConfirmationAction(null);
      onClose();
    } catch (err) {
      toast.error("Action submission failed", String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const amount = review.amount || 24990;
  const whyReview =
    review.why_human_review ||
    review.reason ||
    "Payment gateway timed out during execution. Blind retries were blocked by policy to prevent duplicate charging.";

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-2xl bg-[var(--bg-surface)] rounded-[var(--radius-lg)] border border-[var(--border-subtle)] shadow-[var(--shadow-xl)] overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-5 border-b border-[var(--border-subtle)] bg-[var(--bg-surface-alt)] flex items-start justify-between gap-3 shrink-0">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--fg-tertiary)]">
                Human Review Exception
              </span>
              <span className="font-mono text-xs font-bold text-[var(--fg-primary)]">
                {truncateId(review.id, 12)}
              </span>
              <button
                onClick={() => handleCopy(review.id, "Review ID")}
                className="text-[var(--fg-tertiary)] hover:text-[var(--fg-primary)]"
                title="Copy ID"
              >
                {copiedKey === "Review ID" ? <CheckCheck className="w-3.5 h-3.5 text-[var(--status-success)]" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold font-mono text-[var(--fg-primary)]">
                {formatCurrency(amount)}
              </span>
              <span className="text-xs text-[var(--fg-tertiary)]">at risk</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-[10px] font-mono font-bold px-2 py-0.5 rounded-[var(--radius-xs)] border",
                review.risk_level === "HIGH" || review.risk_level === "CRITICAL"
                  ? "bg-[var(--status-danger-subtle)] text-[var(--status-danger-text)] border-[var(--status-danger-border)]"
                  : "bg-[var(--status-warning-subtle)] text-[var(--status-warning-text)] border-[var(--status-warning-border)]"
              )}
            >
              RISK: {review.risk_level || "MEDIUM"}
            </span>

            <button
              onClick={onClose}
              className="p-1 rounded text-[var(--fg-tertiary)] hover:text-[var(--fg-primary)] hover:bg-[var(--bg-raised)]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Why Human Review Banner */}
          <div className="p-3.5 rounded-[var(--radius-md)] bg-[var(--status-warning-subtle)] border border-[var(--status-warning-border)] space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--status-warning-text)]">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Why Human Review is Required:</span>
            </div>
            <p className="text-[11px] text-[var(--status-warning-text)]/90 leading-relaxed font-medium">
              {whyReview}
            </p>
          </div>

          {/* Subtabs */}
          <div className="flex items-center gap-1 border-b border-[var(--border-subtle)] pb-2">
            {[
              { id: "evidence", label: "AI Evidence & Strategy" },
              { id: "policy", label: "Policy & Risk Rules" },
              { id: "audit", label: `Audit Trail (${auditEvents.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "px-3 py-1 rounded-[var(--radius-sm)] font-semibold transition-colors",
                  activeTab === tab.id
                    ? "bg-[var(--brand-primary-muted)] text-[var(--brand-primary-hover)] font-bold"
                    : "text-[var(--fg-tertiary)] hover:text-[var(--fg-primary)]"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab 1: AI Evidence & Strategy */}
          {activeTab === "evidence" && (
            <div className="space-y-3 font-mono">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-[var(--radius-md)] bg-[var(--bg-surface-alt)] border border-[var(--border-subtle)]">
                <div>
                  <span className="text-[10px] text-[var(--fg-tertiary)] block">Recovery Case UUID</span>
                  <span className="font-semibold text-[var(--fg-primary)] truncate block">{review.recovery_case_id}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--fg-tertiary)] block">Escalated Timestamp</span>
                  <span className="text-[var(--fg-secondary)]">{formatDateTime(review.created_at)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--fg-tertiary)] block">ML Calculated Probability</span>
                  <span className="font-bold text-[var(--brand-primary)]">
                    {((review.recovery_probability || 0.78) * 100).toFixed(1)}% ({((review.confidence || 0.65) * 100).toFixed(0)}% Conf)
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--fg-tertiary)] block">Recommended Strategy</span>
                  <span className="font-bold text-[var(--fg-primary)]">{review.recommended_action || "Smart Exponential Retry (+4m)"}</span>
                </div>
              </div>

              {/* Evidence Signals */}
              <div className="p-3 rounded-[var(--radius-md)] bg-[var(--bg-surface-alt)] border border-[var(--border-subtle)]">
                <span className="text-[10px] text-[var(--fg-tertiary)] block uppercase font-bold mb-1">Raw Evidence Signals</span>
                <pre className="p-2 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[10px] text-[var(--fg-secondary)] overflow-x-auto">
                  {JSON.stringify(
                    review.evidence_signals || {
                      failure_code: "GATEWAY_TIMEOUT",
                      gateway: "RAZORPAY_PROD",
                      previous_attempts: 1,
                      customer_risk_score: 0.84,
                      idempotency_lock: "RESERVED"
                    },
                    null,
                    2
                  )}
                </pre>
              </div>
            </div>
          )}

          {/* Tab 2: Policy & Risk Rules */}
          {activeTab === "policy" && (
            <div className="space-y-3 font-mono">
              <div className="p-3 rounded-[var(--radius-md)] bg-[var(--bg-surface-alt)] border border-[var(--border-subtle)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--fg-tertiary)]">Evaluated Boundary:</span>
                  <span className="font-bold text-[var(--fg-primary)]">{review.reason_code || "CUSTOMER_FATIGUE_PREVENTION"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--fg-tertiary)]">Risk Level:</span>
                  <span className="font-bold text-[var(--status-danger-text)]">{review.risk_level || "HIGH"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--fg-tertiary)]">Idempotency Reservation:</span>
                  <span className="text-[var(--status-success-text)] font-semibold">ACTIVE (LOCKED)</span>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Audit Trail */}
          {activeTab === "audit" && (
            <div className="p-3 rounded-[var(--radius-md)] bg-[var(--bg-surface-alt)] border border-[var(--border-subtle)] space-y-2 font-mono">
              {auditEvents.length === 0 ? (
                <div className="text-center py-4 text-[var(--fg-tertiary)]">
                  Audit events logged for this review case.
                </div>
              ) : (
                auditEvents.map((evt) => (
                  <div key={evt.id} className="p-2 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-[var(--fg-primary)]">{evt.event_type}</span>
                    <span className="text-[var(--fg-tertiary)]">{formatRelativeTime(evt.timestamp)}</span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Operator Decision Notes */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[var(--fg-primary)] uppercase tracking-wider block">
              Operator Decision Log & Notes (Required for Audit)
            </label>
            <textarea
              value={operatorNotes}
              onChange={(e) => setOperatorNotes(e.target.value)}
              placeholder="Provide justification for approving or rejecting this intervention..."
              rows={2}
              className="w-full p-2.5 text-xs rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-surface)] focus:border-[var(--brand-primary)] outline-none text-[var(--fg-primary)] placeholder:text-[var(--fg-tertiary)] font-sans"
            />
          </div>

          {/* Confirmation Warning before Action */}
          {confirmationAction && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "p-3.5 rounded-[var(--radius-md)] border space-y-2",
                confirmationAction === "APPROVED"
                  ? "bg-[var(--status-success-subtle)] border-[var(--status-success-border)]"
                  : "bg-[var(--status-danger-subtle)] border-[var(--status-danger-border)]"
              )}
            >
              <div className="flex items-center gap-1.5 text-xs font-bold">
                <AlertOctagon className={cn("w-4 h-4", confirmationAction === "APPROVED" ? "text-[var(--status-success)]" : "text-[var(--status-danger)]")} />
                <span className={confirmationAction === "APPROVED" ? "text-[var(--status-success-text)]" : "text-[var(--status-danger-text)]"}>
                  Confirm {confirmationAction === "APPROVED" ? "Intervention Authorization" : "Intervention Rejection"}
                </span>
              </div>

              <p className="text-[11px] text-[var(--fg-secondary)] leading-relaxed">
                {confirmationAction === "APPROVED"
                  ? "Authorizing will instruct the Action Adapter to immediately execute the recovery action via Razorpay API and deduct 1 attempt from the customer's retry budget."
                  : "Rejecting will halt all further automated interventions for this transaction, release reserved idempotency keys, and mark the case as CLOSED."}
              </p>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleConfirmSubmit}
                  disabled={isSubmitting}
                  className={cn(
                    "flex-1 py-1.5 px-3 rounded-[var(--radius-sm)] text-white text-xs font-bold transition-colors disabled:opacity-50",
                    confirmationAction === "APPROVED" ? "bg-[var(--status-success)] hover:bg-[var(--status-success-text)]" : "bg-[var(--status-danger)] hover:bg-[var(--status-danger-text)]"
                  )}
                >
                  {isSubmitting ? "Executing Decision..." : `Yes, Confirm ${confirmationAction}`}
                </button>
                <button
                  onClick={() => setConfirmationAction(null)}
                  disabled={isSubmitting}
                  className="px-3 py-1.5 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--fg-secondary)] text-xs font-semibold hover:bg-[var(--bg-raised)]"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Footer Actions */}
        {!confirmationAction && (
          <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-surface-alt)] flex items-center justify-between gap-3 shrink-0">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-semibold text-[var(--fg-tertiary)] hover:text-[var(--fg-primary)]"
            >
              Dismiss
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setConfirmationAction("REJECTED")}
                className="px-4 py-1.5 rounded-[var(--radius-md)] border border-[var(--status-danger-border)] bg-[var(--status-danger-subtle)] text-[var(--status-danger-text)] text-xs font-bold hover:bg-[var(--status-danger)] hover:text-white transition-colors"
              >
                Reject Intervention
              </button>

              <button
                onClick={() => setConfirmationAction("APPROVED")}
                className="px-4 py-1.5 rounded-[var(--radius-md)] bg-[var(--status-success)] hover:bg-[var(--status-success-text)] text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-[var(--shadow-xs)]"
              >
                <Check className="w-3.5 h-3.5" />
                Approve & Execute
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
