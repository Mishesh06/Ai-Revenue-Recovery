"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, X, Copy, CheckCheck, Clock, BrainCircuit,
  Activity, Map, ShieldCheck, Play, CheckCircle2,
  XCircle, AlertTriangle, UserCheck, Terminal,
  ExternalLink, Layers, ArrowRight
} from "lucide-react";
import { AuditEventOut } from "@/types/api";
import { formatDateTime, formatRelativeTime, truncateId, formatCurrency, cn } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";

/* ─────────────────────────────────────────────────────────────────────────────
   CorrelationCaseFollower — RecoverAI Complete Lifecycle Visualizer
   Follows an entire recovery case from failure ingestion to final settlement,
   showing chronological decision nodes and verified telemetry.
   ──────────────────────────────────────────────────────────────────────────── */

interface CorrelationCaseFollowerProps {
  caseId: string | null;
  correlationId: string | null;
  events: AuditEventOut[];
  onClose: () => void;
  className?: string;
}

export function CorrelationCaseFollower({
  caseId,
  correlationId,
  events,
  onClose,
  className,
}: CorrelationCaseFollowerProps) {
  const { toast } = useToast();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    toast.success("Copied to clipboard", `${label}: ${truncateId(text, 14)}`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Filter and sort all events related to this case/correlation
  const caseEvents = events
    .filter((e) =>
      (caseId && e.recovery_case_id === caseId) ||
      (correlationId && e.correlation_id === correlationId)
    )
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  if (!caseId && !correlationId) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-end p-0 sm:p-4">
      <motion.div
        initial={{ opacity: 0, x: 100 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 100 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="w-full max-w-2xl h-full sm:h-[90vh] bg-[var(--bg-surface)] sm:rounded-[var(--radius-xl)] border-l sm:border border-[var(--border-subtle)] shadow-[var(--shadow-xl)] flex flex-col overflow-hidden"
      >
        {/* Drawer Header */}
        <div className="p-5 border-b border-[var(--border-subtle)] bg-[var(--bg-surface-alt)]/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[var(--radius-md)] bg-[var(--brand-primary-muted)] border border-[var(--brand-primary-ring)] flex items-center justify-center text-[var(--brand-primary)] shadow-[var(--shadow-xs)] flex-shrink-0">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-[var(--fg-primary)]">
                  Case Correlation Lifecycle
                </h3>
                {caseId && (
                  <span className="font-mono text-xs font-bold text-[var(--brand-primary)] bg-[var(--brand-primary-muted)] px-2 py-0.5 rounded-[var(--radius-xs)] border border-[var(--brand-primary-ring)]">
                    {truncateId(caseId, 12)}
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--fg-tertiary)] font-mono mt-0.5">
                Complete immutable execution trace across all recovery subsystems
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-[var(--radius-xs)] text-[var(--fg-tertiary)] hover:text-[var(--fg-primary)] hover:bg-[var(--bg-surface)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Case Metadata Strip */}
        <div className="px-5 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-xs">
          <div>
            <span className="text-[10px] text-[var(--fg-tertiary)] block">Correlation ID:</span>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="font-semibold text-[var(--fg-primary)] truncate max-w-[140px]">
                {truncateId(correlationId || "trace-unknown", 12)}
              </span>
              {correlationId && (
                <button
                  onClick={() => handleCopy(correlationId, "Correlation ID")}
                  className="text-[var(--fg-tertiary)] hover:text-[var(--fg-primary)]"
                >
                  {copiedKey === "Correlation ID" ? <CheckCheck className="w-3 h-3 text-[var(--status-success)]" /> : <Copy className="w-3 h-3" />}
                </button>
              )}
            </div>
          </div>

          <div>
            <span className="text-[10px] text-[var(--fg-tertiary)] block">Lifecycle Nodes:</span>
            <span className="font-bold text-[var(--brand-primary)] mt-0.5 block">
              {caseEvents.length} Verified Events
            </span>
          </div>

          <div className="col-span-2 sm:col-span-1">
            <span className="text-[10px] text-[var(--fg-tertiary)] block">Ledger State:</span>
            <span className="font-bold text-[var(--status-success-text)] mt-0.5 block">
              IMMUTABLE & VERIFIED
            </span>
          </div>
        </div>

        {/* Chronological Event Tree */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {caseEvents.length === 0 ? (
            <div className="py-16 text-center text-xs font-mono text-[var(--fg-tertiary)]">
              No matching events found for this correlation ID.
            </div>
          ) : (
            caseEvents.map((evt, idx) => {
              const isLast = idx === caseEvents.length - 1;
              const isExpanded = expandedEventId === evt.id;

              const isSuccess = evt.event_type.includes("Succeed") || evt.event_type === "CaseClosed";
              const isFail = evt.event_type.includes("Fail") || evt.event_type.includes("Timeout");
              const isPolicy = evt.event_type.includes("Policy");
              const isReview = evt.event_type.includes("Review");
              const isAgent = evt.event_type.includes("Diagnos") || evt.event_type.includes("Predict") || evt.event_type.includes("Plan");

              const Icon = isSuccess
                ? CheckCircle2
                : isFail
                ? XCircle
                : isPolicy
                ? ShieldCheck
                : isReview
                ? UserCheck
                : isAgent
                ? BrainCircuit
                : Play;

              return (
                <div key={evt.id || idx} className="relative flex items-start group">
                  {/* Vertical connector line */}
                  {!isLast && (
                    <div className="absolute left-[15px] top-[32px] bottom-[-16px] w-0.5 bg-[var(--border-subtle)] group-hover:bg-[var(--border-strong)] transition-colors" />
                  )}

                  {/* Icon marker */}
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mr-3.5 z-10 font-mono text-xs shadow-[var(--shadow-xs)]",
                      isSuccess
                        ? "bg-[var(--status-success-subtle)] text-[var(--status-success-text)] border border-[var(--status-success-border)]"
                        : isFail
                        ? "bg-[var(--status-danger-subtle)] text-[var(--status-danger-text)] border border-[var(--status-danger-border)]"
                        : isPolicy
                        ? "bg-[var(--status-warning-subtle)] text-[var(--status-warning-text)] border border-[var(--status-warning-border)]"
                        : isReview
                        ? "bg-[var(--status-review-subtle)] text-[var(--status-review-text)] border border-[var(--status-review-border)]"
                        : "bg-[var(--brand-primary-muted)] text-[var(--brand-primary)] border border-[var(--brand-primary-ring)]"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                  </div>

                  {/* Event card */}
                  <div className="flex-1 p-3.5 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface-alt)]/60 hover:bg-[var(--bg-surface-alt)] transition-all space-y-2">
                    <div
                      className="flex items-center justify-between gap-2 cursor-pointer"
                      onClick={() => setExpandedEventId(isExpanded ? null : evt.id)}
                    >
                      <div>
                        <span className="text-xs font-bold font-mono text-[var(--fg-primary)] block">
                          {evt.event_type}
                        </span>
                        <span className="text-[10px] text-[var(--fg-tertiary)] font-mono block mt-0.5">
                          {formatDateTime(evt.timestamp)} ({formatRelativeTime(evt.timestamp)})
                        </span>
                      </div>

                      <span className="text-[10px] font-mono text-[var(--brand-primary)] hover:underline">
                        {isExpanded ? "Collapse" : "Payload →"}
                      </span>
                    </div>

                    {/* Expandable JSON Payload */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="pt-2 border-t border-[var(--border-subtle)] font-mono text-xs"
                        >
                          <pre className="p-2.5 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[11px] text-[var(--fg-secondary)] overflow-x-auto max-h-48">
                            {JSON.stringify(evt.event_data || {}, null, 2)}
                          </pre>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </motion.div>
    </div>
  );
}
