"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Terminal, CheckCircle2, XCircle, AlertTriangle,
  BrainCircuit, Activity, Map, ShieldCheck, Play,
  Clock, ShieldAlert
} from "lucide-react";
import { AuditEventOut } from "@/types/api";
import { formatTime, formatCurrency, cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────────
   SimulationEventStream — RecoverAI Design System
   Live timestamped event stream display for simulation runs.
   ──────────────────────────────────────────────────────────────────────────── */

interface SimulationEventStreamProps {
  events: AuditEventOut[];
  activeStageIdx: number;
  scenario: string;
  className?: string;
}

function formatStreamMessage(evt: AuditEventOut) {
  const data = evt.event_data || {};

  switch (evt.event_type) {
    case "PaymentFailed":
      return {
        tag: "PAYMENT_FAILED",
        tagColor: "text-[var(--status-danger-text)] bg-[var(--status-danger-subtle)] border-[var(--status-danger-border)]",
        detail: `Gross Volume ${formatCurrency(data.amount || 2499)} (${data.error_code || "GATEWAY_TIMEOUT"})`,
      };
    case "OpportunityDetected":
      return {
        tag: "OPPORTUNITY_DETECTED",
        tagColor: "text-[var(--status-info-text)] bg-[var(--status-info-subtle)] border-[var(--status-info-border)]",
        detail: `Recovery Priority: ${data.priority || "HIGH"} (Score: 89/100)`,
      };
    case "PredictionCreated":
      return {
        tag: "ML_PREDICTION",
        tagColor: "text-[var(--brand-primary-hover)] bg-[var(--brand-primary-muted)] border-[var(--brand-primary-ring)]",
        detail: data.recovery_score != null
          ? `Recovery Score: ${data.recovery_score}${data.recovery_probability != null ? ` | Prob: ${(data.recovery_probability * 100).toFixed(1)}%` : ""}`
          : "Prediction data pending",
      };
    case "DiagnosisCreated":
      return {
        tag: "AI_DIAGNOSIS",
        tagColor: "text-[var(--brand-primary-hover)] bg-[var(--brand-primary-muted)] border-[var(--brand-primary-ring)]",
        detail: data.failure_category
          ? `Category: ${data.failure_category}${data.confidence != null ? ` (${(data.confidence * 100).toFixed(0)}% Conf)` : ""}`
          : "Diagnosis data pending",
      };
    case "RecoveryPlanned":
      return {
        tag: "RECOVERY_RECOMMENDED",
        tagColor: "text-[var(--fg-primary)] bg-[var(--bg-raised)] border-[var(--border-default)]",
        detail: `Action: ${data.recommended_action || "RETRY_PAYMENT"} (Reason: ${data.reason_code || "TRANSIENT_DROP"})`,
      };
    case "PolicyEvaluated":
      return {
        tag: data.decision === "APPROVED" ? "POLICY_APPROVED" : "POLICY_BLOCKED",
        tagColor: data.decision === "APPROVED"
          ? "text-[var(--status-success-text)] bg-[var(--status-success-subtle)] border-[var(--status-success-border)]"
          : "text-[var(--status-warning-text)] bg-[var(--status-warning-subtle)] border-[var(--status-warning-border)]",
        detail: `Gate Rule: ${data.reason_code || "WITHIN_RETRY_LIMIT"} (Decision: ${data.decision || "APPROVED"})`,
      };
    case "RecoveryExecuted":
      return {
        tag: "ACTION_EXECUTED",
        tagColor: "text-[var(--status-info-text)] bg-[var(--status-info-subtle)] border-[var(--status-info-border)]",
        detail: `Adapter: Simulation Mode (Idempotency Key Reserved)`,
      };
    case "RecoverySucceeded":
      return {
        tag: "PAYMENT_RECOVERED",
        tagColor: "text-[var(--status-success-text)] bg-[var(--status-success-subtle)] border-[var(--status-success-border)] font-bold",
        detail: `Capital Settled ${formatCurrency(data.amount || 2499)} (Zero fee leakage)`,
      };
    case "ManualReviewCreated":
      return {
        tag: "MANUAL_REVIEW_CREATED",
        tagColor: "text-[var(--status-danger-text)] bg-[var(--status-danger-subtle)] border-[var(--status-danger-border)] font-bold",
        detail: `Outcome Unknown. Automatic retry blocked to prevent double-recovery.`,
      };
    default:
      return {
        tag: evt.event_type.toUpperCase(),
        tagColor: "text-[var(--fg-secondary)] bg-[var(--bg-raised)] border-[var(--border-subtle)]",
        detail: JSON.stringify(data),
      };
  }
}

export function SimulationEventStream({
  events,
  activeStageIdx,
  scenario,
  className,
}: SimulationEventStreamProps) {
  // Only reveal events up to the active stage count so it syncs with pipeline
  const visibleEvents = events.slice(0, Math.max(1, activeStageIdx + 1));

  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-sm)] flex flex-col justify-between",
        className
      )}
    >
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[var(--brand-primary)]" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--fg-primary)]">
              Live Pipeline Event Stream
            </h3>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-[var(--status-success-text)] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-success)] animate-pulse" />
            REAL-TIME TELEMETRY
          </div>
        </div>

        {/* Stream List */}
        {visibleEvents.length === 0 ? (
          <div className="py-12 text-center text-xs text-[var(--fg-tertiary)] font-mono">
            Awaiting scenario execution trigger...
          </div>
        ) : (
          <div className="space-y-2 max-h-[380px] overflow-y-auto font-mono text-xs pr-1">
            <AnimatePresence initial={false}>
              {visibleEvents.map((evt, idx) => {
                const streamItem = formatStreamMessage(evt);

                return (
                  <motion.div
                    key={evt.id || idx}
                    initial={{ opacity: 0, x: -8, scale: 0.98 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    transition={{ duration: 0.18 }}
                    className="p-2.5 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-surface-alt)] flex flex-col sm:flex-row sm:items-center justify-between gap-1.5"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] text-[var(--fg-tertiary)] font-medium">
                        {formatTime(evt.timestamp)}
                      </span>
                      <span
                        className={cn(
                          "text-[9px] font-bold px-1.5 py-0.5 rounded-[var(--radius-xs)] border truncate",
                          streamItem.tagColor
                        )}
                      >
                        {streamItem.tag}
                      </span>
                      <span className="text-[11px] text-[var(--fg-secondary)] truncate">
                        {streamItem.detail}
                      </span>
                    </div>

                    <span className="text-[9px] text-[var(--fg-tertiary)] hidden md:inline-block shrink-0">
                      step {idx + 1}/8
                    </span>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-[10px] font-mono text-[var(--fg-tertiary)]">
        <span>Channel: FASTAPI_STREAM</span>
        <span>Events Received: {visibleEvents.length}</span>
      </div>
    </div>
  );
}
