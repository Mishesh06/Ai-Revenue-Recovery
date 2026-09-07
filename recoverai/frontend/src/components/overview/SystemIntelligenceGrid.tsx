"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  BrainCircuit, Activity, Map, ShieldCheck,
  Zap, Cpu, CheckCircle2, RefreshCw, Server
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AgentSummary } from "@/types/api";

/* ─────────────────────────────────────────────────────────────────────────────
   SystemIntelligenceGrid — RecoverAI Overview Section 6
   Visualizes the 5 core intelligence layers, active agent versions,
   inference latencies, and fallback reliability status.
   ──────────────────────────────────────────────────────────────────────────── */

interface SystemIntelligenceGridProps {
  agents?: AgentSummary;
  className?: string;
}

interface IntelligenceModule {
  id: string;
  name: string;
  version: string;
  question: string;
  type: "ML_INFERENCE" | "LLM_AGENT" | "PLANNER" | "SAFETY_POLICY" | "ADAPTER";
  status: "LIVE" | "ARMED" | "OPERATIONAL";
  latency: string;
  fallback: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  description: string;
}

const MODULES: IntelligenceModule[] = [
  {
    id: "ml_model",
    name: "ML Recovery Model",
    version: "RecoveryPredictor v1.3",
    question: "How likely is recovery?",
    type: "ML_INFERENCE",
    status: "LIVE",
    latency: "44ms",
    fallback: "Heuristic BIN matrix fallback",
    icon: BrainCircuit,
    color: "var(--brand-primary)",
    description: "Gradient boosted trees scoring recovery probability from bank uptime, card issuer BIN, and failure metadata.",
  },
  {
    id: "diagnosis_agent",
    name: "Diagnosis Agent",
    version: "DiagnosisAgent v2.1",
    question: "Why did the payment fail?",
    type: "LLM_AGENT",
    status: "LIVE",
    latency: "182ms",
    fallback: "Rule-based regex fallback",
    icon: Activity,
    color: "var(--brand-primary)",
    description: "Autonomous reasoning agent categorizing transient vs permanent errors without exposing private chain-of-thought.",
  },
  {
    id: "recovery_planner",
    name: "Recovery Planner",
    version: "RecoveryPlanner v2.0",
    question: "What recovery action should be taken?",
    type: "PLANNER",
    status: "LIVE",
    latency: "128ms",
    fallback: "Exponential backoff rule default",
    icon: Map,
    color: "var(--brand-primary)",
    description: "Formulates optimal intervention strategies across smart retries, payment method intent switches, and customer nudges.",
  },
  {
    id: "policy_engine",
    name: "Deterministic Policy Engine",
    version: "Policy retry_policy v1.2",
    question: "Is this action allowed?",
    type: "SAFETY_POLICY",
    status: "ARMED",
    latency: "4ms",
    fallback: "Strict Deny default",
    icon: ShieldCheck,
    color: "var(--status-warning)",
    description: "Mathematical safety gate executing hard customer fatigue caps, rate limits, and risk thresholds with zero hallucination.",
  },
  {
    id: "action_adapter",
    name: "Action Execution Adapter",
    version: "RazorpayLiveAdapter v3.2",
    question: "How is the action dispatched?",
    type: "ADAPTER",
    status: "OPERATIONAL",
    latency: "86ms",
    fallback: "Idempotency Lock & Circuit Breaker",
    icon: Zap,
    color: "var(--status-info)",
    description: "Atomic dispatch adapter with idempotency locking to ensure zero duplicate charges and clean settlement capture.",
  },
];

export function SystemIntelligenceGrid({
  agents,
  className,
}: SystemIntelligenceGridProps) {
  const avgLatency = agents?.avg_latency_ms ? `${Math.round(agents.avg_latency_ms)}ms` : "88ms";
  const totalRuns = agents?.total_runs ? agents.total_runs.toLocaleString() : "1,248";

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
              SYSTEM INTELLIGENCE
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[var(--status-success-subtle)] text-[var(--status-success-text)] font-semibold">
              5 OPERATIONAL LAYERS
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-[var(--fg-primary)] tracking-tight mt-0.5">
            AI Agent & Safety Architecture
          </h2>
          <p className="text-xs text-[var(--fg-tertiary)]">
            Separation of ML inference, LLM reasoning agents, and deterministic policy safety gates
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="text-right">
            <span className="text-[10px] text-[var(--fg-tertiary)] block">Total Agent Executions</span>
            <span className="font-bold text-[var(--fg-primary)]">{totalRuns} runs</span>
          </div>
          <div className="h-7 w-px bg-[var(--border-subtle)]" />
          <div className="text-right">
            <span className="text-[10px] text-[var(--fg-tertiary)] block">Avg Inference</span>
            <span className="font-bold text-[var(--brand-primary)]">{avgLatency}</span>
          </div>
        </div>
      </div>

      {/* Grid of 5 Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {MODULES.map((mod) => {
          const Icon = mod.icon;

          return (
            <div
              key={mod.id}
              className={cn(
                "rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface-alt)] p-4 sm:p-5",
                "hover:border-[var(--border-strong)] transition-all flex flex-col justify-between space-y-4"
              )}
            >
              {/* Top Row: Icon + Version + Status */}
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-center flex-shrink-0 text-[var(--brand-primary)] shadow-[var(--shadow-xs)]">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-[var(--fg-primary)] truncate">
                        {mod.name}
                      </h4>
                      <span className="text-[10px] font-mono text-[var(--fg-tertiary)] truncate block">
                        {mod.version}
                      </span>
                    </div>
                  </div>

                  <span
                    className={cn(
                      "px-1.5 py-0.5 rounded-[var(--radius-xs)] font-mono text-[10px] font-bold flex-shrink-0",
                      mod.status === "LIVE"
                        ? "bg-[var(--status-success-subtle)] text-[var(--status-success-text)]"
                        : mod.status === "ARMED"
                        ? "bg-[var(--status-warning-subtle)] text-[var(--status-warning-text)]"
                        : "bg-[var(--status-info-subtle)] text-[var(--status-info-text)]"
                    )}
                  >
                    {mod.status}
                  </span>
                </div>

                <div className="mb-2">
                  <span className="text-[11px] font-bold text-[var(--brand-primary)] italic">
                    &ldquo;{mod.question}&rdquo;
                  </span>
                </div>

                <p className="text-xs text-[var(--fg-secondary)] leading-relaxed">
                  {mod.description}
                </p>
              </div>

              {/* Bottom Metadata: Latency + Fallback */}
              <div className="pt-3 border-t border-[var(--border-subtle)] space-y-1.5 text-[11px] font-mono">
                <div className="flex items-center justify-between text-[var(--fg-tertiary)]">
                  <span>Latency:</span>
                  <span className="font-semibold text-[var(--fg-primary)]">{mod.latency}</span>
                </div>
                <div className="flex items-center justify-between text-[var(--fg-tertiary)]">
                  <span>Fallback:</span>
                  <span className="text-[10px] text-[var(--fg-secondary)] truncate max-w-[140px]">
                    {mod.fallback}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
