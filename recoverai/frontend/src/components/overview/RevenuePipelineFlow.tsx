/* NOTICE: This component is not currently imported by any page and contains example/demo data for architectural illustration. Update before importing. */
"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard, Search, Activity, BrainCircuit,
  ShieldCheck, Play, CheckCircle2, ArrowRight,
  Sparkles, Check, Info, Shield, Layers
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────────
   RevenuePipelineFlow — PayRecover Design System
   Signature Fintech Visualization showing the 7-stage autonomous recovery flow:
   Failed Payments → Detection → AI Analysis → Recovery Opportunity → Policy Gate → Execution → Recovered Revenue
   ──────────────────────────────────────────────────────────────────────────── */

export interface PipelineStage {
  id: string;
  step: number;
  label: string;
  sublabel: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  telemetry: string;
  status: "active" | "operational" | "monitoring";
  accentColor: string;
  metrics: { label: string; value: string };
}

const STAGES: PipelineStage[] = [
  {
    id: "failed_payments",
    step: 1,
    label: "Failed Payments",
    sublabel: "Ingestion Stream",
    icon: CreditCard,
    description: "Real-time webhook capture of PayRecover failed transactions across UPI, Cards, and Netbanking.",
    telemetry: "0.14ms ingestion latency",
    status: "operational",
    accentColor: "var(--status-danger)",
    metrics: { label: "Ingested Today", value: "₹28.4L" },
  },
  {
    id: "detection",
    step: 2,
    label: "Detection",
    sublabel: "Opportunity Filter",
    icon: Search,
    description: "Evaluates failed payment eligibility, customer recovery history, and initial retry eligibility windows.",
    telemetry: "100% evaluated",
    status: "operational",
    accentColor: "var(--status-info)",
    metrics: { label: "Eligible Rate", value: "94.2%" },
  },
  {
    id: "ai_analysis",
    step: 3,
    label: "AI Analysis",
    sublabel: "Diagnosis Agent",
    icon: Activity,
    description: "Autonomous agent attributes failure root causes into bank downtime, token expiry, balance, or network drops.",
    telemetry: "LLM + Rule Hybrid",
    status: "active",
    accentColor: "var(--brand-primary)",
    metrics: { label: "Confidence", value: "96.8%" },
  },
  {
    id: "recovery_opportunity",
    step: 4,
    label: "Recovery Opportunity",
    sublabel: "ML Probability Model",
    icon: BrainCircuit,
    description: "Gradient boosting model predicts recovery probability and scores the highest value action path.",
    telemetry: "Calibrated on 1M+ tx",
    status: "operational",
    accentColor: "var(--brand-primary)",
    metrics: { label: "Avg Score", value: "88/100" },
  },
  {
    id: "policy_gate",
    step: 5,
    label: "Policy Gate",
    sublabel: "Deterministic Safety",
    icon: ShieldCheck,
    description: "Hard boundary checks for rate limits, customer fatigue rules, risk thresholds, and compliance mandates.",
    telemetry: "Zero false-positive retries",
    status: "operational",
    accentColor: "var(--status-warning)",
    metrics: { label: "Approval Rate", value: "98.1%" },
  },
  {
    id: "execution",
    step: 6,
    label: "Execution",
    sublabel: "Action Adapter",
    icon: Play,
    description: "Dispatches optimal interventions via payment gateway APIs: smart timing retries, intent switches, or user nudges.",
    telemetry: "Idempotent execution",
    status: "operational",
    accentColor: "var(--status-info)",
    metrics: { label: "Attempts", value: "1,240" },
  },
  {
    id: "recovered_revenue",
    step: 7,
    label: "Recovered Revenue",
    sublabel: "Settlement & Ledger",
    icon: CheckCircle2,
    description: "Verified payment capture, double-recovery prevention, customer ledger update, and ROI attribution.",
    telemetry: "Direct merchant settlement",
    status: "operational",
    accentColor: "var(--status-success)",
    metrics: { label: "Recovered", value: "₹21.6L" },
  },
];

export function RevenuePipelineFlow({ className }: { className?: string }) {
  const [selectedStage, setSelectedStage] = useState<PipelineStage>(STAGES[2]); // Default to AI Analysis

  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden shadow-[var(--shadow-sm)]",
        className
      )}
    >
      {/* Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 pb-4 border-b border-[var(--border-subtle)] bg-[var(--bg-surface-alt)] gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[var(--radius-md)] bg-[var(--brand-primary-muted)] flex items-center justify-center">
            <Layers className="w-4 h-4 text-[var(--brand-primary)]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-[var(--fg-primary)] tracking-tight">
                Autonomous Revenue Recovery Pipeline
              </h3>
              <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[var(--radius-xs)] bg-[var(--status-success-subtle)] border border-[var(--status-success-border)] text-[9px] font-mono font-semibold text-[var(--status-success-text)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-success)] animate-pulse" />
                LIVE STREAM
              </span>
            </div>
            <p className="text-xs text-[var(--fg-tertiary)]">
              End-to-end automated orchestration from failed payment to verified settlement
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-[var(--fg-secondary)]">
          <span className="text-[11px] text-[var(--fg-tertiary)]">Engine Throughput:</span>
          <span className="font-semibold text-[var(--fg-primary)] bg-[var(--bg-raised)] px-2 py-0.5 rounded-[var(--radius-xs)]">
            ~48 tx/sec
          </span>
        </div>
      </div>

      {/* Pipeline Stage Bar */}
      <div className="p-5 overflow-x-auto">
        <div className="min-w-[780px] grid grid-cols-7 gap-2 relative">
          {STAGES.map((stage, idx) => {
            const isSelected = selectedStage.id === stage.id;
            const Icon = stage.icon;
            const isLast = idx === STAGES.length - 1;

            return (
              <div key={stage.id} className="relative flex flex-col items-center">
                {/* Node Box */}
                <button
                  onClick={() => setSelectedStage(stage)}
                  className={cn(
                    "w-full text-left p-3 rounded-[var(--radius-md)] border transition-all duration-[var(--duration-fast)] relative group",
                    isSelected
                      ? "bg-[var(--brand-primary-muted)] border-[var(--brand-primary)] shadow-[var(--shadow-md)]"
                      : "bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--border-default)] hover:bg-[var(--bg-surface-alt)]"
                  )}
                >
                  {/* Step number badge & status */}
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold",
                        isSelected
                          ? "bg-[var(--brand-primary)] text-white"
                          : "bg-[var(--bg-raised)] text-[var(--fg-tertiary)] group-hover:text-[var(--fg-primary)]"
                      )}
                    >
                      {stage.step}
                    </span>

                    <Icon
                      className={cn(
                        "w-3.5 h-3.5",
                        isSelected ? "text-[var(--brand-primary)]" : "text-[var(--fg-tertiary)]"
                      )}
                    />
                  </div>

                  {/* Labels */}
                  <h4 className={cn(
                    "text-xs font-semibold truncate leading-tight",
                    isSelected ? "text-[var(--brand-primary-hover)]" : "text-[var(--fg-primary)]"
                  )}>
                    {stage.label}
                  </h4>
                  <p className="text-[10px] text-[var(--fg-tertiary)] truncate mt-0.5">
                    {stage.sublabel}
                  </p>

                  {/* Mini metric */}
                  <div className="mt-2 pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between">
                    <span className="text-[9px] text-[var(--fg-tertiary)]">{stage.metrics.label}</span>
                    <span className="text-[10px] font-mono font-bold text-[var(--fg-primary)]">
                      {stage.metrics.value}
                    </span>
                  </div>

                  {/* Animated pulse dot for selected */}
                  {isSelected && (
                    <motion.div
                      layoutId="pipeline-active-indicator"
                      className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[var(--brand-primary)] ring-2 ring-white shadow-[var(--glow-brand)]"
                    />
                  )}
                </button>

                {/* Arrow connector between stages */}
                {!isLast && (
                  <div className="hidden lg:block absolute -right-2 top-8 z-10 pointer-events-none text-[var(--border-strong)]">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Selected Stage Detail Drawer / Inspection Banner */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedStage.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="mt-4 p-4 rounded-[var(--radius-md)] bg-[var(--bg-surface-alt)] border border-[var(--border-subtle)] flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-center flex-shrink-0 mt-0.5">
                <selectedStage.icon className="w-4 h-4 text-[var(--brand-primary)]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[var(--fg-primary)]">
                    Stage {selectedStage.step}: {selectedStage.label}
                  </span>
                  <span className="text-[10px] font-mono text-[var(--fg-tertiary)]">
                    ({selectedStage.telemetry})
                  </span>
                </div>
                <p className="text-xs text-[var(--fg-secondary)] mt-0.5 max-w-2xl leading-relaxed">
                  {selectedStage.description}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <span className="text-[10px] text-[var(--fg-tertiary)] block uppercase font-mono">Stage Metric</span>
                <span className="text-sm font-bold font-mono text-[var(--fg-primary)]">
                  {selectedStage.metrics.value}
                </span>
              </div>
              <div className="h-8 w-px bg-[var(--border-subtle)]" />
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-[var(--radius-sm)] bg-[var(--status-success-subtle)] border border-[var(--status-success-border)] text-[10px] font-semibold text-[var(--status-success-text)] font-mono">
                <Check className="w-3 h-3" />
                AUTOMATED
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
