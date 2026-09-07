"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { TransactionOut, AuditEventOut, RecoveryCaseOut } from "@/types/api";
import { StatusBadge, PolicyDecisionBadge, ConfidenceBadge } from "@/components/ui-custom/StatusBadge";
import { StateProgressGauge } from "@/components/recovery/StateProgressGauge";
import { DecisionTraceTree } from "@/components/recovery/DecisionTraceTree";
import { AuditTimelineItem } from "@/components/ui-custom/TimelineEvent";
import { LoadingSpinner } from "@/components/ui-custom/FeedbackStates";
import { SectionCard } from "@/components/ui-custom/SectionCard";
import { useToast } from "@/context/ToastContext";
import { formatCurrency, formatDateTime, formatRelativeTime, truncateId, cn } from "@/lib/utils";
import {
  CreditCard, User, AlertTriangle, ShieldCheck,
  BrainCircuit, Activity, Map, Play, CheckCircle2,
  Copy, CheckCheck, X, Sparkles, Clock, Layers,
  ExternalLink, Building2
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────────────────────
   TransactionDetailDrawer — RecoverAI Financial Transactions Ledger
   Premium transaction inspection experience showing transaction metadata,
   failure attribution, linked recovery lifecycle, and audit telemetry.
   ──────────────────────────────────────────────────────────────────────────── */

interface TransactionDetailDrawerProps {
  transaction: TransactionOut | null;
  onClose: () => void;
  auditEvents: AuditEventOut[];
  isLoadingAudit?: boolean;
  currency?: string;
}

export function TransactionDetailDrawer({
  transaction,
  onClose,
  auditEvents,
  isLoadingAudit,
  currency = "INR",
}: TransactionDetailDrawerProps) {
  const { toast } = useToast();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"lifecycle" | "explainability" | "audit">("lifecycle");

  if (!transaction) return null;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    toast.success("Copied to clipboard", `${label}: ${truncateId(text, 14)}`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Derive recovery lifecycle data from audit events
  const isFailed = transaction.status?.toLowerCase() === "failed";
  const isRecovered = transaction.status?.toLowerCase() === "recovered" || transaction.status?.toLowerCase() === "success" || transaction.status?.toLowerCase() === "captured";

  // Look up events from real audit log
  const predEvent = auditEvents.find((e) => e.event_type === "PredictionCreated");
  const diagEvent = auditEvents.find((e) => e.event_type === "DiagnosisCreated");
  const planEvent = auditEvents.find((e) => e.event_type === "RecoveryPlanned");
  const policyEvent = auditEvents.find((e) => e.event_type === "PolicyEvaluated" || e.event_type === "RecoveryApproved");

  const probability = predEvent?.event_data?.recovery_probability != null
    ? Number(predEvent.event_data.recovery_probability)
    : null;

  const failureCode = isFailed ? ((diagEvent?.event_data?.failure_category as string) || "PAYMENT_DECLINED") : undefined;
  const failureReason = isFailed
    ? ((diagEvent?.event_data?.root_cause as string) || (diagEvent?.event_data?.primary_cause as string) || "Payment gateway reported transaction failure.")
    : undefined;

  const policyStatus = (policyEvent?.event_data?.decision as string) || (policyEvent ? "APPROVED" : isFailed ? "EVALUATING" : "NOT_APPLICABLE");
  const recommendedAction = ((planEvent?.event_data?.recommended_action as string) || (planEvent?.event_data?.action_type as string)) || (isFailed ? "Awaiting autonomous scheduling" : "No intervention needed");

  const relatedCaseId = auditEvents.find((e) => e.recovery_case_id)?.recovery_case_id;

  return (
    <Sheet open={!!transaction} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-[560px] md:max-w-[640px] overflow-y-auto bg-[var(--bg-surface)] border-l border-[var(--border-subtle)] p-0 shadow-[var(--shadow-sheet)]">
        {/* Sticky Header */}
        <div className="sticky top-0 z-20 bg-[var(--bg-surface)] border-b border-[var(--border-subtle)] p-5 pb-4 shadow-[var(--shadow-xs)]">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--fg-tertiary)]">
                  Transaction Ledger
                </span>
                <span className="font-mono text-xs font-bold text-[var(--fg-primary)]">
                  {truncateId(transaction.id, 14)}
                </span>
                <button
                  onClick={() => handleCopy(transaction.id, "Transaction ID")}
                  className="p-1 rounded text-[var(--fg-tertiary)] hover:text-[var(--fg-primary)] hover:bg-[var(--bg-raised)]"
                  title="Copy Transaction UUID"
                >
                  {copiedKey === "Transaction ID" ? (
                    <CheckCheck className="w-3.5 h-3.5 text-[var(--status-success)]" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black font-mono text-[var(--fg-primary)] tabular-nums">
                  {formatCurrency(transaction.amount, transaction.currency || currency)}
                </span>
                <span className="text-xs text-[var(--fg-tertiary)] font-mono">
                  {formatDateTime(transaction.created_at)}
                </span>
              </div>
            </div>

            <StatusBadge label={transaction.status} size="md" dot />
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 pt-3 border-t border-[var(--border-subtle)] mt-3">
            {[
              { id: "lifecycle", label: "Recovery Lifecycle" },
              { id: "explainability", label: "AI Decision Trace" },
              { id: "audit", label: `Audit Events (${auditEvents.length})` },
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

        {/* Drawer Body */}
        <div className="p-5 space-y-6">
          {activeTab === "lifecycle" && (
            <div className="space-y-5">
              {/* State Machine Progression */}
              <StateProgressGauge currentState={isRecovered ? "RECOVERED" : "RECOVERING"} />

              {/* Failure Context Alert (if failed) */}
              {failureCode && (
                <div className="p-4 rounded-[var(--radius-md)] bg-[var(--status-danger-subtle)] border border-[var(--status-danger-border)] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--status-danger-text)] font-mono">
                      Failure Code: {failureCode}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white text-[var(--status-danger-text)] border border-[var(--status-danger-border)] font-bold">
                      TRANSIENT
                    </span>
                  </div>
                  <p className="text-xs text-[var(--status-danger-text)]/90 leading-relaxed">
                    {failureReason}
                  </p>
                </div>
              )}

              {/* Transaction & Customer Details Card */}
              <SectionCard title="Transaction & Customer Metadata" icon={CreditCard}>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-[var(--fg-tertiary)] block">Transaction UUID:</span>
                    <span className="font-mono font-semibold text-[var(--fg-primary)] truncate block">
                      {truncateId(transaction.id, 14)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--fg-tertiary)] block">Customer Reference:</span>
                    <span className="font-mono text-[var(--fg-secondary)] truncate block">
                      {transaction.customer_id ? truncateId(transaction.customer_id, 14) : "cust_direct"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--fg-tertiary)] block">Payment Channel:</span>
                    <span className="font-mono text-[var(--fg-primary)]">
                      {transaction.payment_method || "UPI Intent"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--fg-tertiary)] block">Currency / Country:</span>
                    <span className="font-mono text-[var(--fg-secondary)]">
                      {transaction.currency || "INR"} (IN)
                    </span>
                  </div>
                </div>
              </SectionCard>

              {/* Recovery Intelligence & Policy Evaluation */}
              <SectionCard title="Autonomous Recovery Attribution" icon={BrainCircuit}>
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[var(--fg-tertiary)]">ML Recovery Probability:</span>
                    {probability != null ? (
                      <ConfidenceBadge value={probability} showBar />
                    ) : (
                      <span className="font-mono text-xs text-[var(--fg-tertiary)]">No prediction recorded</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between font-mono">
                    <span className="text-[11px] text-[var(--fg-tertiary)]">Recommended Action:</span>
                    <span className="font-semibold text-[var(--brand-primary)] bg-[var(--brand-primary-muted)] px-2 py-0.5 rounded-[var(--radius-xs)]">
                      {recommendedAction}
                    </span>
                  </div>
                  <div className="flex items-center justify-between font-mono">
                    <span className="text-[11px] text-[var(--fg-tertiary)]">Policy Safety Gate:</span>
                    <PolicyDecisionBadge decision={policyStatus} />
                  </div>
                  <div className="flex items-center justify-between font-mono">
                    <span className="text-[11px] text-[var(--fg-tertiary)]">Customer Fatigue Cap:</span>
                    <span className="text-[var(--fg-secondary)] font-semibold">1 of 3 (Safe)</span>
                  </div>
                  {relatedCaseId ? (
                    <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between">
                      <span className="text-[11px] text-[var(--fg-tertiary)]">Linked Recovery Case:</span>
                      <Link
                        href={`/recovery?caseId=${relatedCaseId}`}
                        className="font-mono font-bold text-[var(--brand-primary)] hover:underline text-xs flex items-center gap-1"
                        title="Inspect in Recovery Center"
                      >
                        {truncateId(relatedCaseId, 12)} <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  ) : isFailed ? (
                    <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between">
                      <span className="text-[11px] text-[var(--fg-tertiary)]">Recovery Operations:</span>
                      <Link
                        href="/recovery?priority=HIGH"
                        className="font-bold text-[var(--brand-primary)] hover:underline text-xs flex items-center gap-1"
                      >
                        Inspect in Recovery Center →
                      </Link>
                    </div>
                  ) : null}
                </div>
              </SectionCard>
            </div>
          )}

          {activeTab === "explainability" && (
            <DecisionTraceTree auditEvents={auditEvents} />
          )}

          {activeTab === "audit" && (
            <div className="space-y-3">
              <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-[var(--fg-tertiary)] block">
                Immutable Decision Stream ({auditEvents.length} Events)
              </span>

              {isLoadingAudit ? (
                <LoadingSpinner message="Loading audit telemetry…" />
              ) : auditEvents.length === 0 ? (
                <div className="py-12 text-center text-xs text-[var(--fg-tertiary)] font-mono border border-dashed rounded-[var(--radius-lg)]">
                  No explicit audit events recorded for this transaction.
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
