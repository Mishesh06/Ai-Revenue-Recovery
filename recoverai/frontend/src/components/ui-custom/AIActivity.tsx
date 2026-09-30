"use client";

import React from "react";
import { Bot, Clock, Activity, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import { cn, formatLatency } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────────
   AIActivity — PayRecover Design System
   Visualizes agent execution status, latency, diagnosis categories,
   and evidence payload insights.
   ──────────────────────────────────────────────────────────────────────────── */

interface AIActivityProps {
  agentName: string;
  category?: string;
  confidence?: number;
  latencyMs?: number;
  status?: "SUCCESS" | "FAILED" | "RUNNING" | string;
  evidence?: Record<string, unknown>;
  className?: string;
}

export function AIActivity({
  agentName,
  category,
  confidence,
  latencyMs,
  status = "SUCCESS",
  evidence,
  className,
}: AIActivityProps) {
  const isSuccess = status === "SUCCESS" || status === "COMPLETED";

  return (
    <div
      className={cn(
        "rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 shadow-[var(--shadow-xs)]",
        className
      )}
    >
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-[var(--radius-sm)] bg-[var(--brand-primary-muted)] flex items-center justify-center">
            <Bot className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
          </div>
          <div>
            <span className="text-xs font-semibold text-[var(--fg-primary)] block">
              {agentName}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {latencyMs !== undefined && (
            <div className="flex items-center gap-1 text-[10px] font-mono text-[var(--fg-tertiary)]">
              <Clock className="w-3 h-3" />
              <span>{formatLatency(latencyMs)}</span>
            </div>
          )}
          <span
            className={cn(
              "inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-[var(--radius-xs)]",
              isSuccess
                ? "bg-[var(--status-success-subtle)] text-[var(--status-success-text)] border border-[var(--status-success-border)]"
                : "bg-[var(--status-danger-subtle)] text-[var(--status-danger-text)] border border-[var(--status-danger-border)]"
            )}
          >
            {isSuccess ? <CheckCircle2 className="w-2.5 h-2.5" /> : <AlertCircle className="w-2.5 h-2.5" />}
            {status}
          </span>
        </div>
      </div>

      {category && (
        <div className="flex items-center justify-between py-2 border-t border-[var(--border-subtle)] text-xs">
          <span className="text-[var(--fg-tertiary)]">Diagnosis Category</span>
          <span className="font-semibold text-[var(--brand-primary)]">
            {category}
          </span>
        </div>
      )}

      {confidence !== undefined && (
        <div className="flex items-center justify-between py-1.5 border-t border-[var(--border-subtle)] text-xs">
          <span className="text-[var(--fg-tertiary)]">Confidence Score</span>
          <span className="font-mono font-semibold text-[var(--fg-primary)]">
            {(confidence * 100).toFixed(0)}%
          </span>
        </div>
      )}

      {evidence && Object.keys(evidence).length > 0 && (
        <div className="mt-2 pt-2 border-t border-[var(--border-subtle)]">
          <span className="text-[10px] uppercase font-semibold tracking-wider text-[var(--fg-tertiary)] block mb-1">
            Evidence Signals
          </span>
          <div className="p-2 rounded-[var(--radius-sm)] bg-[var(--bg-surface-alt)] border border-[var(--border-subtle)] text-[10px] font-mono text-[var(--fg-secondary)] max-h-24 overflow-y-auto">
            <pre>{JSON.stringify(evidence, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
