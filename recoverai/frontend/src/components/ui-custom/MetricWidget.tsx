"use client";

import React from "react";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { motion } from "framer-motion";
import { cardVariants } from "@/lib/motion";
import { AnimatedNumber } from "./AnimatedNumber";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────────
   MetricWidget — RecoverAI Design System
   Premium KPI card with color variants, trend indicators, and smooth Framer Motion entrance.
   ──────────────────────────────────────────────────────────────────────────── */

import { MetricVariant } from "./MetricCard";
export type { MetricVariant };

interface MetricWidgetProps {
  title: string;
  value: string | number;
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;
  description?: string;
  variant?: MetricVariant;
  trend?: {
    value: number;      // absolute delta
    isPositive: boolean;
    label?: string;     // e.g. "vs last 7 days"
  };
  isLoading?: boolean;
  suffix?: string;      // e.g. "cases", "ms"
  index?: number;
}

const VARIANT_STYLES: Record<
  MetricVariant,
  { iconBg: string; iconColor: string; accent: string; valueColor: string }
> = {
  default: {
    iconBg:     "bg-[var(--bg-raised)]",
    iconColor:  "text-[var(--fg-secondary)]",
    accent:     "bg-[var(--bg-raised)]",
    valueColor: "text-[var(--fg-primary)]",
  },
  danger: {
    iconBg:     "bg-[var(--status-danger-subtle)]",
    iconColor:  "text-[var(--status-danger)]",
    accent:     "bg-[var(--status-danger-subtle)]",
    valueColor: "text-[var(--status-danger-text)]",
  },
  success: {
    iconBg:     "bg-[var(--status-success-subtle)]",
    iconColor:  "text-[var(--status-success)]",
    accent:     "bg-[var(--status-success-subtle)]",
    valueColor: "text-[var(--status-success-text)]",
  },
  warning: {
    iconBg:     "bg-[var(--status-warning-subtle)]",
    iconColor:  "text-[var(--status-warning)]",
    accent:     "bg-[var(--status-warning-subtle)]",
    valueColor: "text-[var(--status-warning-text)]",
  },
  brand: {
    iconBg:     "bg-[var(--brand-primary-muted)]",
    iconColor:  "text-[var(--brand-primary)]",
    accent:     "bg-[var(--brand-primary-muted)]",
    valueColor: "text-[var(--brand-primary-hover)]",
  },
  review: {
    iconBg:     "bg-[var(--status-review-subtle)]",
    iconColor:  "text-[var(--status-review)]",
    accent:     "bg-[var(--status-review-subtle)]",
    valueColor: "text-[var(--status-review-text)]",
  },
  info: {
    iconBg:     "bg-[var(--status-info-subtle)]",
    iconColor:  "text-[var(--status-info)]",
    accent:     "bg-[var(--status-info-subtle)]",
    valueColor: "text-[var(--status-info-text)]",
  },
};

export function MetricWidget({
  title,
  value,
  icon: Icon,
  description,
  variant = "default",
  trend,
  isLoading,
  suffix,
  index = 0,
}: MetricWidgetProps) {
  const styles = VARIANT_STYLES[variant];

  if (isLoading) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-sm)]">
        <div className="skeleton-shimmer h-3 w-20 rounded mb-4" />
        <div className="skeleton-shimmer h-7 w-28 rounded" />
      </div>
    );
  }

  return (
    <motion.div
      custom={index}
      initial="hidden"
      animate="visible"
      variants={cardVariants}
      className={cn(
        "group relative rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5",
        "shadow-[var(--shadow-sm)] transition-shadow duration-[var(--duration-base)]",
        "hover:shadow-[var(--shadow-md)] flex flex-col justify-between"
      )}
    >
      <div>
        {/* Top row: label + icon */}
        <div className="flex items-start justify-between mb-3">
          <span
            className="text-[11px] font-semibold uppercase tracking-[0.06em]"
            style={{ color: "var(--fg-tertiary)" }}
          >
            {title}
          </span>
          {Icon && (
            <div
              className={cn(
                "w-7 h-7 rounded-[var(--radius-sm)] flex items-center justify-center flex-shrink-0",
                styles.iconBg
              )}
            >
              <Icon className={cn("h-3.5 w-3.5", styles.iconColor)} />
            </div>
          )}
        </div>

        {/* Value */}
        <div className="flex items-baseline gap-1">
          <span
            className={cn("text-2xl font-bold font-mono leading-none tracking-tight", styles.valueColor)}
          >
            {typeof value === "number" ? (
              <AnimatedNumber value={value} />
            ) : (
              value
            )}
          </span>
          {suffix && (
            <span className="text-xs font-medium font-mono" style={{ color: "var(--fg-tertiary)" }}>
              {suffix}
            </span>
          )}
        </div>
      </div>

      {/* Trend or description */}
      {trend && (
        <div className="flex items-center gap-1 mt-2.5">
          {trend.isPositive ? (
            <TrendingUp className="h-3 w-3" style={{ color: "var(--status-success)" }} />
          ) : (
            <TrendingDown className="h-3 w-3" style={{ color: "var(--status-danger)" }} />
          )}
          <span
            className="text-[11px] font-semibold font-mono"
            style={{
              color: trend.isPositive ? "var(--status-success)" : "var(--status-danger)",
            }}
          >
            {trend.isPositive ? "+" : "-"}{Math.abs(trend.value)}%
          </span>
          {trend.label && (
            <span className="text-[11px]" style={{ color: "var(--fg-tertiary)" }}>
              {trend.label}
            </span>
          )}
        </div>
      )}

      {description && !trend && (
        <p className="text-[11px] mt-2.5" style={{ color: "var(--fg-tertiary)" }}>
          {description}
        </p>
      )}
    </motion.div>
  );
}
