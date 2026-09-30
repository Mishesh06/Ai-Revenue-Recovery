"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  CreditCard, Search, ShieldCheck, ShieldAlert,
  CheckCircle2, TrendingUp, Percent, AlertTriangle,
  Lock, Sparkles, UserCheck, AlertOctagon
} from "lucide-react";
import { formatCurrency, formatPercent, cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────────
   SimulationMetricsSummary — PayRecover Verified Metric Completion Strip
   Reveals the 9 verified simulation metrics directly from the backend payload.
   ──────────────────────────────────────────────────────────────────────────── */

export interface SimulationMetricsPayload {
  transactions_analyzed?: number;
  opportunities_detected?: number;
  actions_approved?: number;
  policy_blocks?: number;
  unknown_outcomes?: number;
  manual_reviews?: number;
  successful_recoveries?: number;
  revenue_recovered?: number;
  recovery_rate?: number;
}

interface SimulationMetricsSummaryProps {
  metrics: SimulationMetricsPayload;
  scenario: string;
  className?: string;
}

export function SimulationMetricsSummary({
  metrics,
  scenario,
  className,
}: SimulationMetricsSummaryProps) {
  const txAnalyzed = metrics.transactions_analyzed ?? 1;
  const oppDetected = metrics.opportunities_detected ?? txAnalyzed;
  const approved = metrics.actions_approved ?? 0;
  const blocked = metrics.policy_blocks ?? 0;
  const unknownOutcomes = metrics.unknown_outcomes ?? 0;
  const manualReviews = metrics.manual_reviews ?? 0;
  const successful = metrics.successful_recoveries ?? 0;
  const revRecovered = metrics.revenue_recovered ?? 0;
  const rate = metrics.recovery_rate !== undefined ? metrics.recovery_rate : (oppDetected > 0 ? successful / oppDetected : 0);

  const items = [
    {
      label: "Transactions Analyzed",
      value: txAnalyzed,
      icon: CreditCard,
      color: "text-[var(--fg-primary)]",
      suffix: "tx",
    },
    {
      label: "Opportunities",
      value: oppDetected,
      icon: Search,
      color: "text-[var(--brand-primary)]",
      suffix: "cases",
    },
    {
      label: "Actions Approved",
      value: approved,
      icon: ShieldCheck,
      color: "text-[var(--status-success-text)]",
      suffix: "approved",
    },
    {
      label: "Successful Recoveries",
      value: successful,
      icon: CheckCircle2,
      color: "text-[var(--status-success-text)]",
      suffix: "settled",
    },
    {
      label: "Revenue Recovered",
      value: formatCurrency(revRecovered),
      icon: TrendingUp,
      color: "text-[var(--status-success-text)] font-mono",
      isHighlighted: true,
    },
    {
      label: "Recovery Rate",
      value: formatPercent(rate),
      icon: Percent,
      color: "text-[var(--brand-primary)] font-mono font-bold",
    },
    {
      label: "Policy Blocks",
      value: blocked,
      icon: ShieldAlert,
      color: "text-[var(--status-warning-text)] font-mono",
      suffix: "gated",
    },
    {
      label: "Manual Reviews",
      value: manualReviews,
      icon: UserCheck,
      color: "text-[var(--status-review-text)] font-mono",
      suffix: "escalated",
    },
    {
      label: "Unknown Outcomes",
      value: unknownOutcomes,
      icon: AlertTriangle,
      color: unknownOutcomes > 0 ? "text-[var(--status-danger-text)] font-mono font-bold" : "text-[var(--fg-tertiary)] font-mono",
      suffix: "safeguarded",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-[var(--shadow-sm)] space-y-4",
        className
      )}
    >
      <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[var(--brand-primary)]" />
          <h3 className="text-sm sm:text-base font-bold text-[var(--fg-primary)] tracking-tight">
            Simulation Metrics Breakdown (Verified Payload)
          </h3>
        </div>
        <span className="text-[10px] font-mono text-[var(--status-success-text)] bg-[var(--status-success-subtle)] px-2.5 py-0.5 rounded-[var(--radius-xs)] font-bold border border-[var(--status-success-border)]">
          FASTAPI SIMULATION AUDIT
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-2.5">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.label}
              className={cn(
                "p-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface-alt)] flex flex-col justify-between",
                item.isHighlighted && "border-[var(--status-success-border)] bg-[var(--status-success-subtle)]/40 shadow-[var(--shadow-xs)]"
              )}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-medium text-[var(--fg-tertiary)] uppercase tracking-wider line-clamp-1">
                  {item.label}
                </span>
                <Icon className="w-3.5 h-3.5 text-[var(--fg-tertiary)] flex-shrink-0" />
              </div>

              <div className="flex items-baseline gap-1">
                <span className={cn("text-sm sm:text-base font-bold font-mono", item.color)}>
                  {item.value}
                </span>
                {item.suffix && (
                  <span className="text-[9px] text-[var(--fg-tertiary)]">
                    {item.suffix}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
