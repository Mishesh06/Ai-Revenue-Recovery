"use client";

import React from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, LucideIcon } from "lucide-react";
import { AnimatedNumber } from "./AnimatedNumber";
import { cardVariants } from "@/lib/motion";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────────
   MetricCard — RecoverAI Design System
   High-hierarchy fintech KPI card with tabular financial numbers,
   status accent bar, micro-trend indicator, and spring entrance.
   ──────────────────────────────────────────────────────────────────────────── */

export type MetricVariant =
  | "default"
  | "brand"
  | "success"
  | "warning"
  | "danger"
  | "review"
  | "info";

export interface MetricCardProps {
  title: string;
  value: string | number;
  formatType?: "currency" | "compactCurrency" | "percent" | "number" | "integer" | "raw";
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;
  description?: string;
  variant?: MetricVariant;
  trend?: {
    value: number;
    isPositive: boolean;
    label?: string;
  };
  sparklineData?: number[];
  secondaryValue?: string;
  secondaryLabel?: string;
  accentBar?: boolean;
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  suffix?: string;
  prefix?: string;
  currency?: string;
  index?: number;
  className?: string;
}

const VARIANT_CONFIG: Record<
  MetricVariant,
  {
    iconBg: string;
    iconColor: string;
    accentBarColor: string;
    valueColor: string;
    borderGlow?: string;
  }
> = {
  default: {
    iconBg: "bg-[var(--bg-raised)]",
    iconColor: "text-[var(--fg-secondary)]",
    accentBarColor: "bg-[var(--border-strong)]",
    valueColor: "text-[var(--fg-primary)]",
  },
  brand: {
    iconBg: "bg-[var(--brand-primary-muted)]",
    iconColor: "text-[var(--brand-primary)]",
    accentBarColor: "bg-[var(--brand-primary)]",
    valueColor: "text-[var(--fg-primary)]",
    borderGlow: "hover:border-[var(--brand-primary)]/30",
  },
  success: {
    iconBg: "bg-[var(--status-success-subtle)]",
    iconColor: "text-[var(--status-success)]",
    accentBarColor: "bg-[var(--status-success)]",
    valueColor: "text-[var(--fg-primary)]",
    borderGlow: "hover:border-[var(--status-success)]/30",
  },
  warning: {
    iconBg: "bg-[var(--status-warning-subtle)]",
    iconColor: "text-[var(--status-warning)]",
    accentBarColor: "bg-[var(--status-warning)]",
    valueColor: "text-[var(--fg-primary)]",
    borderGlow: "hover:border-[var(--status-warning)]/30",
  },
  danger: {
    iconBg: "bg-[var(--status-danger-subtle)]",
    iconColor: "text-[var(--status-danger)]",
    accentBarColor: "bg-[var(--status-danger)]",
    valueColor: "text-[var(--fg-primary)]",
    borderGlow: "hover:border-[var(--status-danger)]/30",
  },
  review: {
    iconBg: "bg-[var(--status-review-subtle)]",
    iconColor: "text-[var(--status-review)]",
    accentBarColor: "bg-[var(--status-review)]",
    valueColor: "text-[var(--fg-primary)]",
    borderGlow: "hover:border-[var(--status-review)]/30",
  },
  info: {
    iconBg: "bg-[var(--status-info-subtle)]",
    iconColor: "text-[var(--status-info)]",
    accentBarColor: "bg-[var(--status-info)]",
    valueColor: "text-[var(--fg-primary)]",
    borderGlow: "hover:border-[var(--status-info)]/30",
  },
};

export function MetricCard({
  title,
  value,
  formatType = "raw",
  icon: Icon,
  description,
  variant = "default",
  trend,
  sparklineData,
  secondaryValue,
  secondaryLabel,
  accentBar = true,
  size = "md",
  isLoading = false,
  suffix,
  prefix,
  currency = "INR",
  index = 0,
  className,
}: MetricCardProps) {
  const config = VARIANT_CONFIG[variant];

  if (isLoading) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-xs)]">
        <div className="skeleton-shimmer h-3.5 w-24 rounded mb-4" />
        <div className="skeleton-shimmer h-8 w-36 rounded mb-2" />
        <div className="skeleton-shimmer h-3 w-20 rounded" />
      </div>
    );
  }

  const valueSizeClass =
    size === "lg"
      ? "text-3xl sm:text-4xl font-extrabold"
      : size === "sm"
      ? "text-xl font-bold"
      : "text-2xl sm:text-3xl font-bold";

  return (
    <motion.div
      custom={index}
      initial="hidden"
      animate="visible"
      variants={cardVariants}
      className={cn(
        "group relative rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)]",
        "p-5 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)]",
        "transition-all duration-[var(--duration-base)] flex flex-col justify-between overflow-hidden",
        config.borderGlow,
        className
      )}
    >
      {/* Top Accent Strip */}
      {accentBar && (
        <div
          className={cn(
            "absolute top-0 inset-x-0 h-[3px] opacity-80 group-hover:opacity-100 transition-opacity",
            config.accentBarColor
          )}
        />
      )}

      {/* Header Row */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--fg-tertiary)] truncate">
            {title}
          </span>
          {Icon && (
            <div
              className={cn(
                "w-7 h-7 rounded-[var(--radius-sm)] flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105",
                config.iconBg
              )}
            >
              <Icon className={cn("w-3.5 h-3.5", config.iconColor)} />
            </div>
          )}
        </div>

        {/* Primary Numerical Value */}
        <div className="flex items-baseline gap-1.5 flex-wrap">
          {prefix && (
            <span className="text-sm font-medium text-[var(--fg-tertiary)]">
              {prefix}
            </span>
          )}
          <span
            className={cn(
              "font-mono tracking-tight leading-none tabular-nums",
              valueSizeClass,
              config.valueColor
            )}
          >
            {typeof value === "number" && formatType !== "raw" ? (
              <AnimatedNumber value={value} formatType={formatType} currency={currency} />
            ) : typeof value === "number" ? (
              <AnimatedNumber value={value} currency={currency} />
            ) : (
              value
            )}
          </span>
          {suffix && (
            <span className="text-xs font-mono font-medium text-[var(--fg-tertiary)]">
              {suffix}
            </span>
          )}
        </div>
      </div>

      {/* Footer Details: Trend / Description / Secondary Metric */}
      <div className="mt-3.5 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs gap-2">
        {trend ? (
          <div className="flex items-center gap-1.5 font-mono">
            <span
              className={cn(
                "inline-flex items-center gap-0.5 text-[11px] font-bold px-1.5 py-0.5 rounded-[var(--radius-xs)]",
                trend.isPositive
                  ? "bg-[var(--status-success-subtle)] text-[var(--status-success-text)]"
                  : "bg-[var(--status-danger-subtle)] text-[var(--status-danger-text)]"
              )}
            >
              {trend.isPositive ? (
                <TrendingUp className="w-3 h-3 text-[var(--status-success)]" />
              ) : (
                <TrendingDown className="w-3 h-3 text-[var(--status-danger)]" />
              )}
              <span>
                {trend.isPositive ? "+" : "-"}
                {Math.abs(trend.value)}%
              </span>
            </span>
            {trend.label && (
              <span className="text-[11px] text-[var(--fg-tertiary)] truncate">
                {trend.label}
              </span>
            )}
          </div>
        ) : description ? (
          <p className="text-[11px] text-[var(--fg-tertiary)] truncate leading-relaxed">
            {description}
          </p>
        ) : null}

        {secondaryValue && (
          <div className="flex items-center gap-1 font-mono text-[11px] text-right ml-auto">
            {secondaryLabel && (
              <span className="text-[var(--fg-tertiary)]">{secondaryLabel}:</span>
            )}
            <span className="font-semibold text-[var(--fg-secondary)]">{secondaryValue}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
