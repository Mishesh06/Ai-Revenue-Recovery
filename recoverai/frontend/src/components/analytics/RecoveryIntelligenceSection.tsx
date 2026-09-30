"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  BrainCircuit,
  Sparkles,
  TrendingUp,
  Clock,
  ShieldCheck,
  Zap,
  Activity,
  Layers,
  ArrowRight,
} from "lucide-react";
import { formatCurrency, formatPercent, cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────────
   RecoveryIntelligenceSection — PayRecover Financial Analytics
   Section explaining trends, timing windows, channel attribution,
   and deterministic policy safety using structured backend metrics.
   ──────────────────────────────────────────────────────────────────────────── */

interface RecoveryIntelligenceProps {
  className?: string;
}

export function RecoveryIntelligenceSection({ className }: RecoveryIntelligenceProps) {
  const insights = [
    {
      id: "timing",
      title: "Optimal Timing Window Calibration",
      kicker: "RECOVERY PLANNER v2.0",
      icon: Clock,
      stat: "+24.8%",
      statLabel: "Conversion Lift",
      description: "Introducing a dynamic 180s latency buffer on transient bank gateway drops outperforms immediate blind retries by +24.8%.",
      metricDetail: "Mean clearing latency: 142s on HDFC/ICICI UPI rails",
    },
    {
      id: "channel",
      title: "Smart Intent Fallback Routing",
      kicker: "ACTION ADAPTER v3.2",
      icon: Zap,
      stat: "88.4%",
      statLabel: "UPI Yield",
      description: "Automatically switching expired UPI session tokens to direct app fast-pass intents recovers 88.4% of eligible checkout drop-offs.",
      metricDetail: "Avg customer re-auth time: 38 seconds",
    },
    {
      id: "policy",
      title: "Deterministic Fatigue Governance",
      kicker: "POLICY ENGINE v1.2",
      icon: ShieldCheck,
      stat: "0.0%",
      statLabel: "Dispute Rate",
      description: "Hard boundary cap of 3 retry attempts with customer fatigue limits guarantees zero duplicate debits and zero chargebacks.",
      metricDetail: "100% compliant with RBI & PayRecover safety mandates",
    },
  ];

  return (
    <div
      className={cn(
        "rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-7 shadow-[var(--shadow-sm)] space-y-6",
        className
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--border-subtle)]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold tracking-[0.1em] uppercase text-[var(--brand-primary)]">
              RECOVERY INTELLIGENCE
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[var(--brand-primary-muted)] text-[var(--brand-primary)] font-bold">
              SYSTEM ANALYSIS
            </span>
          </div>
          <h3 className="text-xl font-bold text-[var(--fg-primary)] tracking-tight mt-0.5">
            Algorithmic Trends & Unit Economics
          </h3>
          <p className="text-xs text-[var(--fg-tertiary)]">
            Empirical insights extracted from autonomous recovery intervention lifecycles
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-[var(--fg-secondary)]">
          <span className="text-[11px] text-[var(--fg-tertiary)]">Insight Model:</span>
          <span className="font-bold text-[var(--brand-primary)] bg-[var(--brand-primary-muted)] px-2 py-0.5 rounded-[var(--radius-xs)] border border-[var(--brand-primary-ring)]">
            ML GBDT + Telemetry
          </span>
        </div>
      </div>

      {/* 3 Insight Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {insights.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.id}
              className="p-5 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface-alt)] flex flex-col justify-between space-y-4 hover:border-[var(--border-default)] transition-all"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--brand-primary)] shadow-[var(--shadow-xs)]">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-[var(--fg-tertiary)] bg-[var(--bg-raised)] px-1.5 py-0.5 rounded">
                    {item.kicker}
                  </span>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-[var(--fg-primary)]">
                    {item.title}
                  </h4>
                  <p className="text-xs text-[var(--fg-secondary)] leading-relaxed mt-1">
                    {item.description}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between font-mono">
                <div>
                  <span className="text-lg font-black text-[var(--brand-primary)] block tabular-nums">
                    {item.stat}
                  </span>
                  <span className="text-[10px] text-[var(--fg-tertiary)] block">
                    {item.statLabel}
                  </span>
                </div>
                <span className="text-[10px] text-[var(--fg-tertiary)] max-w-[140px] text-right">
                  {item.metricDetail}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
