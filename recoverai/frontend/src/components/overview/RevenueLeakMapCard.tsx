"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  TrendingDown, CheckCircle2, XCircle, Clock,
  CreditCard, ShieldAlert, Sparkles, ArrowDownRight, Layers
} from "lucide-react";
import { RevenueLeakMap } from "@/types/api";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────────
   RevenueLeakMapCard — PayRecover Design System
   Fintech cashflow breakdown visualizing leak categorization and recovered yields.
   ──────────────────────────────────────────────────────────────────────────── */

interface RevenueLeakMapCardProps {
  leakMap: RevenueLeakMap;
  currency?: string;
  className?: string;
}

export function RevenueLeakMapCard({
  leakMap,
  currency = "INR",
  className,
}: RevenueLeakMapCardProps) {
  const total = leakMap.total_revenue || 1;
  const successPct = (leakMap.successful / total) * 100;
  const failedPct = (leakMap.failed / total) * 100;
  const recoveredPct = (leakMap.recovered / total) * 100;
  const recoverablePct = (leakMap.recoverable / total) * 100;

  // Failure categories as proportion of failed
  const failedTotal = leakMap.failed || 1;
  const tempPct = (leakMap.temporary_failure / failedTotal) * 100;
  const expiredPct = (leakMap.expired_card / failedTotal) * 100;
  const otherPct = (leakMap.other_failure / failedTotal) * 100;

  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-sm)]",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-[var(--border-subtle)]">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-[var(--fg-primary)] tracking-tight">
              Revenue Leak Map & Cashflow Attribution
            </h3>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--bg-raised)] text-[var(--fg-secondary)]">
              TOTAL: {formatCurrency(leakMap.total_revenue, currency)}
            </span>
          </div>
          <p className="text-xs text-[var(--fg-tertiary)] mt-0.5">
            Diagnostic breakdown of payment outcomes, failure reasons, and recovery yields
          </p>
        </div>
      </div>

      {/* Multi-segment Stacked Distribution Bar */}
      <div className="space-y-2 mb-6">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-[var(--fg-tertiary)]">Gross Volume Composition</span>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="text-[var(--status-success-text)] font-semibold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[var(--status-success)]" />
              {successPct.toFixed(1)}% Settled
            </span>
            <span className="text-[var(--status-danger-text)] font-semibold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[var(--status-danger)]" />
              {failedPct.toFixed(1)}% Failed
            </span>
          </div>
        </div>

        {/* The Animated Distribution Bar */}
        <div className="w-full h-3 rounded-full bg-[var(--bg-raised)] overflow-hidden flex p-0.5 gap-0.5">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(2, successPct)}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full rounded-l-full bg-[var(--status-success)]"
            title={`Successful: ${formatCurrency(leakMap.successful, currency)} (${successPct.toFixed(1)}%)`}
          />
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(2, failedPct)}%` }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
            className="h-full rounded-r-full bg-[var(--status-danger)]"
            title={`Failed: ${formatCurrency(leakMap.failed, currency)} (${failedPct.toFixed(1)}%)`}
          />
        </div>
      </div>

      {/* Flow Grid Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left Column: Macro Flow */}
        <div className="space-y-2.5 p-4 rounded-[var(--radius-md)] bg-[var(--bg-surface-alt)] border border-[var(--border-subtle)]">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--fg-tertiary)] block mb-1">
            Transaction Flow Stages
          </span>

          {/* Row 1: Total */}
          <div className="flex items-center justify-between text-xs py-1.5 border-b border-[var(--border-subtle)]">
            <span className="text-[var(--fg-secondary)] flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-[var(--fg-tertiary)]" />
              Total Ingested Revenue
            </span>
            <span className="font-mono font-bold text-[var(--fg-primary)]">
              {formatCurrency(leakMap.total_revenue, currency)}
            </span>
          </div>

          {/* Row 2: Successful */}
          <div className="flex items-center justify-between text-xs py-1.5 border-b border-[var(--border-subtle)]">
            <span className="text-[var(--fg-secondary)] flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-[var(--status-success)]" />
              Direct Successful Payments
            </span>
            <span className="font-mono font-semibold text-[var(--status-success-text)]">
              {formatCurrency(leakMap.successful, currency)}
            </span>
          </div>

          {/* Row 3: Failed */}
          <div className="flex items-center justify-between text-xs py-1.5 border-b border-[var(--border-subtle)]">
            <span className="text-[var(--fg-secondary)] flex items-center gap-2">
              <XCircle className="w-3.5 h-3.5 text-[var(--status-danger)]" />
              Gross Failed Volume
            </span>
            <span className="font-mono font-semibold text-[var(--status-danger-text)]">
              {formatCurrency(leakMap.failed, currency)}
            </span>
          </div>

          {/* Row 4: Recoverable */}
          <div className="flex items-center justify-between text-xs py-1.5 border-b border-[var(--border-subtle)] bg-[var(--status-warning-subtle)]/40 px-2 rounded">
            <span className="text-[var(--status-warning-text)] flex items-center gap-2 font-medium">
              <ArrowDownRight className="w-3.5 h-3.5 text-[var(--status-warning)]" />
              Identified as Recoverable
            </span>
            <span className="font-mono font-bold text-[var(--status-warning-text)]">
              {formatCurrency(leakMap.recoverable, currency)}
            </span>
          </div>

          {/* Row 5: Recovered */}
          <div className="flex items-center justify-between text-xs py-1.5 bg-[var(--status-success-subtle)] px-2 rounded">
            <span className="text-[var(--status-success-text)] flex items-center gap-2 font-bold">
              <Sparkles className="w-3.5 h-3.5 text-[var(--status-success)]" />
              Net Capital Recovered
            </span>
            <span className="font-mono font-bold text-[var(--status-success-text)] text-sm">
              {formatCurrency(leakMap.recovered, currency)}
            </span>
          </div>
        </div>

        {/* Right Column: Failure Taxonomy & Root Causes */}
        <div className="space-y-3 p-4 rounded-[var(--radius-md)] bg-[var(--bg-surface-alt)] border border-[var(--border-subtle)]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--fg-tertiary)]">
              Failure Root Causes (AI Categorized)
            </span>
            <span className="text-[10px] font-mono text-[var(--status-danger-text)] font-semibold">
              {formatCurrency(leakMap.failed, currency)}
            </span>
          </div>

          {/* Category 1: Temporary */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--fg-secondary)] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[var(--status-info)]" />
                Temporary Network / Bank Drops
              </span>
              <span className="font-mono text-xs font-semibold text-[var(--fg-primary)]">
                {formatCurrency(leakMap.temporary_failure, currency)}
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-[var(--bg-raised)] overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${tempPct}%` }}
                transition={{ duration: 0.6 }}
                className="h-full rounded-full bg-[var(--status-info)]"
              />
            </div>
          </div>

          {/* Category 2: Expired */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--fg-secondary)] flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-[var(--status-warning)]" />
                Card & Mandate Expiry
              </span>
              <span className="font-mono text-xs font-semibold text-[var(--fg-primary)]">
                {formatCurrency(leakMap.expired_card, currency)}
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-[var(--bg-raised)] overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${expiredPct}%` }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="h-full rounded-full bg-[var(--status-warning)]"
              />
            </div>
          </div>

          {/* Category 3: Other */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--fg-secondary)] flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-[var(--fg-tertiary)]" />
                Auth, Balance & Other Drops
              </span>
              <span className="font-mono text-xs font-semibold text-[var(--fg-primary)]">
                {formatCurrency(leakMap.other_failure, currency)}
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-[var(--bg-raised)] overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${otherPct}%` }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="h-full rounded-full bg-[var(--fg-tertiary)]"
              />
            </div>
          </div>

          {/* Summary Box */}
          <div className="pt-2 border-t border-[var(--border-subtle)] text-[11px] text-[var(--fg-secondary)] leading-relaxed">
            <span className="font-semibold text-[var(--brand-primary)]">AI Insight:</span>{" "}
            {tempPct.toFixed(0)}% of failed transactions are transient and have an 80%+ recovery probability under automated retry windows.
          </div>
        </div>
      </div>
    </div>
  );
}
