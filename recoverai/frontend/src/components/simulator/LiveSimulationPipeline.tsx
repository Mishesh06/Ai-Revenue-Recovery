"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard, Search, BrainCircuit, Activity,
  Map, ShieldCheck, Play, CheckCircle2, XCircle,
  AlertTriangle, Loader2, Lock, ArrowRight, ShieldAlert
} from "lucide-react";
import { AuditEventOut } from "@/types/api";
import { cn, formatCurrency } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────────
   LiveSimulationPipeline — PayRecover 8-Stage Sequential Orchestration
   STEP 1: Transactions Analyzed
   STEP 2: Opportunities Detected
   STEP 3: ML Predictions Generated
   STEP 4: AI Diagnosis
   STEP 5: Recovery Planning
   STEP 6: Policy Evaluation
   STEP 7: Action Execution
   STEP 8: Final Outcome
   ──────────────────────────────────────────────────────────────────────────── */

export type StageState = "pending" | "active" | "completed" | "failed" | "blocked" | "unknown";

export interface PipelineStageDef {
  step: number;
  id: string;
  label: string;
  subhead: string;
  eventType: string;
  icon: React.ComponentType<{ className?: string }>;
  actor: string;
  description: string;
}

export const SIMULATION_STAGES: PipelineStageDef[] = [
  { step: 1, id: "SCANNING",     label: "Transactions Analyzed",    subhead: "INGESTION STREAM",   eventType: "PaymentFailed",       icon: CreditCard,   actor: "PayRecover Ingest",       description: "Live ingestion of failed merchant payment stream" },
  { step: 2, id: "DETECTING",    label: "Opportunities Detected",   subhead: "FAILURE FILTER",     eventType: "OpportunityDetected", icon: Search,       actor: "FailureManager",        description: "Filtering transient vs hard terminal failure codes" },
  { step: 3, id: "PREDICTING",   label: "ML Predictions Generated", subhead: "SCORING MODEL",      eventType: "PredictionCreated",   icon: BrainCircuit, actor: "RecoveryPredictor v1.3", description: "ML scoring & recovery probability calibration" },
  { step: 4, id: "DIAGNOSING",   label: "AI Diagnosis Formulated",  subhead: "ROOT-CAUSE LLM",     eventType: "DiagnosisCreated",    icon: Activity,     actor: "DiagnosisAgent v2.1",   description: "Attributing error codes into formal failure taxonomies" },
  { step: 5, id: "PLANNING",     label: "Recovery Plan Generated",  subhead: "TIMING STRATEGY",    eventType: "RecoveryPlanned",     icon: Map,          actor: "RecoveryPlanner v2.0",  description: "Dynamic exponential retry window and channel routing" },
  { step: 6, id: "POLICY_CHECK", label: "Policy Evaluation",        subhead: "DETERMINISTIC GATE", eventType: "PolicyEvaluated",     icon: ShieldCheck,  actor: "PolicyEngine v1.2",     description: "Strict safety boundary, rate limit, and fatigue check" },
  { step: 7, id: "EXECUTING",    label: "Action Execution",         subhead: "IDEMPOTENT DISPATCH",eventType: "RecoveryExecuted",    icon: Play,         actor: "ActionAdapter v3.2",    description: "Idempotent payment intervention execution on gateway" },
  { step: 8, id: "OUTCOME",      label: "Final Outcome & Settlement",subhead: "LEDGER VERIFICATION",eventType: "RecoverySucceeded",icon: CheckCircle2, actor: "Settlement Ledger",    description: "Verified capital recovery, escalation, or safe closure" },
];

interface LiveSimulationPipelineProps {
  simulationState: Record<string, StageState>;
  auditEvents: AuditEventOut[];
  activeStageIdx: number;
  scenario: string;
  caseId?: string | null;
  className?: string;
}

export function LiveSimulationPipeline({
  simulationState,
  auditEvents,
  activeStageIdx,
  scenario,
  caseId,
  className,
}: LiveSimulationPipelineProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden shadow-[var(--shadow-sm)] space-y-0",
        className
      )}
    >
      {/* Header telemetry stripe */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-surface-alt)]/60 font-mono text-xs">
        <div className="flex items-center gap-2">
          <span className="text-[var(--fg-tertiary)]">Simulated Case:</span>
          <span className="font-bold text-[var(--fg-primary)]">{caseId || "sim-orchestration-001"}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-success)] animate-pulse" />
          <span className="px-2 py-0.5 rounded bg-[var(--brand-primary-muted)] text-[var(--brand-primary)] font-bold text-[10px]">
            8-STAGE ORCHESTRATION PIPELINE
          </span>
        </div>
      </div>

      {/* 8-Stage Progression Pipeline */}
      <div className="p-6 space-y-3.5">
        {SIMULATION_STAGES.map((stage, idx) => {
          const state: StageState = simulationState[stage.id] || "pending";
          const isLast = idx === SIMULATION_STAGES.length - 1;
          const Icon = stage.icon;
          const evt = auditEvents.find((e) => e.event_type === stage.eventType);

          const isCompleted = state === "completed";
          const isActive = state === "active";
          const isBlocked = state === "blocked";
          const isUnknown = state === "unknown";
          const isFailed = state === "failed";

          return (
            <motion.div
              key={stage.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: state === "pending" ? 0.35 : 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="relative flex items-start group"
            >
              {/* Connector line */}
              {!isLast && (
                <div
                  className={cn(
                    "absolute left-[17px] top-[34px] bottom-[-14px] w-0.5 transition-colors duration-300",
                    isCompleted
                      ? "bg-[var(--status-success)]"
                      : isBlocked
                      ? "bg-[var(--status-warning)]"
                      : isUnknown
                      ? "bg-[var(--status-danger)]"
                      : "bg-[var(--border-subtle)]"
                  )}
                />
              )}

              {/* Stage Icon Status Indicator */}
              <div
                className={cn(
                  "w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center flex-shrink-0 mr-3.5 z-10 transition-all duration-300 font-mono text-xs font-bold shadow-[var(--shadow-xs)]",
                  isCompleted
                    ? "bg-[var(--status-success-subtle)] text-[var(--status-success-text)] border border-[var(--status-success-border)]"
                    : isActive
                    ? "bg-[var(--brand-primary)] text-white ring-4 ring-[var(--brand-primary-ring)] shadow-[var(--shadow-md)]"
                    : isBlocked
                    ? "bg-[var(--status-warning-subtle)] text-[var(--status-warning-text)] border border-[var(--status-warning-border)]"
                    : isUnknown
                    ? "bg-[var(--status-danger-subtle)] text-[var(--status-danger-text)] border border-[var(--status-danger-border)]"
                    : isFailed
                    ? "bg-[var(--status-danger-subtle)] text-[var(--status-danger-text)] border border-[var(--status-danger-border)]"
                    : "bg-[var(--bg-surface-alt)] text-[var(--fg-tertiary)] border border-[var(--border-subtle)]"
                )}
              >
                {isActive ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : isCompleted ? (
                  <CheckCircle2 className="w-4 h-4 text-[var(--status-success)]" />
                ) : isBlocked ? (
                  <ShieldAlert className="w-4 h-4 text-[var(--status-warning)]" />
                ) : isUnknown ? (
                  <AlertTriangle className="w-4 h-4 text-[var(--status-danger)]" />
                ) : (
                  <span>{stage.step}</span>
                )}
              </div>

              {/* Stage Content Card */}
              <div
                className={cn(
                  "flex-1 p-3.5 rounded-[var(--radius-md)] border transition-all duration-[var(--duration-fast)]",
                  isActive
                    ? "bg-[var(--brand-primary-muted)] border-[var(--brand-primary)] shadow-[var(--shadow-xs)]"
                    : isCompleted
                    ? "bg-[var(--bg-surface-alt)]/70 border-[var(--border-subtle)]"
                    : isBlocked
                    ? "bg-[var(--status-warning-subtle)]/60 border-[var(--status-warning-border)]"
                    : isUnknown
                    ? "bg-[var(--status-danger-subtle)]/60 border-[var(--status-danger-border)]"
                    : "bg-[var(--bg-surface)] border-[var(--border-subtle)]"
                )}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-[var(--fg-primary)]">
                      Step {stage.step}: {stage.label}
                    </span>
                    <span className="text-[9px] font-mono text-[var(--fg-tertiary)] bg-[var(--bg-raised)] px-1.5 py-0.2 rounded font-bold">
                      {stage.actor}
                    </span>
                  </div>

                  <span
                    className={cn(
                      "text-[10px] font-mono font-bold px-2 py-0.5 rounded-[var(--radius-xs)] uppercase self-start sm:self-auto",
                      isCompleted
                        ? "bg-[var(--status-success-subtle)] text-[var(--status-success-text)]"
                        : isActive
                        ? "bg-[var(--brand-primary)] text-white"
                        : isBlocked
                        ? "bg-[var(--status-warning-subtle)] text-[var(--status-warning-text)]"
                        : isUnknown
                        ? "bg-[var(--status-danger-subtle)] text-[var(--status-danger-text)]"
                        : "text-[var(--fg-tertiary)] bg-[var(--bg-raised)]"
                    )}
                  >
                    {state}
                  </span>
                </div>

                <p className="text-[11px] text-[var(--fg-secondary)] mt-1">
                  {stage.description}
                </p>

                {/* Specific Real Telemetry Snippet if stage finished */}
                {evt && (isCompleted || isBlocked || isUnknown || isFailed) && (
                  <div className="mt-2 pt-2 border-t border-[var(--border-subtle)] font-mono text-[10px] text-[var(--fg-tertiary)] flex items-center justify-between">
                    <span>Verified Event: {evt.event_type}</span>
                    <span>{new Date(evt.timestamp).toLocaleTimeString()}</span>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
