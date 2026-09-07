"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, ArrowUpRight, ChevronRight, CheckCircle2,
  XCircle, Search, BrainCircuit, Map, ShieldCheck, Play,
  RefreshCw, Terminal, Eye
} from "lucide-react";
import { AuditEventOut } from "@/types/api";
import { formatRelativeTime, truncateId, formatEventType } from "@/lib/utils";
import { cn } from "@/lib/utils";
import Link from "next/link";

/* ─────────────────────────────────────────────────────────────────────────────
   LiveActivityFeed — RecoverAI Design System
   Live audit event stream with timeline motion and expandable JSON telemetry.
   ──────────────────────────────────────────────────────────────────────────── */

interface LiveActivityFeedProps {
  events: AuditEventOut[];
  isLoading?: boolean;
  onRefresh?: () => void;
  className?: string;
}

function getEventColor(eventType: string): {
  dot: string;
  badgeBg: string;
  badgeText: string;
  icon: React.ComponentType<{ className?: string }>;
} {
  const e = eventType.toUpperCase();
  if (e.includes("SUCCEED") || e.includes("CLOSED") || e.includes("SUCCESS")) {
    return {
      dot: "bg-[var(--status-success)]",
      badgeBg: "bg-[var(--status-success-subtle)] border-[var(--status-success-border)]",
      badgeText: "text-[var(--status-success-text)]",
      icon: CheckCircle2,
    };
  }
  if (e.includes("FAIL") || e.includes("EXPIRE") || e.includes("ERROR")) {
    return {
      dot: "bg-[var(--status-danger)]",
      badgeBg: "bg-[var(--status-danger-subtle)] border-[var(--status-danger-border)]",
      badgeText: "text-[var(--status-danger-text)]",
      icon: XCircle,
    };
  }
  if (e.includes("POLICY") || e.includes("APPROVED")) {
    return {
      dot: "bg-[var(--status-warning)]",
      badgeBg: "bg-[var(--status-warning-subtle)] border-[var(--status-warning-border)]",
      badgeText: "text-[var(--status-warning-text)]",
      icon: ShieldCheck,
    };
  }
  if (e.includes("DIAGNOS") || e.includes("PREDICT") || e.includes("AI")) {
    return {
      dot: "bg-[var(--brand-primary)]",
      badgeBg: "bg-[var(--brand-primary-muted)] border-[var(--brand-primary-ring)]",
      badgeText: "text-[var(--brand-primary-hover)]",
      icon: BrainCircuit,
    };
  }
  return {
    dot: "bg-[var(--status-info)]",
    badgeBg: "bg-[var(--status-info-subtle)] border-[var(--status-info-border)]",
    badgeText: "text-[var(--status-info-text)]",
    icon: Activity,
  };
}

export function LiveActivityFeed({
  events,
  isLoading,
  onRefresh,
  className,
}: LiveActivityFeedProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
            <div className="w-2 h-2 rounded-full bg-[var(--brand-primary)] animate-pulse" />
            <h3 className="text-sm font-semibold text-[var(--fg-primary)] tracking-tight">
              Recovery Activity Stream
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isLoading}
                className="p-1 rounded text-[var(--fg-tertiary)] hover:text-[var(--fg-primary)] hover:bg-[var(--bg-raised)] transition-colors disabled:opacity-40"
                title="Refresh audit stream"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
              </button>
            )}
            <Link
              href="/audit"
              className="text-xs font-semibold text-[var(--brand-primary)] hover:underline flex items-center gap-1"
            >
              Full Audit
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Stream List */}
        {events.length === 0 ? (
          <div className="py-8 text-center text-xs text-[var(--fg-tertiary)] font-mono">
            Awaiting real-time recovery telemetry events...
          </div>
        ) : (
          <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
            <AnimatePresence initial={false}>
              {events.map((evt, idx) => {
                const isExpanded = expandedId === evt.id;
                const { dot, badgeBg, badgeText, icon: Icon } = getEventColor(evt.event_type);

                return (
                  <motion.div
                    key={evt.id || idx}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.18, delay: idx * 0.02 }}
                    className={cn(
                      "p-2.5 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface-alt)]",
                      "hover:border-[var(--border-default)] transition-colors"
                    )}
                  >
                    <div
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : evt.id)}
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", dot)} />
                        <span
                          className={cn(
                            "text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-[var(--radius-xs)] border truncate",
                            badgeBg,
                            badgeText
                          )}
                        >
                          {formatEventType(evt.event_type)}
                        </span>
                        <span className="text-[10px] font-mono text-[var(--fg-tertiary)] truncate hidden sm:inline-block">
                          trace: {truncateId(evt.correlation_id, 10)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[10px] font-mono text-[var(--fg-tertiary)]">
                          {formatRelativeTime(evt.timestamp)}
                        </span>
                        <ChevronRight
                          className={cn(
                            "w-3 h-3 text-[var(--fg-tertiary)] transition-transform duration-150",
                            isExpanded && "rotate-90 text-[var(--fg-primary)]"
                          )}
                        />
                      </div>
                    </div>

                    {/* Expandable JSON detail */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.15 }}
                          className="mt-2 pt-2 border-t border-[var(--border-subtle)] text-[10px] font-mono"
                        >
                          <div className="flex items-center justify-between text-[var(--fg-tertiary)] mb-1">
                            <span>Case ID: {evt.recovery_case_id || "None"}</span>
                            <span>Tx ID: {evt.transaction_id || "None"}</span>
                          </div>
                          <pre className="p-2 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--fg-secondary)] overflow-x-auto max-h-36">
                            {JSON.stringify(evt.event_data, null, 2)}
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

      {/* Footer Insight */}
      <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] text-[var(--fg-tertiary)] font-mono">
        <span>Idempotency: STRICT</span>
        <span className="text-[var(--status-success-text)] font-semibold">Zero Duplicate Retries</span>
      </div>
    </div>
  );
}
