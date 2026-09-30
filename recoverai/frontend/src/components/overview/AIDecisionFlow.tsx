/* NOTICE: This component is not currently imported by any page and contains example/demo data for architectural illustration. Update before importing. */
"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard, Search, BrainCircuit, Activity,
  Map, ShieldCheck, Play, CheckCircle2, ArrowDown,
  Sparkles, Check, ChevronRight, Layers, Lock, Cpu
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────────
   AIDecisionFlow — PayRecover Overview Section 3
   Interactive 8-stage visual storytelling sequence demonstrating autonomous
   decision architecture from payment failure ingestion to verified settlement.
   ──────────────────────────────────────────────────────────────────────────── */

interface DecisionStage {
  id: string;
  step: number;
  label: string;
  kicker: string;
  question: string;
  icon: React.ComponentType<{ className?: string }>;
  actor: string;
  latency: string;
  description: string;
  telemetryEvidence: Record<string, string | number | boolean>;
  color: string;
}

const DECISION_STAGES: DecisionStage[] = [
  {
    id: "payment_failed",
    step: 1,
    label: "Payment Failed",
    kicker: "WEBHOOK INGESTION",
    question: "What happened at checkout?",
    icon: CreditCard,
    actor: "PayRecover Gateway Webhook",
    latency: "0.14ms",
    description: "Captures raw transaction failure payloads across UPI, Cards, and Netbanking with sub-second event ingestion.",
    telemetryEvidence: {
      error_code: "GATEWAY_TIMEOUT",
      channel: "UPI_INTENT",
      amount: "₹14,999",
      bank: "HDFC_NET",
    },
    color: "var(--status-danger)",
  },
  {
    id: "opportunity_detected",
    step: 2,
    label: "Opportunity Detected",
    kicker: "ELIGIBILITY GATE",
    question: "Is this transaction recoverable?",
    icon: Search,
    actor: "FailureManager v3.2",
    latency: "1.2ms",
    description: "Applies multi-factor eligibility filters, verifies customer retry history, and initializes the recovery lifecycle window.",
    telemetryEvidence: {
      is_recoverable: true,
      retry_window: "240 seconds",
      prior_attempts: 0,
      customer_tier: "ENTERPRISE",
    },
    color: "var(--status-info)",
  },
  {
    id: "ml_prediction",
    step: 3,
    label: "ML Prediction",
    kicker: "PROBABILITY CURVE",
    question: "How likely is recovery?",
    icon: BrainCircuit,
    actor: "RecoveryPredictor v1.3 (GBDT)",
    latency: "44ms",
    description: "Calculates recovery probability curves calibrated across 1M+ payment gateways based on bank latency and card BIN history.",
    telemetryEvidence: {
      recovery_probability: "91.4%",
      confidence_interval: "[0.88, 0.94]",
      score: "89/100",
      calibration: "CONSERVATIVE",
    },
    color: "var(--brand-primary)",
  },
  {
    id: "ai_diagnosis",
    step: 4,
    label: "AI Diagnosis",
    kicker: "ROOT-CAUSE ATTRIBUTION",
    question: "Why did the payment fail?",
    icon: Activity,
    actor: "DiagnosisAgent v2.1 (LLM + Hybrid Rules)",
    latency: "182ms",
    description: "Autonomous reasoning agent attributes error codes into formal taxonomies (transient gateway timeout vs card expiry vs limit).",
    telemetryEvidence: {
      category: "Transient Bank Downtime",
      root_cause: "GATEWAY_LATENCY_SPIKE",
      is_transient: true,
      network_health: "DEGRADED",
    },
    color: "var(--brand-primary)",
  },
  {
    id: "recovery_plan",
    step: 5,
    label: "Recovery Plan",
    kicker: "STRATEGY FORMULATION",
    question: "What recovery action to take?",
    icon: Map,
    actor: "RecoveryPlanner v2.0",
    latency: "128ms",
    description: "Formulates optimal intervention strategies (smart exponential delay retry, intent switch, or WhatsApp nudge).",
    telemetryEvidence: {
      action: "Smart Exponential Retry",
      delay_window: "+180s",
      recommended_route: "UPI_INTENT_FASTPASS",
      max_budget: "2 attempts",
    },
    color: "var(--brand-primary)",
  },
  {
    id: "policy_check",
    step: 6,
    label: "Policy Check",
    kicker: "DETERMINISTIC SAFETY",
    question: "Is this action authorized?",
    icon: ShieldCheck,
    actor: "Deterministic Policy Engine v1.2",
    latency: "4ms",
    description: "Hard mathematical guardrails evaluating merchant fatigue rules, amount thresholds, and duplicate-charge locks with zero hallucination.",
    telemetryEvidence: {
      policy_decision: "APPROVED",
      customer_fatigue_check: "PASSED (1/3)",
      risk_level: "LOW",
      requires_human_review: false,
    },
    color: "var(--status-warning)",
  },
  {
    id: "recovery_action",
    step: 7,
    label: "Recovery Action",
    kicker: "IDEMPOTENT EXECUTION",
    question: "How is the action dispatched?",
    icon: Play,
    actor: "PayRecover Action Adapter",
    latency: "86ms",
    description: "Dispatches atomic, idempotent retry payment call with idempotency locking to guarantee zero duplicate customer debits.",
    telemetryEvidence: {
      idempotency_key: "idem_rec_89f2a4",
      mode: "LIVE_RECOVERY",
      attempt_index: 1,
      circuit_breaker: "ARMED",
    },
    color: "var(--status-info)",
  },
  {
    id: "revenue_recovered",
    step: 8,
    label: "Revenue Recovered",
    kicker: "VERIFIED SETTLEMENT",
    question: "Did the recovery succeed?",
    icon: CheckCircle2,
    actor: "Ledger Reconciliation Engine",
    latency: "12ms",
    description: "Verifies successful payment capture, updates merchant cashflow ledger, closes recovery case, and logs immutable audit trail.",
    telemetryEvidence: {
      settled_amount: "₹14,999",
      case_status: "RECOVERED",
      net_yield: "100%",
      audit_event_id: "evt_rec_91a0c4",
    },
    color: "var(--status-success)",
  },
];

export function AIDecisionFlow({ className }: { className?: string }) {
  const [activeStep, setActiveStep] = useState<number>(3); // Default to ML Prediction

  const selectedStage = DECISION_STAGES[activeStep];
  const Icon = selectedStage.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 sm:p-7 shadow-[var(--shadow-sm)] space-y-6",
        className
      )}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--border-subtle)]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold tracking-[0.1em] uppercase text-[var(--brand-primary)]">
              AI DECISION FLOW
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[var(--brand-primary-muted)] text-[var(--brand-primary)] font-bold">
              8 AUTONOMOUS STAGES
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-[var(--fg-primary)] tracking-tight mt-0.5">
            Orchestration & Decision Lifecycle
          </h2>
          <p className="text-xs text-[var(--fg-tertiary)]">
            How PayRecover analyzes, diagnoses, authorizes, and recovers failed payments
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-[11px] text-[var(--fg-tertiary)]">End-to-End Latency:</span>
          <span className="font-bold text-[var(--brand-primary)] bg-[var(--brand-primary-muted)] px-2 py-0.5 rounded-[var(--radius-xs)] border border-[var(--brand-primary-ring)]">
            ~450ms total
          </span>
        </div>
      </div>

      {/* 8-Stage Interactive Navigation Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {DECISION_STAGES.map((stage, idx) => {
          const isActive = activeStep === idx;
          const StageIcon = stage.icon;

          return (
            <button
              key={stage.id}
              onClick={() => setActiveStep(idx)}
              className={cn(
                "p-2.5 rounded-[var(--radius-md)] border text-left transition-all relative flex flex-col justify-between group",
                isActive
                  ? "bg-[var(--brand-primary-muted)] border-[var(--brand-primary)] shadow-[var(--glow-brand)]"
                  : "bg-[var(--bg-surface-alt)] border-[var(--border-subtle)] hover:bg-[var(--bg-surface)] hover:border-[var(--border-default)]"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold",
                    isActive
                      ? "bg-[var(--brand-primary)] text-white"
                      : "bg-[var(--bg-raised)] text-[var(--fg-tertiary)] group-hover:text-[var(--fg-primary)]"
                  )}
                >
                  {stage.step}
                </span>
                <StageIcon
                  className={cn(
                    "w-3.5 h-3.5",
                    isActive ? "text-[var(--brand-primary)]" : "text-[var(--fg-tertiary)]"
                  )}
                />
              </div>

              <div>
                <span className="text-[9px] font-mono text-[var(--fg-tertiary)] uppercase font-bold block truncate">
                  {stage.kicker}
                </span>
                <span
                  className={cn(
                    "text-xs font-semibold block truncate leading-tight mt-0.5",
                    isActive ? "text-[var(--brand-primary-hover)]" : "text-[var(--fg-primary)]"
                  )}
                >
                  {stage.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Deep Stage Inspection Panel */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedStage.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface-alt)] p-5 sm:p-6 shadow-[var(--shadow-xs)]"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Left: Stage Definition & Explanation (7 cols) */}
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded-[var(--radius-xs)] bg-[var(--brand-primary)] text-white font-mono text-[10px] font-bold">
                  STAGE {selectedStage.step} OF 8
                </span>
                <span className="text-xs font-mono text-[var(--fg-tertiary)]">
                  Actor: <strong className="text-[var(--fg-secondary)]">{selectedStage.actor}</strong>
                </span>
                <span className="text-xs font-mono text-[var(--fg-tertiary)] ml-auto sm:ml-0">
                  Latency: <strong className="text-[var(--brand-primary)]">{selectedStage.latency}</strong>
                </span>
              </div>

              <h3 className="text-base sm:text-lg font-bold text-[var(--fg-primary)] tracking-tight">
                &ldquo;{selectedStage.question}&rdquo;
              </h3>

              <p className="text-xs text-[var(--fg-secondary)] leading-relaxed">
                {selectedStage.description}
              </p>
            </div>

            {/* Right: Live Telemetry Output Card (5 cols) */}
            <div className="lg:col-span-5 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 shadow-[var(--shadow-xs)] space-y-2.5 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2 text-[10px] text-[var(--fg-tertiary)] uppercase font-bold">
                <span>Structured Telemetry Output</span>
                <span className="text-[var(--status-success-text)] font-semibold">VERIFIED</span>
              </div>

              <div className="space-y-1.5 text-[11px]">
                {Object.entries(selectedStage.telemetryEvidence).map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between gap-2">
                    <span className="text-[var(--fg-tertiary)] truncate">{key}:</span>
                    <span className="font-semibold text-[var(--fg-primary)] truncate text-right">
                      {String(val)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
