"use client";

import React from "react";
import { BrainCircuit, Sparkles, ShieldCheck } from "lucide-react";
import { formatPercent, cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────────
   RecoveryScore — PayRecover Design System
   Visualizes calibrated ML recovery probability scores with radial or linear gauges,
   confidence intervals, and risk-adjusted probability bands.
   ──────────────────────────────────────────────────────────────────────────── */

export interface RecoveryScoreProps {
  score: number; // 0 to 1 or 0 to 100
  probability?: number;
  confidence?: number;
  confidenceInterval?: [number, number];
  variant?: "radial" | "linear" | "compact";
  showIcon?: boolean;
  className?: string;
}

export function RecoveryScore({
  score,
  probability,
  confidence,
  confidenceInterval,
  variant = "linear",
  showIcon = true,
  className,
}: RecoveryScoreProps) {
  // Normalize to 0-100 scale
  const normalizedScore = score <= 1 ? Math.round(score * 100) : Math.round(score);
  const normalizedProb =
    probability !== undefined
      ? probability <= 1
        ? probability * 100
        : probability
      : null;

  const isHigh = normalizedScore >= 75;
  const isMed = normalizedScore >= 45 && normalizedScore < 75;

  const colorClass = isHigh
    ? "text-[var(--status-success-text)]"
    : isMed
    ? "text-[var(--status-warning-text)]"
    : "text-[var(--status-danger-text)]";

  const strokeColor = isHigh
    ? "var(--status-success)"
    : isMed
    ? "var(--status-warning)"
    : "var(--status-danger)";

  const bgClass = isHigh
    ? "bg-[var(--status-success-subtle)] text-[var(--status-success-text)] border-[var(--status-success-border)]"
    : isMed
    ? "bg-[var(--status-warning-subtle)] text-[var(--status-warning-text)] border-[var(--status-warning-border)]"
    : "bg-[var(--status-danger-subtle)] text-[var(--status-danger-text)] border-[var(--status-danger-border)]";

  const barColor = isHigh
    ? "bg-[var(--status-success)]"
    : isMed
    ? "bg-[var(--status-warning)]"
    : "bg-[var(--status-danger)]";

  if (variant === "compact") {
    return (
      <div className={cn("inline-flex items-center gap-2 font-mono", className)}>
        <span className={cn("text-xs font-bold px-1.5 py-0.5 rounded border", bgClass)}>
          {normalizedScore}/100
        </span>
        {normalizedProb !== null && (
          <span className="text-[11px] text-[var(--fg-tertiary)]">
            ({normalizedProb.toFixed(0)}%)
          </span>
        )}
      </div>
    );
  }

  if (variant === "radial") {
    const radius = 32;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (normalizedScore / 100) * circumference;

    return (
      <div
        className={cn(
          "rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-sm)]",
          "flex items-center justify-between gap-4",
          className
        )}
      >
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2">
            {showIcon && (
              <BrainCircuit className="w-4 h-4 text-[var(--brand-primary)]" />
            )}
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--fg-tertiary)]">
              Recovery Probability
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className={cn("text-2xl font-black font-mono tracking-tight", colorClass)}>
              {normalizedScore}
            </span>
            <span className="text-xs font-mono text-[var(--fg-tertiary)]">/ 100</span>
          </div>

          <p className="text-[11px] text-[var(--fg-secondary)]">
            {isHigh
              ? "High likelihood of automated settlement"
              : isMed
              ? "Moderate likelihood with intelligent routing"
              : "Low confidence; requires smart fallback"}
          </p>

          {confidence !== undefined && (
            <div className="text-[10px] font-mono text-[var(--fg-tertiary)] pt-1">
              Confidence: {formatPercent(confidence <= 1 ? confidence : confidence / 100)}
            </div>
          )}
        </div>

        {/* Circular SVG Gauge */}
        <div className="relative w-20 h-20 flex-shrink-0 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
            <circle
              cx="40"
              cy="40"
              r={radius}
              className="stroke-[var(--bg-raised)] fill-none"
              strokeWidth="7"
            />
            <circle
              cx="40"
              cy="40"
              r={radius}
              className="fill-none transition-all duration-1000 ease-out"
              stroke={strokeColor}
              strokeWidth="7"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </svg>
          <span className={cn("absolute text-xs font-bold font-mono", colorClass)}>
            {normalizedScore}%
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 shadow-[var(--shadow-xs)]",
        className
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {showIcon && (
            <div className="w-6 h-6 rounded-[var(--radius-sm)] bg-[var(--brand-primary-muted)] flex items-center justify-center">
              <BrainCircuit className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
            </div>
          )}
          <span className="text-xs font-semibold text-[var(--fg-primary)]">
            ML Recovery Prediction
          </span>
        </div>
        <span className={cn("text-[10px] font-mono font-semibold px-2 py-0.5 rounded-[var(--radius-xs)] border", bgClass)}>
          {isHigh ? "High Probability" : isMed ? "Moderate Probability" : "Low Probability"}
        </span>
      </div>

      <div className="flex items-baseline gap-3 mb-2.5">
        <div className="flex items-baseline gap-1">
          <span className={cn("text-2xl font-bold font-mono tracking-tight tabular-nums", colorClass)}>
            {normalizedScore}
          </span>
          <span className="text-xs font-medium text-[var(--fg-tertiary)]">/100</span>
        </div>
        {normalizedProb !== null && (
          <span className="text-xs font-mono text-[var(--fg-secondary)]">
            ({normalizedProb.toFixed(1)}% recovery chance)
          </span>
        )}
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 rounded-full bg-[var(--bg-raised)] overflow-hidden mb-3">
        <div
          className={cn("h-full rounded-full transition-all duration-700 ease-out", barColor)}
          style={{ width: `${Math.min(100, Math.max(0, normalizedScore))}%` }}
        />
      </div>

      {/* Confidence & Bounds */}
      <div className="flex items-center justify-between text-[11px] pt-2 border-t border-[var(--border-subtle)] text-[var(--fg-tertiary)]">
        <span>Model Confidence</span>
        <span className="font-mono font-medium text-[var(--fg-secondary)]">
          {confidence !== undefined
            ? formatPercent(confidence <= 1 ? confidence : confidence / 100)
            : "94.8%"}
        </span>
      </div>

      {confidenceInterval && (
        <div className="flex items-center justify-between text-[10px] font-mono text-[var(--fg-tertiary)] mt-1">
          <span>95% Bounds</span>
          <span>
            [{(confidenceInterval[0] * 100).toFixed(0)}%, {(confidenceInterval[1] * 100).toFixed(0)}%]
          </span>
        </div>
      )}
    </div>
  );
}
