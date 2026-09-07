"use client";

import React from "react";
import { LucideIcon, BarChart3, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────────
   DataVisualization — RecoverAI Design System
   Fintech chart and telemetry visualization container with timeframe controls,
   metric highlights, and responsive chart viewport.
   ──────────────────────────────────────────────────────────────────────────── */

export interface TimeframeOption {
  id: string;
  label: string;
}

export interface MetricHighlight {
  label: string;
  value: string;
  change?: string;
  isPositive?: boolean;
}

export interface DataVisualizationProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;
  timeframes?: TimeframeOption[];
  selectedTimeframe?: string;
  onTimeframeChange?: (id: string) => void;
  metrics?: MetricHighlight[];
  legend?: React.ReactNode;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
  isLoading?: boolean;
  emptyState?: React.ReactNode;
  height?: number | string;
  className?: string;
}

export function DataVisualization({
  title,
  subtitle,
  icon: Icon = BarChart3,
  timeframes,
  selectedTimeframe,
  onTimeframeChange,
  metrics,
  legend,
  headerAction,
  children,
  isLoading = false,
  emptyState,
  height = 280,
  className,
}: DataVisualizationProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-sm)]",
        "flex flex-col justify-between overflow-hidden",
        className
      )}
    >
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--border-subtle)] mb-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-[var(--radius-sm)] bg-[var(--brand-primary-muted)] flex items-center justify-center flex-shrink-0 text-[var(--brand-primary)]">
            <Icon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-[var(--fg-primary)] tracking-tight truncate">
              {title}
            </h3>
            {subtitle && (
              <p className="text-[11px] text-[var(--fg-tertiary)] truncate mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Timeframe selector pill */}
          {timeframes && timeframes.length > 0 && (
            <div className="flex items-center p-0.5 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface-alt)] shadow-[var(--shadow-xs)] text-xs">
              {timeframes.map((tf) => (
                <button
                  key={tf.id}
                  onClick={() => onTimeframeChange?.(tf.id)}
                  className={cn(
                    "px-2.5 py-1 rounded-[var(--radius-xs)] text-[11px] font-semibold transition-all duration-[var(--duration-fast)]",
                    selectedTimeframe === tf.id
                      ? "bg-[var(--bg-surface)] text-[var(--brand-primary)] shadow-[var(--shadow-xs)] font-bold"
                      : "text-[var(--fg-tertiary)] hover:text-[var(--fg-primary)]"
                  )}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          )}

          {headerAction}
        </div>
      </div>

      {/* Metric Highlights Strip (Optional) */}
      {metrics && metrics.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 p-3 rounded-[var(--radius-md)] bg-[var(--bg-surface-alt)] border border-[var(--border-subtle)]">
          {metrics.map((m, idx) => (
            <div key={idx} className="space-y-0.5 min-w-0">
              <span className="text-[10px] uppercase font-bold text-[var(--fg-tertiary)] truncate block">
                {m.label}
              </span>
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="text-base font-bold font-mono text-[var(--fg-primary)] tabular-nums">
                  {m.value}
                </span>
                {m.change && (
                  <span
                    className={cn(
                      "text-[10px] font-mono font-semibold",
                      m.isPositive
                        ? "text-[var(--status-success-text)]"
                        : "text-[var(--status-danger-text)]"
                    )}
                  >
                    {m.change}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Chart Viewport */}
      <div
        className="w-full relative"
        style={{ height: typeof height === "number" ? `${height}px` : height }}
      >
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-surface)]/80 backdrop-blur-xs">
            <div className="skeleton-shimmer w-full h-full rounded-[var(--radius-md)]" />
          </div>
        ) : emptyState ? (
          emptyState
        ) : (
          children
        )}
      </div>

      {/* Footer Legend */}
      {legend && (
        <div className="pt-3 mt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs text-[var(--fg-tertiary)]">
          {legend}
        </div>
      )}
    </div>
  );
}
