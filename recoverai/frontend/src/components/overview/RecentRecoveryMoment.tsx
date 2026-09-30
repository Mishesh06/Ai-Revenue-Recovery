/* NOTICE: This component is not currently imported by any page and contains example/demo data for architectural illustration. Update before importing. */
"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2, ArrowRight, ShieldCheck, Zap,
  Activity, Clock, CreditCard, Sparkles, Building2
} from "lucide-react";
import { formatCurrency, formatDateTime, formatRelativeTime, truncateId, cn } from "@/lib/utils";
import { AuditEventOut, RecoveryCaseOut } from "@/types/api";

/* ─────────────────────────────────────────────────────────────────────────────
   RecentRecoveryMoment — PayRecover Overview Section 5
   Visualizes the latest meaningful autonomous recovery event with full
   attribution, correlation chain, and verified settlement telemetry.
   ──────────────────────────────────────────────────────────────────────────── */

interface RecentRecoveryMomentProps {
  events: AuditEventOut[];
  cases: RecoveryCaseOut[];
  currency?: string;
  className?: string;
}

export function RecentRecoveryMoment({
  events,
  cases,
  currency = "INR",
  className,
}: RecentRecoveryMomentProps) {
  // Find the latest recovery success event or fallback to the latest case
  const latestSuccessEvent = events.find(
    (e) => e.event_type === "RecoverySucceeded" || e.event_type === "PaymentRecovered" || e.event_type === "ActionSucceeded"
  ) || events[0];

  const latestCase = cases[0];
  const recoveredAmount = latestSuccessEvent?.event_data?.amount || 14999;
  const correlationId = latestSuccessEvent?.correlation_id || latestCase?.correlation_id || "corr_9a82f1";
  const timestamp = latestSuccessEvent?.timestamp || latestCase?.updated_at || new Date().toISOString();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "rounded-[var(--radius-xl)] border border-[var(--status-success-border)] bg-[var(--status-success-subtle)]/40 p-5 sm:p-7 shadow-[var(--shadow-sm)]",
        "relative overflow-hidden",
        className
      )}
    >
      {/* Subtle Top Glow Accent */}
      <div className="absolute top-0 inset-x-0 h-1 bg-[var(--status-success)] opacity-75" />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Left: Summary Banner */}
        <div className="space-y-2 max-w-xl">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[var(--radius-xs)] bg-[var(--status-success)] text-white text-[10px] font-mono font-bold">
              <CheckCircle2 className="w-3 h-3" />
              LATEST RECOVERY MOMENT
            </span>
            <span className="text-xs font-mono text-[var(--fg-tertiary)] flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatRelativeTime(timestamp)}
            </span>
          </div>

          <h3 className="text-xl sm:text-2xl font-bold text-[var(--fg-primary)] tracking-tight">
            Autonomous Recovery Succeeded
          </h3>

          <p className="text-xs text-[var(--fg-secondary)] leading-relaxed">
            PayRecover detected transient gateway latency on UPI Intent, calibrated a 91.4% recovery probability, passed deterministic safety policy, and successfully recovered the capital.
          </p>
        </div>

        {/* Right: Recovered Amount Highlight Box */}
        <div className="rounded-[var(--radius-lg)] border border-[var(--status-success-border)] bg-[var(--bg-surface)] p-4 sm:p-5 shadow-[var(--shadow-xs)] flex flex-col justify-between min-w-[240px]">
          <div>
            <span className="text-[10px] uppercase font-bold text-[var(--status-success-text)] block font-mono">
              Capital Settled
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold font-mono text-[var(--status-success-text)] tabular-nums tracking-tight">
              {formatCurrency(recoveredAmount, currency)}
            </span>
          </div>

          <div className="mt-3 pt-2.5 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] font-mono">
            <span className="text-[var(--fg-tertiary)]">Trace ID:</span>
            <span className="font-semibold text-[var(--fg-secondary)]">{truncateId(correlationId, 10)}</span>
          </div>
        </div>
      </div>

      {/* Five-Stage Micro Decision Chain */}
      <div className="mt-6 pt-5 border-t border-[var(--status-success-border)]/50">
        <span className="text-[10px] font-mono uppercase font-bold text-[var(--status-success-text)] tracking-wider block mb-3">
          Executed Decision Chain
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          <div className="p-2.5 rounded-[var(--radius-md)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex flex-col justify-between text-xs">
            <span className="text-[10px] text-[var(--fg-tertiary)] font-mono">1. Transaction</span>
            <span className="font-semibold text-[var(--fg-primary)] mt-1 truncate">Payment Failed</span>
            <span className="text-[10px] text-[var(--status-danger-text)] font-mono mt-0.5">GATEWAY_TIMEOUT</span>
          </div>

          <div className="p-2.5 rounded-[var(--radius-md)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex flex-col justify-between text-xs">
            <span className="text-[10px] text-[var(--fg-tertiary)] font-mono">2. Prediction</span>
            <span className="font-semibold text-[var(--fg-primary)] mt-1">ML Score 89/100</span>
            <span className="text-[10px] text-[var(--brand-primary)] font-mono mt-0.5">High Probability</span>
          </div>

          <div className="p-2.5 rounded-[var(--radius-md)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex flex-col justify-between text-xs">
            <span className="text-[10px] text-[var(--fg-tertiary)] font-mono">3. Diagnosis</span>
            <span className="font-semibold text-[var(--fg-primary)] mt-1 truncate">Transient Latency</span>
            <span className="text-[10px] text-[var(--fg-tertiary)] font-mono mt-0.5">HDFC Bank UPI</span>
          </div>

          <div className="p-2.5 rounded-[var(--radius-md)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex flex-col justify-between text-xs">
            <span className="text-[10px] text-[var(--fg-tertiary)] font-mono">4. Policy Gate</span>
            <span className="font-semibold text-[var(--status-success-text)] mt-1">APPROVED</span>
            <span className="text-[10px] text-[var(--fg-tertiary)] font-mono mt-0.5">Fatigue 1/3 Limit</span>
          </div>

          <div className="p-2.5 rounded-[var(--radius-md)] bg-[var(--bg-surface)] border border-[var(--status-success-border)] flex flex-col justify-between text-xs shadow-[var(--shadow-xs)]">
            <span className="text-[10px] text-[var(--status-success-text)] font-mono font-bold">5. Outcome</span>
            <span className="font-bold text-[var(--status-success-text)] mt-1">RECOVERED</span>
            <span className="text-[10px] text-[var(--status-success-text)] font-mono mt-0.5">₹14,999 Settled</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
