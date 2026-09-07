"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Activity,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  TrendingDown,
} from "lucide-react";
import { formatCurrency, formatPercent, cn } from "@/lib/utils";
import { RevenueLeakMap } from "@/types/api";

/* ─────────────────────────────────────────────────────────────────────────────
   FailureCategoryDistribution — RecoverAI Financial Analytics
   Restrained fintech visualization breaking down failure root causes
   and their respective autonomous recovery yields.
   ──────────────────────────────────────────────────────────────────────────── */

interface FailureCategoryDistributionProps {
  leakMap?: RevenueLeakMap;
  currency?: string;
  className?: string;
}

export function FailureCategoryDistribution({
  leakMap,
  currency = "INR",
  className,
}: FailureCategoryDistributionProps) {
  const tempFailed = leakMap?.temporary_failure || 0;
  const expiredCard = leakMap?.expired_card || 0;
  const otherFailed = leakMap?.other_failure || 0;
  const totalFailed = tempFailed + expiredCard + otherFailed;

  if (totalFailed === 0) {
    return (
      <div
        className={cn(
          "rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-[var(--shadow-sm)] flex flex-col items-center justify-center text-center space-y-3 min-h-[300px]",
          className
        )}
      >
        <div className="w-10 h-10 rounded-full bg-[var(--bg-raised)] flex items-center justify-center text-[var(--fg-tertiary)]">
          <Activity className="w-5 h-5" />
        </div>
        <h3 className="text-sm font-bold text-[var(--fg-primary)]">
          No Failure Breakdown Data
        </h3>
        <p className="text-xs text-[var(--fg-secondary)] max-w-xs leading-relaxed">
          No transaction failure categories recorded yet for this workspace. Categories will populate dynamically as errors are analyzed.
        </p>
      </div>
    );
  }

  const categories = [
    {
      name: "Bank Gateway Latency Spike",
      description: "Transient timeout during UPI & Netbanking gateway routing",
      amount: tempFailed,
      percentage: Math.round((tempFailed / totalFailed) * 100),
      isRecoverable: true,
      color: "var(--brand-primary)",
      barColor: "bg-[var(--brand-primary)]",
    },
    {
      name: "Card Token & Expiry Drops",
      description: "Stored card token invalidation or expiry at gateway checkout",
      amount: expiredCard,
      percentage: Math.round((expiredCard / totalFailed) * 100),
      isRecoverable: true,
      color: "var(--status-warning)",
      barColor: "bg-[var(--status-warning)]",
    },
    {
      name: "Customer Balance & Limits",
      description: "Insufficient balance drops or hard transaction limit declines",
      amount: otherFailed,
      percentage: Math.round((otherFailed / totalFailed) * 100),
      isRecoverable: false,
      color: "var(--status-danger)",
      barColor: "bg-[var(--status-danger)]",
    },
  ];

  return (
    <div
      className={cn(
        "rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-[var(--shadow-sm)] space-y-5",
        className
      )}
    >
      <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
        <div>
          <span className="text-[10px] font-mono font-bold tracking-[0.1em] uppercase text-[var(--brand-primary)]">
            ROOT-CAUSE BREAKDOWN
          </span>
          <h3 className="text-base font-bold text-[var(--fg-primary)] tracking-tight mt-0.5">
            Failure Category Taxonomy & Yield
          </h3>
        </div>
        <span className="text-[11px] font-mono text-[var(--fg-tertiary)]">
          Total: <strong>{formatCurrency(totalFailed, currency)}</strong>
        </span>
      </div>

      {/* Category List */}
      <div className="space-y-4">
        {categories.map((cat) => (
          <div
            key={cat.name}
            className="p-4 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface-alt)] space-y-2.5"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div>
                <span className="text-xs font-bold text-[var(--fg-primary)] block">
                  {cat.name}
                </span>
                <span className="text-[11px] text-[var(--fg-tertiary)] block mt-0.5">
                  {cat.description}
                </span>
              </div>

              <div className="text-left sm:text-right shrink-0">
                <span className="text-xs font-bold font-mono text-[var(--fg-primary)] block">
                  {formatCurrency(cat.amount, currency)}
                </span>
                <span className="text-[10px] font-mono text-[var(--fg-tertiary)] block">
                  {cat.percentage}% of dropped volume
                </span>
              </div>
            </div>

            {/* Custom Proportion Progress Bar */}
            <div className="w-full h-2 rounded-full bg-[var(--bg-raised)] overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all duration-500", cat.barColor)}
                style={{ width: `${cat.percentage}%` }}
              />
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}
