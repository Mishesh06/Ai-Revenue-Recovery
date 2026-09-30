"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  BrainCircuit, Activity, Map, ShieldCheck,
  Clock, CheckCircle2, ChevronRight, Terminal,
  Sparkles, Layers, ShieldAlert, AlertTriangle,
  Copy, CheckCheck
} from "lucide-react";
import { formatTime, formatDateTime, formatLatency, truncateId, cn } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";

/* ─────────────────────────────────────────────────────────────────────────────
   AgentActivityTimeline — PayRecover AI Command Center
   Live activity stream tracking agent operations, latencies, fallback states,
   and structured decision outputs without exposing private chain-of-thought.
   ──────────────────────────────────────────────────────────────────────────── */

export interface StructuredAgentRun {
  id: string;
  timestamp: string;
  agentName: string;
  agentVersion: string;
  operation: string;
  latencyMs: number;
  status: "SUCCESS" | "FAILED" | "FALLBACK_RULE" | "APPROVED";
  isFallback?: boolean;
  structuredOutput: Record<string, unknown>;
  conciseRationale: string;
  traceId: string;
}

interface AgentActivityTimelineProps {
  runs: StructuredAgentRun[];
  className?: string;
}

export function AgentActivityTimeline({ runs, className }: AgentActivityTimelineProps) {
  const { toast } = useToast();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (e: React.MouseEvent, text: string, label: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    toast.success("Copied to clipboard", `${label}: ${truncateId(text, 12)}`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div
      className={cn(
        "rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 sm:p-6 shadow-[var(--shadow-sm)] space-y-4",
        className
      )}
    >
      <div className="flex items-center justify-between pb-3.5 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-[var(--brand-primary)]" />
          <h3 className="text-sm sm:text-base font-bold text-[var(--fg-primary)] tracking-tight">
            Live Agent Activity & Telemetry Stream
          </h3>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-[var(--status-success-text)] bg-[var(--status-success-subtle)] px-2.5 py-1 rounded-[var(--radius-xs)] font-bold border border-[var(--status-success-border)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-success)] animate-pulse" />
          REAL-TIME STREAM
        </div>
      </div>

      {runs.length === 0 ? (
        <div className="py-12 text-center text-xs text-[var(--fg-tertiary)] font-mono">
          No agent inference runs logged in current window.
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
          <AnimatePresence initial={false}>
            {runs.map((run, idx) => {
              const isExpanded = expandedId === run.id;

              const isPredictor = run.agentName.includes("Predict");
              const isDiagnosis = run.agentName.includes("Diagnos");
              const isPlanner = run.agentName.includes("Plan");
              const isPolicy = run.agentName.includes("Policy");

              const Icon = isPredictor ? BrainCircuit : isDiagnosis ? Activity : isPlanner ? Map : ShieldCheck;

              return (
                <motion.div
                  key={run.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.18, delay: idx * 0.02 }}
                  className={cn(
                    "p-3.5 rounded-[var(--radius-md)] border transition-all hover:border-[var(--border-default)]",
                    isExpanded
                      ? "border-[var(--brand-primary)] bg-[var(--bg-surface-alt)] shadow-[var(--shadow-xs)]"
                      : "border-[var(--border-subtle)] bg-[var(--bg-surface-alt)]/60"
                  )}
                >
                  <div
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : run.id)}
                  >
                    {/* Left: Icon + Agent Name + Version + Operation + Rationale */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-[var(--radius-xs)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--brand-primary)] flex-shrink-0 shadow-[var(--shadow-xs)]">
                        <Icon className="w-3.5 h-3.5" />
                      </div>

                      <div className="flex items-center gap-2 min-w-0 flex-wrap">
                        <span className="text-xs font-bold font-mono text-[var(--fg-primary)]">
                          {run.agentName}
                        </span>

                        <span className="text-[10px] font-mono text-[var(--fg-tertiary)] bg-[var(--bg-raised)] px-1.5 py-0.2 rounded">
                          {run.agentVersion}
                        </span>

                        {/* Fallback vs Normal Badge */}
                        {run.isFallback ? (
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-[var(--status-warning-subtle)] text-[var(--status-warning-text)] border border-[var(--status-warning-border)]">
                            FALLBACK: RULE-BASED
                          </span>
                        ) : (
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-[var(--brand-primary-muted)] text-[var(--brand-primary)] border border-[var(--brand-primary-ring)]">
                            LLM LIVE
                          </span>
                        )}

                        <span className="text-xs font-medium text-[var(--fg-secondary)] truncate">
                          {run.conciseRationale}
                        </span>
                      </div>
                    </div>

                    {/* Right: Latency, Timestamp, Chevron */}
                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto font-mono text-xs">
                      <div className="flex items-center gap-1 text-[10px] text-[var(--fg-tertiary)]">
                        <Clock className="w-3 h-3" />
                        <span>{formatLatency(run.latencyMs)}</span>
                      </div>

                      <span className="text-[10px] text-[var(--fg-tertiary)]">
                        {formatTime(run.timestamp)}
                      </span>

                      <ChevronRight
                        className={cn(
                          "w-3.5 h-3.5 text-[var(--fg-tertiary)] transition-transform duration-150",
                          isExpanded && "rotate-90 text-[var(--brand-primary)]"
                        )}
                      />
                    </div>
                  </div>

                  {/* Expandable JSON Output without Chain-of-Thought */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.15 }}
                        className="mt-3 pt-3 border-t border-[var(--border-subtle)] space-y-2 text-xs font-mono"
                      >
                        <div className="flex items-center justify-between text-[10px] text-[var(--fg-tertiary)] flex-wrap gap-2">
                          <div className="flex items-center gap-1.5">
                            <span>Correlation Trace:</span>
                            <Link
                              href={`/audit?correlationId=${run.traceId}`}
                              className="font-bold text-[var(--brand-primary-light)] hover:underline"
                              title="Inspect Trace in Audit Ledger"
                            >
                              {truncateId(run.traceId, 14)}
                            </Link>
                            <button
                              onClick={(e) => handleCopy(e, run.traceId, "Trace ID")}
                              className="text-[var(--fg-tertiary)] hover:text-[var(--fg-primary)]"
                              title="Copy Correlation ID"
                            >
                              {copiedKey === run.traceId ? (
                                <CheckCheck className="w-3 h-3 text-[var(--status-success)]" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>

                          <div className="flex items-center gap-2">
                            <Link
                              href={`/audit?correlationId=${run.traceId}`}
                              className="text-[var(--brand-primary)] hover:underline"
                            >
                              Inspect Audit Ledger →
                            </Link>
                            <span>·</span>
                            <span>Latency: <strong>{formatLatency(run.latencyMs)}</strong></span>
                          </div>
                        </div>

                        <pre className="p-3 rounded-[var(--radius-md)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[11px] text-[var(--fg-secondary)] overflow-x-auto">
                          {JSON.stringify(run.structuredOutput, null, 2)}
                        </pre>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
