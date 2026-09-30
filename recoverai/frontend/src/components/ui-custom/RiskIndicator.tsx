"use client";

import React from "react";
import { ShieldAlert, ShieldCheck, AlertTriangle, ShieldX } from "lucide-react";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────────
   RiskIndicator — PayRecover Design System
   Visualizes fintech risk thresholds, customer chargeback probability,
   and deterministic policy compliance levels.
   ──────────────────────────────────────────────────────────────────────────── */

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface RiskIndicatorProps {
  level: RiskLevel | string;
  score?: number; // 0.0 to 1.0 or 0 to 100
  reasonCode?: string;
  description?: string;
  tags?: string[];
  compact?: boolean;
  className?: string;
}

const RISK_CONFIG: Record<
  RiskLevel,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    bg: string;
    text: string;
    border: string;
    barColor: string;
  }
> = {
  LOW: {
    label: "Low Risk",
    icon: ShieldCheck,
    bg: "bg-[var(--status-success-subtle)]",
    text: "text-[var(--status-success-text)]",
    border: "border-[var(--status-success-border)]",
    barColor: "bg-[var(--status-success)]",
  },
  MEDIUM: {
    label: "Medium Risk",
    icon: AlertTriangle,
    bg: "bg-[var(--status-warning-subtle)]",
    text: "text-[var(--status-warning-text)]",
    border: "border-[var(--status-warning-border)]",
    barColor: "bg-[var(--status-warning)]",
  },
  HIGH: {
    label: "High Risk",
    icon: ShieldAlert,
    bg: "bg-[var(--status-danger-subtle)]",
    text: "text-[var(--status-danger-text)]",
    border: "border-[var(--status-danger-border)]",
    barColor: "bg-[var(--status-danger)]",
  },
  CRITICAL: {
    label: "Critical Risk",
    icon: ShieldX,
    bg: "bg-[var(--status-danger-subtle)]",
    text: "text-[var(--status-danger-text)]",
    border: "border-[var(--status-danger-border)]",
    barColor: "bg-[var(--status-danger)]",
  },
};

function normalizeRisk(level: string): RiskLevel {
  const upper = level.toUpperCase();
  if (upper.includes("CRIT")) return "CRITICAL";
  if (upper.includes("HIGH")) return "HIGH";
  if (upper.includes("MED")) return "MEDIUM";
  return "LOW";
}

export function RiskIndicator({
  level,
  score,
  reasonCode,
  description,
  tags,
  compact = false,
  className,
}: RiskIndicatorProps) {
  const riskKey = normalizeRisk(level);
  const config = RISK_CONFIG[riskKey];
  const Icon = config.icon;

  const normalizedScore =
    score !== undefined
      ? score <= 1
        ? Math.round(score * 100)
        : Math.round(score)
      : null;

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
        <Icon className="w-3 h-3 flex-shrink-0" />
        <span>{config.label}</span>
        {normalizedScore !== null && <span>({normalizedScore}%)</span>}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-[var(--radius-md)] border p-4 space-y-2.5",
        config.bg,
        config.border,
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn("w-6 h-6 rounded flex items-center justify-center", config.bg)}>
            <Icon className={cn("w-4 h-4", config.text)} />
          </div>
          <span className={cn("text-xs font-bold font-mono uppercase tracking-wider", config.text)}>
            {config.label}
          </span>
        </div>

        {normalizedScore !== null && (
          <span className={cn("text-xs font-mono font-bold", config.text)}>
            Score: {normalizedScore}/100
          </span>
        )}
      </div>

      {normalizedScore !== null && (
        <div className="w-full h-1.5 rounded-full bg-black/10 overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-500", config.barColor)}
            style={{ width: `${Math.min(100, Math.max(0, normalizedScore))}%` }}
          />
        </div>
      )}

      {description && (
        <p className="text-xs text-[var(--fg-secondary)] leading-relaxed">
          {description}
        </p>
      )}

      {reasonCode && (
        <div className="pt-2 border-t border-black/5 flex items-center justify-between text-[11px] font-mono">
          <span className="text-[var(--fg-tertiary)]">Reason Code</span>
          <span className="font-semibold text-[var(--fg-secondary)]">{reasonCode}</span>
        </div>
      )}

      {tags && tags.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          {tags.map((tag, i) => (
            <span
              key={i}
              className="px-1.5 py-0.5 rounded-[var(--radius-xs)] bg-white/60 border border-black/5 font-mono text-[10px] text-[var(--fg-secondary)]"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
