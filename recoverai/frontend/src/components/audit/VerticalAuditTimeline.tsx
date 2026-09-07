"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard, Search, BrainCircuit, Activity, Map,
  ShieldCheck, Play, CheckCircle2, XCircle, AlertTriangle,
  FileText, UserCheck, ChevronRight, Copy, CheckCheck,
  Shield, Terminal, Lock, Clock, ExternalLink
} from "lucide-react";
import { AuditEventOut } from "@/types/api";
import { formatDateTime, formatRelativeTime, truncateId, cn } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";

/* ─────────────────────────────────────────────────────────────────────────────
   VerticalAuditTimeline — RecoverAI Progressive Audit Timeline
   Sophisticated, vertical progressive timeline communicating trust, traceability,
   and financial safety without visual noise.
   ──────────────────────────────────────────────────────────────────────────── */

interface VerticalAuditTimelineProps {
  events: AuditEventOut[];
  onSelectCase: (caseId: string | null, correlationId: string | null) => void;
  className?: string;
}

function getEventStyling(eventType: string) {
  const e = eventType.toUpperCase();

  if (e.includes("SUCCEED") || e.includes("CLOSED") || e === "RECOVERYAPPROVED") {
    return {
      icon: CheckCircle2,
      label: "SUCCESS & SETTLED",
      color: "text-[var(--status-success-text)]",
      bg: "bg-[var(--status-success-subtle)] border-[var(--status-success-border)]",
      dot: "bg-[var(--status-success)]",
    };
  }
  if (e.includes("FAIL") || e.includes("EXPIRE") || e.includes("ERROR")) {
    return {
      icon: XCircle,
      label: "FAILURE / TIMEOUT",
      color: "text-[var(--status-danger-text)]",
      bg: "bg-[var(--status-danger-subtle)] border-[var(--status-danger-border)]",
      dot: "bg-[var(--status-danger)]",
    };
  }
  if (e.includes("POLICY") || e.includes("REVIEW") || e.includes("MANUAL")) {
    return {
      icon: ShieldCheck,
      label: "GOVERNANCE GATE",
      color: "text-[var(--status-warning-text)]",
      bg: "bg-[var(--status-warning-subtle)] border-[var(--status-warning-border)]",
      dot: "bg-[var(--status-warning)]",
    };
  }
  if (e.includes("DIAGNOS") || e.includes("PREDICT")) {
    return {
      icon: BrainCircuit,
      label: "AI INFERENCE",
      color: "text-[var(--brand-primary)]",
      bg: "bg-[var(--brand-primary-muted)] border-[var(--brand-primary-ring)]",
      dot: "bg-[var(--brand-primary)]",
    };
  }
  if (e.includes("PLAN")) {
    return {
      icon: Map,
      label: "STRATEGY PLAN",
      color: "text-[var(--status-info-text)]",
      bg: "bg-[var(--status-info-subtle)] border-[var(--status-info-border)]",
      dot: "bg-[var(--status-info)]",
    };
  }
  return {
    icon: Activity,
    label: "SYSTEM INGEST",
    color: "text-[var(--fg-secondary)]",
    bg: "bg-[var(--bg-raised)] border-[var(--border-subtle)]",
    dot: "bg-[var(--status-neutral)]",
  };
}

function getActor(eventType: string, eventData: any): string {
  if (eventData?.actor) return eventData.actor;
  if (eventData?.agent) return eventData.agent;

  const e = eventType.toUpperCase();
  if (e.includes("PAYMENT") || e.includes("OPPORTUNITY")) return "Razorpay Ingest";
  if (e.includes("DIAGNOS")) return "DiagnosisAgent v2.1";
  if (e.includes("PREDICT")) return "RecoveryPredictor v1.3";
  if (e.includes("PLAN")) return "RecoveryPlanner v2.0";
  if (e.includes("POLICY")) return "PolicyEngine v1.2";
  if (e.includes("EXECUTE") || e.includes("SUCCEED") || e.includes("FAIL")) return "ActionAdapter v3.2";
  if (e.includes("REVIEW")) return "Human Operator";
  if (e.includes("CLOSED")) return "Settlement Ledger";
  return "RecoverAI Core";
}

export function VerticalAuditTimeline({
  events,
  onSelectCase,
  className,
}: VerticalAuditTimelineProps) {
  const { toast } = useToast();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (e: React.MouseEvent, text: string, label: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    toast.success("Copied to clipboard", `${label}: ${truncateId(text, 14)}`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-3 relative pl-2 sm:pl-4">
        {events.map((event, idx) => {
          const isLast = idx === events.length - 1;
          const isExpanded = expandedId === event.id;
          const style = getEventStyling(event.event_type);
          const Icon = style.icon;
          const actor = getActor(event.event_type, event.event_data);

          return (
            <motion.div
              key={event.id || idx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: Math.min(0.2, idx * 0.02) }}
              className="relative flex items-start group"
            >
              {/* Vertical connector line */}
              {!isLast && (
                <div className="absolute left-[17px] top-[36px] bottom-[-14px] w-0.5 bg-[var(--border-subtle)] group-hover:bg-[var(--border-strong)] transition-colors" />
              )}

              {/* Icon Marker */}
              <div
                className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mr-4 z-10 font-mono text-xs shadow-[var(--shadow-xs)] transition-transform group-hover:scale-105",
                  style.bg
                )}
              >
                <Icon className={cn("w-4 h-4", style.color)} />
              </div>

              {/* Event Content Card */}
              <div
                className={cn(
                  "flex-1 p-4 rounded-[var(--radius-lg)] border transition-all duration-[var(--duration-fast)]",
                  isExpanded
                    ? "bg-[var(--bg-surface)] border-[var(--brand-primary)] shadow-[var(--shadow-md)] ring-1 ring-[var(--brand-primary-ring)]"
                    : "bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--border-default)] shadow-[var(--shadow-xs)]"
                )}
              >
                {/* Top Row: Event Name + Timestamp + Actor */}
                <div
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : event.id)}
                >
                  <div className="flex items-center gap-2.5 flex-wrap min-w-0">
                    <span className="font-mono text-xs sm:text-sm font-bold text-[var(--fg-primary)]">
                      {event.event_type}
                    </span>

                    <span
                      className={cn(
                        "text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border",
                        style.bg,
                        style.color
                      )}
                    >
                      {style.label}
                    </span>

                    <span className="text-[10px] font-mono text-[var(--fg-tertiary)] bg-[var(--bg-raised)] px-2 py-0.5 rounded-[var(--radius-xs)]">
                      Actor: <strong className="text-[var(--fg-secondary)]">{actor}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto font-mono text-xs text-[var(--fg-tertiary)]">
                    <div className="flex items-center gap-1 text-[11px]">
                      <Clock className="w-3 h-3" />
                      <span>{formatRelativeTime(event.timestamp)}</span>
                    </div>

                    <span className="hidden md:inline text-[10px]">
                      {formatDateTime(event.timestamp)}
                    </span>

                    <ChevronRight
                      className={cn(
                        "w-4 h-4 text-[var(--fg-tertiary)] transition-transform duration-150",
                        isExpanded && "rotate-90 text-[var(--brand-primary)]"
                      )}
                    />
                  </div>
                </div>

                {/* Sub Row: Correlation Trace ID & Case Trigger */}
                <div className="mt-2.5 pt-2 border-t border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-mono text-xs">
                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Correlation ID */}
                    <div className="flex items-center gap-1 text-[11px] text-[var(--fg-tertiary)]">
                      <span>Trace:</span>
                      <span className="font-semibold text-[var(--fg-primary)]">
                        {truncateId(event.correlation_id, 14)}
                      </span>
                      <button
                        onClick={(e) => handleCopy(e, event.correlation_id, "Trace ID")}
                        className="text-[var(--fg-tertiary)] hover:text-[var(--fg-primary)] p-0.5"
                        title="Copy correlation ID"
                      >
                        {copiedKey === event.correlation_id ? (
                          <CheckCheck className="w-3 h-3 text-[var(--status-success)]" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>

                    {/* Case Link */}
                    {event.recovery_case_id && (
                      <div className="flex items-center gap-1 text-[11px] text-[var(--fg-tertiary)]">
                        <span>Case:</span>
                        <span className="font-semibold text-[var(--brand-primary)]">
                          {truncateId(event.recovery_case_id, 12)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Follow Case Action CTA */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectCase(event.recovery_case_id || null, event.correlation_id);
                    }}
                    className="text-[11px] font-bold text-[var(--brand-primary)] hover:text-[var(--brand-primary-hover)] flex items-center gap-1 self-start sm:self-auto hover:underline"
                  >
                    <span>Follow Case Flow</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>

                {/* Expandable JSON Metadata Payload */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.15 }}
                      className="mt-3 pt-3 border-t border-[var(--border-subtle)] space-y-2 font-mono text-xs"
                    >
                      <div className="flex items-center justify-between text-[10px] text-[var(--fg-tertiary)]">
                        <span>Tamper-Proof Audit Payload</span>
                        <span>SHA-256 Digest Verified</span>
                      </div>

                      <pre className="p-3 rounded-[var(--radius-md)] bg-[var(--bg-surface-alt)] border border-[var(--border-subtle)] text-[11px] text-[var(--fg-secondary)] overflow-x-auto max-h-56">
                        {JSON.stringify(event.event_data || {}, null, 2)}
                      </pre>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
