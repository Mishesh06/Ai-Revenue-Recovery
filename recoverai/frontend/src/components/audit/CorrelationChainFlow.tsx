"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  CreditCard, BrainCircuit, Activity, Map,
  ShieldCheck, Play, CheckCircle2, ArrowRight,
  Shield, FileText
} from "lucide-react";
import { AuditEventOut } from "@/types/api";
import { cn, truncateId } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────────
   CorrelationChainFlow — RecoverAI Governance Engine
   Visualizes the 7-node correlation trace for any audit event:
   Transaction → Prediction → AI Decision → Recommendation → Policy Evaluation → Recovery Action → Attempt
   ──────────────────────────────────────────────────────────────────────────── */

interface CorrelationChainFlowProps {
  currentEvent: AuditEventOut;
  className?: string;
}

const CHAIN_STAGES = [
  { id: "Transaction",        label: "Transaction",       icon: CreditCard,   matchEvents: ["PaymentFailed"] },
  { id: "Prediction",         label: "Prediction",        icon: BrainCircuit, matchEvents: ["OpportunityDetected", "PredictionCreated"] },
  { id: "AI Decision",        label: "AI Diagnosis",      icon: Activity,     matchEvents: ["DiagnosisCreated"] },
  { id: "Recommendation",     label: "Recommendation",    icon: Map,          matchEvents: ["RecoveryPlanned"] },
  { id: "Policy Evaluation",  label: "Policy Evaluation", icon: ShieldCheck,  matchEvents: ["PolicyEvaluated", "RecoveryApproved"] },
  { id: "Recovery Action",    label: "Recovery Action",   icon: Play,         matchEvents: ["RecoveryExecuted", "ActionStarted"] },
  { id: "Attempt",            label: "Outcome",           icon: CheckCircle2, matchEvents: ["RecoverySucceeded", "RecoveryFailed", "ManualReviewCreated", "CaseClosed"] },
];

export function CorrelationChainFlow({ currentEvent, className }: CorrelationChainFlowProps) {
  // Determine which chain node matches current event
  const activeChainIndex = CHAIN_STAGES.findIndex((node) =>
    node.matchEvents.some((ev) => currentEvent.event_type.includes(ev) || ev === currentEvent.event_type)
  );

  return (
    <div
      className={cn(
        "p-4 rounded-[var(--radius-md)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-3 shadow-[var(--shadow-xs)]",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
          <span className="text-xs font-bold text-[var(--fg-primary)] tracking-tight">
            End-to-End Correlation Chain
          </span>
        </div>
        <span className="text-[10px] font-mono text-[var(--fg-tertiary)]">
          Trace: {truncateId(currentEvent.correlation_id, 12)}
        </span>
      </div>

      {/* Horizontal Correlation Nodes */}
      <div className="grid grid-cols-7 gap-1 relative overflow-x-auto pb-1">
        {CHAIN_STAGES.map((node, idx) => {
          const isCurrent = idx === activeChainIndex || (activeChainIndex === -1 && idx === 0);
          const isPassed = activeChainIndex !== -1 && idx < activeChainIndex;
          const Icon = node.icon;
          const isLast = idx === CHAIN_STAGES.length - 1;

          return (
            <div key={node.id} className="flex flex-col items-center text-center relative group">
              <div
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center border transition-all duration-200 relative z-10",
                  isCurrent
                    ? "bg-[var(--brand-primary)] border-[var(--brand-primary)] text-white shadow-[var(--glow-brand)] scale-110"
                    : isPassed
                    ? "bg-[var(--status-success-subtle)] border-[var(--status-success-border)] text-[var(--status-success-text)]"
                    : "bg-[var(--bg-surface-alt)] border-[var(--border-subtle)] text-[var(--fg-tertiary)]"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
              </div>

              <span
                className={cn(
                  "text-[9px] font-mono font-medium truncate max-w-full mt-1.5 leading-tight",
                  isCurrent
                    ? "text-[var(--brand-primary-hover)] font-bold"
                    : isPassed
                    ? "text-[var(--fg-secondary)]"
                    : "text-[var(--fg-tertiary)]"
                )}
              >
                {node.label}
              </span>

              {/* Arrow Connector */}
              {!isLast && (
                <div className="hidden sm:block absolute -right-2 top-2 z-0 text-[var(--border-default)]">
                  <ArrowRight className="w-2.5 h-2.5" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
