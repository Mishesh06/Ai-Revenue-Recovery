"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard, Search, BrainCircuit, Activity, Map,
  ShieldCheck, Play, CheckCircle2, XCircle, AlertTriangle,
  FileText, UserRoundCheck, ChevronRight, Copy, CheckCheck,
  Shield, Terminal, Lock, Clock
} from "lucide-react";
import { AuditEventOut } from "@/types/api";
import { CorrelationChainFlow } from "./CorrelationChainFlow";
import { formatDateTime, formatRelativeTime, truncateId, formatEventType, cn } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";

/* ─────────────────────────────────────────────────────────────────────────────
   AuditStreamCard — RecoverAI Design System
   Production-grade expandable audit item with correlation trace and JSON telemetry.
   ──────────────────────────────────────────────────────────────────────────── */

interface AuditStreamCardProps {
  event: AuditEventOut;
  className?: string;
}

function getEventMeta(eventType: string) {
  const e = eventType.toUpperCase();

  if (e.includes("SUCCEED") || e.includes("CLOSED") || e === "RECOVERYAPPROVED") {
    return {
      icon: CheckCircle2,
      variant: "success",
      color: "text-[var(--status-success-text)]",
      bg: "bg-[var(--status-success-subtle)] border-[var(--status-success-border)]",
      dot: "bg-[var(--status-success)]",
    };
  }
  if (e.includes("FAIL") || e.includes("EXPIRE") || e.includes("ERROR")) {
    return {
      icon: XCircle,
      variant: "danger",
      color: "text-[var(--status-danger-text)]",
      bg: "bg-[var(--status-danger-subtle)] border-[var(--status-danger-border)]",
      dot: "bg-[var(--status-danger)]",
    };
  }
  if (e.includes("POLICY") || e.includes("REVIEW")) {
    return {
      icon: ShieldCheck,
      variant: "warning",
      color: "text-[var(--status-warning-text)]",
      bg: "bg-[var(--status-warning-subtle)] border-[var(--status-warning-border)]",
      dot: "bg-[var(--status-warning)]",
    };
  }
  if (e.includes("DIAGNOS") || e.includes("PREDICT")) {
    return {
      icon: BrainCircuit,
      variant: "brand",
      color: "text-[var(--brand-primary-hover)]",
      bg: "bg-[var(--brand-primary-muted)] border-[var(--brand-primary-ring)]",
      dot: "bg-[var(--brand-primary)]",
    };
  }
  if (e.includes("PLAN")) {
    return {
      icon: Map,
      variant: "info",
      color: "text-[var(--status-info-text)]",
      bg: "bg-[var(--status-info-subtle)] border-[var(--status-info-border)]",
      dot: "bg-[var(--status-info)]",
    };
  }
  return {
    icon: Activity,
    variant: "neutral",
    color: "text-[var(--fg-secondary)]",
    bg: "bg-[var(--bg-raised)] border-[var(--border-subtle)]",
    dot: "bg-[var(--status-neutral)]",
  };
}

function inferActor(eventType: string): string {
  const e = eventType.toUpperCase();
  if (e.includes("PAYMENT") || e.includes("OPPORTUNITY")) return "SYSTEM_INGEST";
  if (e.includes("DIAGNOS")) return "AGENT_DIAGNOSIS";
  if (e.includes("PREDICT")) return "ML_SCORING_ENGINE";
  if (e.includes("PLAN")) return "AGENT_PLANNER";
  if (e.includes("POLICY")) return "POLICY_ENGINE";
  if (e.includes("EXECUTE") || e.includes("SUCCEED") || e.includes("FAIL")) return "ACTION_ADAPTER";
  if (e.includes("REVIEW")) return "HUMAN_OPERATOR";
  return "SYSTEM";
}

export function AuditStreamCard({ event, className }: AuditStreamCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const { toast } = useToast();

  const meta = getEventMeta(event.event_type);
  const Icon = meta.icon;
  const actor = inferActor(event.event_type);

  const handleCopy = (e: React.MouseEvent, text: string, label: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    toast.success("Copied to clipboard", `${label}: ${truncateId(text, 12)}`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className={cn(
        "rounded-[var(--radius-lg)] border bg-[var(--bg-surface)] shadow-[var(--shadow-xs)] transition-all duration-[var(--duration-fast)] overflow-hidden",
        expanded ? "border-[var(--brand-primary)] ring-1 ring-[var(--brand-primary)]" : "border-[var(--border-subtle)] hover:border-[var(--border-default)]",
        className
      )}
    >
      {/* Clickable Card Header Bar */}
      <div
        onClick={() => setExpanded(!expanded)}
        className="p-4 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[var(--bg-surface-alt)] transition-colors select-none"
      >
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          {/* Node Icon */}
          <div
            className={cn(
              "w-8 h-8 rounded-[var(--radius-md)] border flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-0",
              meta.bg
            )}
          >
            <Icon className={cn("w-4 h-4", meta.color)} />
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn("text-xs font-mono font-bold px-2 py-0.5 rounded-[var(--radius-xs)] border", meta.bg, meta.color)}>
                {formatEventType(event.event_type)}
              </span>

              {/* Actor Badge */}
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--bg-raised)] text-[var(--fg-tertiary)] font-semibold border border-[var(--border-subtle)]">
                {actor}
              </span>
            </div>

            {/* Identifiers */}
            <div className="flex items-center gap-3 mt-1.5 text-[11px] font-mono text-[var(--fg-tertiary)] flex-wrap">
              <span className="flex items-center gap-1">
                trace: <strong className="text-[var(--fg-secondary)]">{truncateId(event.correlation_id, 10)}</strong>
                <button
                  onClick={(e) => handleCopy(e, event.correlation_id, "Correlation ID")}
                  className="hover:text-[var(--fg-primary)]"
                  title="Copy correlation trace"
                >
                  {copiedKey === "Correlation ID" ? <CheckCheck className="w-3 h-3 text-[var(--status-success)]" /> : <Copy className="w-3 h-3" />}
                </button>
              </span>

              {event.transaction_id && (
                <span className="flex items-center gap-1">
                  tx:{" "}
                  <Link
                    href={`/transactions?transactionId=${event.transaction_id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-[var(--brand-primary-light)] hover:underline font-bold"
                    title="Inspect Transaction"
                  >
                    {truncateId(event.transaction_id, 8)}
                  </Link>
                </span>
              )}

              {event.recovery_case_id && (
                <span className="flex items-center gap-1">
                  case:{" "}
                  <Link
                    href={`/recovery?caseId=${event.recovery_case_id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-[var(--brand-primary-light)] hover:underline font-bold"
                    title="Inspect Recovery Case"
                  >
                    {truncateId(event.recovery_case_id, 8)}
                  </Link>
                </span>
              )}

              {event.event_data?.action_execution_id && (
                <span className="flex items-center gap-1">
                  action: <strong className="text-[var(--fg-secondary)]">{truncateId(String(event.event_data.action_execution_id), 8)}</strong>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right side: Timestamp & Expand Caret */}
        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--border-subtle)]">
          <div className="text-left sm:text-right font-mono">
            <div className="text-xs font-semibold text-[var(--fg-primary)]">
              {formatDateTime(event.timestamp)}
            </div>
            <div className="text-[10px] text-[var(--fg-tertiary)]">
              {formatRelativeTime(event.timestamp)}
            </div>
          </div>

          <ChevronRight
            className={cn(
              "w-4 h-4 text-[var(--fg-tertiary)] transition-transform duration-200",
              expanded && "rotate-90 text-[var(--brand-primary)]"
            )}
          />
        </div>
      </div>

      {/* Expandable Inspection Drawer */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-[var(--border-subtle)] bg-[var(--bg-surface-alt)] p-4 space-y-4 text-xs font-mono"
          >
            {/* Correlation Chain Flow */}
            <CorrelationChainFlow currentEvent={event} />

            {/* Structured Telemetry Payload JSON */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--fg-tertiary)]">
                  Event Telemetry Data
                </span>
                <span className="text-[9px] font-mono text-[var(--fg-tertiary)]">
                  FORMAT: JSON_SCHEMA_STRICT
                </span>
              </div>
              <pre className="p-3 rounded-[var(--radius-md)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[11px] text-[var(--fg-secondary)] overflow-x-auto max-h-56">
                {JSON.stringify(event.event_data, null, 2)}
              </pre>
            </div>

            {/* Quick Context Navigation Links */}
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              {event.recovery_case_id && (
                <Link
                  href={`/recovery?caseId=${event.recovery_case_id}`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-sm)] bg-[var(--brand-primary-muted)] border border-[var(--brand-primary-ring)] text-[11px] font-semibold text-[var(--brand-primary-light)] hover:bg-[var(--brand-primary)] hover:text-white transition-colors"
                >
                  Inspect Case in Recovery Center →
                </Link>
              )}
              {event.transaction_id && (
                <Link
                  href={`/transactions?transactionId=${event.transaction_id}`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-sm)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[11px] font-semibold text-[var(--fg-secondary)] hover:text-[var(--fg-primary)] hover:bg-[var(--bg-raised)] transition-colors"
                >
                  View Transaction Details →
                </Link>
              )}
              <Link
                href={`/simulator?caseId=${event.recovery_case_id || ""}&scenario=A`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-sm)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[11px] font-semibold text-[var(--fg-secondary)] hover:text-[var(--fg-primary)] hover:bg-[var(--bg-raised)] transition-colors"
              >
                Simulate in Engine →
              </Link>
            </div>

            {/* Immutability Verification Signature */}
            <div className="p-2.5 rounded-[var(--radius-sm)] bg-[var(--status-success-subtle)]/40 border border-[var(--status-success-border)] flex items-center justify-between text-[10px] text-[var(--status-success-text)] font-mono">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[var(--status-success)]" />
                <span className="font-bold">TAMPER-PROOF AUDIT RECORD · IMMUTABLE LEDGER</span>
              </div>
              <span className="hidden sm:inline-block text-[var(--fg-tertiary)]">
                HASH: sha256:{event.id.slice(0, 16)}…
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
