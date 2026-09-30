"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2, ShieldAlert, AlertTriangle, Sparkles,
  ShieldCheck, ArrowRight, Play, Loader2, RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────────
   ScenarioCardSelector — PayRecover Design System
   Interactive scenario picker for the 5 demonstration scenarios.
   ──────────────────────────────────────────────────────────────────────────── */

export interface ScenarioDefinition {
  id: string;
  code: string;
  name: string;
  tag: string;
  tagVariant: "success" | "warning" | "danger" | "brand" | "info";
  description: string;
  demonstrationGoal: string;
  expectedOutcome: string;
}

export const SCENARIOS: ScenarioDefinition[] = [
  {
    id: "A",
    code: "Scenario A",
    name: "Normal Recovery",
    tag: "HAPPY PATH",
    tagVariant: "success",
    description: "Standard transient failure successfully diagnosed and recovered via smart exponential retry.",
    demonstrationGoal: "Demonstrates full autonomous pipeline flow from detection to confirmed settlement.",
    expectedOutcome: "Recovery Succeeded (₹ Recovered)",
  },
  {
    id: "F",
    code: "Scenario F",
    name: "Temporary Failure",
    tag: "RESILIENCE",
    tagVariant: "info",
    description: "Transient bank gateway drop-off calibrated for immediate automated retry recovery.",
    demonstrationGoal: "Demonstrates network resilience and transient fault absorption.",
    expectedOutcome: "Immediate Automated Retry (Recovered)",
  },
  {
    id: "B",
    code: "Scenario B",
    name: "High-Risk Customer",
    tag: "RISK GATE",
    tagVariant: "warning",
    description: "Transaction with customer risk score > 0.8 evaluated against strict fraud and credit boundaries.",
    demonstrationGoal: "Demonstrates Policy Engine risk gating and rate-limit safeguards.",
    expectedOutcome: "Risk Adjusted / Guarded Intervention",
  },
  {
    id: "C",
    code: "Scenario C",
    name: "API Timeout & Unknown Outcome",
    tag: "CRITICAL: IDEMPOTENCY",
    tagVariant: "danger",
    description: "Payment gateway adapter times out without confirmation. Orchestrator halts blind retries.",
    demonstrationGoal: "CRITICAL: Demonstrates idempotency, double-recovery prevention, and human review escalation.",
    expectedOutcome: "Zero Blind Retries → Manual Review",
  },
  {
    id: "D",
    code: "Scenario D",
    name: "High-Value Opportunity",
    tag: "REVENUE FOCUS",
    tagVariant: "brand",
    description: "High-ticket transaction with insufficient funds diagnosed for optimal customer notification timing.",
    demonstrationGoal: "Demonstrates ML scoring priority and intent switch recommendation.",
    expectedOutcome: "Optimized Recovery Window",
  },
  {
    id: "E",
    code: "Scenario E",
    name: "Policy Heavy Constraints",
    tag: "GOVERNANCE",
    tagVariant: "warning",
    description: "Multiple prior attempts exceed merchant configured retry budget and trigger hard block.",
    demonstrationGoal: "Demonstrates deterministic rule compliance and fatigue prevention.",
    expectedOutcome: "Policy Blocked (Budget Exceeded)",
  },
];

interface ScenarioCardSelectorProps {
  selectedScenario: string;
  onSelect: (scenario: string) => void;
  onSimulate: () => void;
  isRunning: boolean;
  className?: string;
}

export function ScenarioCardSelector({
  selectedScenario,
  onSelect,
  onSimulate,
  isRunning,
  className,
}: ScenarioCardSelectorProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-[var(--fg-tertiary)] flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
          Select Simulation Scenario
        </span>
        <span className="text-[10px] font-mono text-[var(--fg-tertiary)]">
          FastAPI Synthetic Pipeline
        </span>
      </div>

      {/* Grid of 6 Scenario Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {SCENARIOS.map((sc) => {
          const isSelected = selectedScenario === sc.id;

          return (
            <button
              key={sc.id}
              onClick={() => onSelect(sc.id)}
              disabled={isRunning}
              className={cn(
                "p-3.5 rounded-[var(--radius-lg)] border text-left flex flex-col justify-between transition-all duration-[var(--duration-fast)] relative group",
                isSelected
                  ? "bg-[var(--brand-primary-muted)] border-[var(--brand-primary)] shadow-[var(--shadow-md)] ring-1 ring-[var(--brand-primary)]"
                  : "bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--border-default)] hover:bg-[var(--bg-surface-alt)] shadow-[var(--shadow-xs)]",
                isRunning && "cursor-not-allowed opacity-80"
              )}
            >
              <div>
                {/* Header: Code & Tag */}
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-xs font-bold text-[var(--fg-primary)]">
                    {sc.code}
                  </span>
                  <span
                    className={cn(
                      "text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-[var(--radius-xs)] border",
                      sc.tagVariant === "danger"
                        ? "bg-[var(--status-danger-subtle)] text-[var(--status-danger-text)] border-[var(--status-danger-border)]"
                        : sc.tagVariant === "success"
                        ? "bg-[var(--status-success-subtle)] text-[var(--status-success-text)] border-[var(--status-success-border)]"
                        : sc.tagVariant === "warning"
                        ? "bg-[var(--status-warning-subtle)] text-[var(--status-warning-text)] border-[var(--status-warning-border)]"
                        : "bg-[var(--brand-primary-muted)] text-[var(--brand-primary-hover)] border-[var(--brand-primary-ring)]"
                    )}
                  >
                    {sc.tag}
                  </span>
                </div>

                {/* Name */}
                <h4 className="text-xs font-bold text-[var(--fg-primary)] leading-tight mb-1">
                  {sc.name}
                </h4>

                {/* Description */}
                <p className="text-[11px] text-[var(--fg-secondary)] leading-relaxed line-clamp-3">
                  {sc.description}
                </p>
              </div>

              {/* Footer target */}
              <div className="mt-3 pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-[10px] font-mono text-[var(--fg-tertiary)]">
                <span>Outcome:</span>
                <span className="font-semibold text-[var(--fg-primary)] truncate max-w-[120px]">
                  {sc.expectedOutcome}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
