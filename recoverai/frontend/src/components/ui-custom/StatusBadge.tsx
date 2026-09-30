import React from "react";
import { cn, formatStateLabel } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────────
   StatusBadge — PayRecover Design System
   Canonical component for all status, policy gate, and lifecycle states.
   ──────────────────────────────────────────────────────────────────────────── */

export type StatusVariant =
  | "success"
  | "danger"
  | "warning"
  | "review"
  | "info"
  | "neutral"
  | "brand"
  | "purple"; // alias for review

export type StatusBadgeSize = "xs" | "sm" | "md" | "lg";

export interface StatusBadgeProps {
  label: string;
  variant?: StatusVariant;
  size?: StatusBadgeSize;
  /** Show a status indicator dot before the label */
  dot?: boolean;
  /** Pulse animation on the dot */
  pulse?: boolean;
  /** Show value in UPPERCASE monospace — for state enums */
  mono?: boolean;
  className?: string;
}

const VARIANT_TOKENS: Record<
  StatusVariant,
  { bg: string; text: string; border: string; dot: string; glow: string }
> = {
  success: {
    bg:     "var(--status-success-subtle)",
    text:   "var(--status-success-text)",
    border: "var(--status-success-border)",
    dot:    "var(--status-success)",
    glow:   "var(--status-success-glow)",
  },
  danger: {
    bg:     "var(--status-danger-subtle)",
    text:   "var(--status-danger-text)",
    border: "var(--status-danger-border)",
    dot:    "var(--status-danger)",
    glow:   "var(--status-danger-glow)",
  },
  warning: {
    bg:     "var(--status-warning-subtle)",
    text:   "var(--status-warning-text)",
    border: "var(--status-warning-border)",
    dot:    "var(--status-warning)",
    glow:   "var(--status-warning-glow)",
  },
  review: {
    bg:     "var(--status-review-subtle)",
    text:   "var(--status-review-text)",
    border: "var(--status-review-border)",
    dot:    "var(--status-review)",
    glow:   "var(--status-review-glow)",
  },
  purple: {
    bg:     "var(--status-review-subtle)",
    text:   "var(--status-review-text)",
    border: "var(--status-review-border)",
    dot:    "var(--status-review)",
    glow:   "var(--status-review-glow)",
  },
  info: {
    bg:     "var(--status-info-subtle)",
    text:   "var(--status-info-text)",
    border: "var(--status-info-border)",
    dot:    "var(--status-info)",
    glow:   "var(--status-info-glow)",
  },
  neutral: {
    bg:     "var(--status-neutral-subtle)",
    text:   "var(--status-neutral-text)",
    border: "var(--status-neutral-border)",
    dot:    "var(--status-neutral)",
    glow:   "transparent",
  },
  brand: {
    bg:     "var(--brand-primary-muted)",
    text:   "var(--brand-primary)",
    border: "var(--brand-primary-ring)",
    dot:    "var(--brand-primary)",
    glow:   "var(--brand-glow)",
  },
};

const SIZE_CLASSES: Record<StatusBadgeSize, string> = {
  xs: "px-1.5 py-0.5 text-[9px] rounded-[var(--radius-xs)]",
  sm: "px-2 py-0.5 text-[10px] rounded-[var(--radius-xs)]",
  md: "px-2.5 py-1 text-xs rounded-[var(--radius-sm)]",
  lg: "px-3 py-1.5 text-xs font-semibold rounded-[var(--radius-md)]",
};

/**
 * Auto-detect variant from a raw state/status string.
 */
export function inferVariant(state: string): StatusVariant {
  const s = state.toUpperCase();

  if (["CLOSED", "RECOVERED", "SUCCEEDED", "SUCCESS", "OK", "CONNECTED", "LIVE", "HEALTHY"].some((v) => s.includes(v))) {
    return "success";
  }
  if (["FAILED", "FAILURE", "EXPIRED", "ERROR", "REJECTED", "BLOCKED", "DEGRADED"].some((v) => s.includes(v))) {
    return "danger";
  }
  if (["REVIEW_REQUIRED", "MANUAL_REVIEW", "REVIEW"].some((v) => s.includes(v))) {
    return "review";
  }
  if (["PENDING", "POLICY_CHECK", "PLANNED", "PREDICTED", "TIMEOUT", "STANDBY"].some((v) => s.includes(v))) {
    return "warning";
  }
  if (["EXECUTING", "RECOVERING", "ANALYZING", "DETECTING", "ACTIVE", "STARTED", "ORCHESTRATING"].some((v) => s.includes(v))) {
    return "info";
  }
  if (["PROPOSED", "APPROVED"].some((v) => s.includes(v))) {
    return "brand";
  }
  return "neutral";
}

export function StatusBadge({
  label,
  variant,
  size = "sm",
  dot = false,
  pulse = false,
  mono = true,
  className,
}: StatusBadgeProps) {
  const resolvedVariant = variant ?? inferVariant(label);
  const tokens = VARIANT_TOKENS[resolvedVariant];
  const displayLabel = mono ? formatStateLabel(label) : label;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-medium border whitespace-nowrap shadow-[0_1px_2px_rgba(0,0,0,0.02)]",
        mono && "font-mono tracking-wide",
        SIZE_CLASSES[size],
        className
      )}
      style={{
        background: tokens.bg,
        color: tokens.text,
        borderColor: tokens.border,
      }}
    >
      {dot && (
        <span
          className={cn(
            "inline-block w-1.5 h-1.5 rounded-full flex-shrink-0",
            pulse && "animate-pulse"
          )}
          style={{ background: tokens.dot }}
        />
      )}
      {displayLabel}
    </span>
  );
}

/* ── ConfidenceBadge — ML score display ──────────────────────────────────────*/
export interface ConfidenceBadgeProps {
  value: number | undefined | null;
  showBar?: boolean;
  className?: string;
}

export function ConfidenceBadge({ value, showBar = false, className }: ConfidenceBadgeProps) {
  if (value === undefined || value === null) {
    return <span className="text-xs text-[var(--fg-tertiary)]">—</span>;
  }

  const pct = Math.round(value <= 1 ? value * 100 : value);
  const variant: StatusVariant =
    pct >= 75 ? "success" : pct >= 45 ? "warning" : "danger";
  const tokens = VARIANT_TOKENS[variant];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span
        className="text-xs font-semibold font-mono tabular-nums"
        style={{ color: tokens.text }}
      >
        {pct}%
      </span>
      {showBar && (
        <div
          className="w-14 h-1.5 rounded-full overflow-hidden"
          style={{ background: "var(--bg-raised)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: tokens.dot }}
          />
        </div>
      )}
    </div>
  );
}

/* ── PolicyDecisionBadge — APPROVED / REVIEW / BLOCKED ──────────────────────*/
export function PolicyDecisionBadge({ decision }: { decision: string }) {
  const variant =
    decision === "APPROVED" ? "success"
    : decision === "REVIEW" || decision === "REVIEW_REQUIRED" ? "review"
    : "danger";
  return <StatusBadge label={decision} variant={variant} size="sm" dot />;
}
