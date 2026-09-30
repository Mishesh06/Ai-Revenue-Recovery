"use client";

import React from "react";
import { BrainCircuit, Cpu, Zap, Activity } from "lucide-react";
import { formatLatency, cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────────
   AIStatusIndicator — PayRecover Design System
   Sophisticated indicator for AI agents, ML inference latency, and fallback status.
   ──────────────────────────────────────────────────────────────────────────── */

export type AIExecutionState = "LIVE" | "REASONING" | "STANDBY" | "DEGRADED" | "FALLBACK";

export interface AIStatusIndicatorProps {
  modelName?: string;
  version?: string;
  latencyMs?: number;
  state?: AIExecutionState;
  showIcon?: boolean;
  compact?: boolean;
  className?: string;
}

const STATE_CONFIG: Record<
  AIExecutionState,
  { dot: string; text: string; bg: string; border: string; pulse: boolean }
> = {
  LIVE: {
    dot: "bg-[var(--status-success)]",
    text: "text-[var(--status-success-text)]",
    bg: "bg-[var(--status-success-subtle)]",
    border: "border-[var(--status-success-border)]",
    pulse: true,
  },
  REASONING: {
    dot: "bg-[var(--brand-primary)]",
    text: "text-[var(--brand-primary)]",
    bg: "bg-[var(--brand-primary-muted)]",
    border: "border-[var(--brand-primary-ring)]",
    pulse: true,
  },
  STANDBY: {
    dot: "bg-[var(--status-warning)]",
    text: "text-[var(--status-warning-text)]",
    bg: "bg-[var(--status-warning-subtle)]",
    border: "border-[var(--status-warning-border)]",
    pulse: false,
  },
  DEGRADED: {
    dot: "bg-[var(--status-warning)]",
    text: "text-[var(--status-warning-text)]",
    bg: "bg-[var(--status-warning-subtle)]",
    border: "border-[var(--status-warning-border)]",
    pulse: true,
  },
  FALLBACK: {
    dot: "bg-[var(--status-danger)]",
    text: "text-[var(--status-danger-text)]",
    bg: "bg-[var(--status-danger-subtle)]",
    border: "border-[var(--status-danger-border)]",
    pulse: false,
  },
};

export function AIStatusIndicator({
  modelName = "RecoveryPredictor",
  version = "v1.3",
  latencyMs,
  state = "LIVE",
  showIcon = true,
  compact = false,
  className,
}: AIStatusIndicatorProps) {
  const config = STATE_CONFIG[state];

  if (compact) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[var(--radius-xs)] border font-mono text-[10px] font-semibold",
          config.bg,
          config.border,
          config.text,
          className
        )}
      >
        <span
          className={cn(
            "w-1.5 h-1.5 rounded-full flex-shrink-0",
            config.dot,
            config.pulse && "animate-pulse"
          )}
        />
        <span>{state}</span>
        {latencyMs !== undefined && (
          <span className="opacity-75 font-normal">({formatLatency(latencyMs)})</span>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2.5 px-2.5 py-1 rounded-[var(--radius-sm)] border bg-[var(--bg-surface)] shadow-[var(--shadow-xs)]",
        "border-[var(--border-subtle)]",
        className
      )}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        {showIcon && (
          <BrainCircuit className="w-3.5 h-3.5 text-[var(--brand-primary)] flex-shrink-0" />
        )}
        <span className="text-xs font-semibold text-[var(--fg-primary)] truncate">
          {modelName}
        </span>
        {version && (
          <span className="text-[10px] font-mono text-[var(--fg-tertiary)] px-1 py-0.2 rounded bg-[var(--bg-raised)]">
            {version}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5 border-l border-[var(--border-subtle)] pl-2">
        <span
          className={cn(
            "w-1.5 h-1.5 rounded-full flex-shrink-0",
            config.dot,
            config.pulse && "animate-pulse"
          )}
        />
        <span className={cn("text-[10px] font-mono font-bold", config.text)}>
          {state}
        </span>
      </div>

      {latencyMs !== undefined && (
        <span className="text-[10px] font-mono text-[var(--fg-secondary)] bg-[var(--bg-surface-alt)] px-1.5 py-0.5 rounded-[var(--radius-xs)] border border-[var(--border-subtle)]">
          {formatLatency(latencyMs)}
        </span>
      )}
    </div>
  );
}
