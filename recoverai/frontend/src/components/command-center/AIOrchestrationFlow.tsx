"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  CreditCard, Search, BrainCircuit, Activity,
  Map, ShieldCheck, Play, ArrowRight, CheckCircle2,
  Sparkles, Layers, Cpu, Shield
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────────
   AIOrchestrationFlow — PayRecover AI Command Center
   Animated orchestration visualization showing the 7-stage AI intelligence
   and policy governance lifecycle:
   Transaction → Detection → ML Prediction → Diagnosis Agent → Recovery Planner → Policy Engine → Action Adapter
   ──────────────────────────────────────────────────────────────────────────── */

interface FlowNode {
  id: string;
  step: number;
  name: string;
  actor: string;
  version: string;
  type: "INGESTION" | "FILTER" | "ML_INFERENCE" | "LLM_AGENT" | "PLANNER" | "POLICY" | "ADAPTER";
  icon: React.ComponentType<{ className?: string }>;
  latency: string;
  status: "LIVE" | "ARMED" | "OPERATIONAL";
  fallback: string;
}

const FLOW_NODES: FlowNode[] = [
  {
    id: "transaction",
    step: 1,
    name: "Transaction",
    actor: "PayRecover Ingest",
    version: "v3.2",
    type: "INGESTION",
    icon: CreditCard,
    latency: "0.14ms",
    status: "OPERATIONAL",
    fallback: "Webhook replay queue",
  },
  {
    id: "detection",
    step: 2,
    name: "Detection",
    actor: "FailureManager",
    version: "v3.2",
    type: "FILTER",
    icon: Search,
    latency: "1.2ms",
    status: "OPERATIONAL",
    fallback: "Default eligibility window",
  },
  {
    id: "ml_prediction",
    step: 3,
    name: "ML Prediction",
    actor: "RecoveryPredictor",
    version: "v1.3",
    type: "ML_INFERENCE",
    icon: BrainCircuit,
    latency: "44ms",
    status: "LIVE",
    fallback: "FastTree Heuristic Matrix",
  },
  {
    id: "diagnosis_agent",
    step: 4,
    name: "Diagnosis Agent",
    actor: "DiagnosisAgent",
    version: "v2.1",
    type: "LLM_AGENT",
    icon: Activity,
    latency: "182ms",
    status: "LIVE",
    fallback: "Rule-Based Regex Taxonomy",
  },
  {
    id: "recovery_planner",
    step: 5,
    name: "Recovery Planner",
    actor: "RecoveryPlanner",
    version: "v2.0",
    type: "PLANNER",
    icon: Map,
    latency: "128ms",
    status: "LIVE",
    fallback: "Exponential Backoff Rule Default",
  },
  {
    id: "policy_engine",
    step: 6,
    name: "Policy Engine",
    actor: "Deterministic Policy",
    version: "v1.2",
    type: "POLICY",
    icon: ShieldCheck,
    latency: "4ms",
    status: "ARMED",
    fallback: "Strict Deny Guarantee",
  },
  {
    id: "action_adapter",
    step: 7,
    name: "Action Adapter",
    actor: "PayRecoverLive",
    version: "v3.2",
    type: "ADAPTER",
    icon: Play,
    latency: "86ms",
    status: "OPERATIONAL",
    fallback: "Idempotency Lock & Circuit Breaker",
  },
];

export function AIOrchestrationFlow({ className }: { className?: string }) {
  const [selectedNode, setSelectedNode] = useState<FlowNode>(FLOW_NODES[2]); // Default to ML Prediction

  return (
    <div
      className={cn(
        "rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 sm:p-7 shadow-[var(--shadow-sm)] space-y-6",
        className
      )}
    >
      {/* Flow Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--border-subtle)]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold tracking-[0.1em] uppercase text-[var(--brand-primary)]">
              AI ORCHESTRATION PIPELINE
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-success)] animate-pulse" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-[var(--fg-primary)] tracking-tight mt-0.5">
            Autonomous Decision & Inference Flow
          </h2>
          <p className="text-xs text-[var(--fg-tertiary)]">
            Continuous sequence from failure ingestion to idempotent dispatch
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-[var(--fg-secondary)]">
          <span className="text-[11px] text-[var(--fg-tertiary)]">Pipeline Latency:</span>
          <span className="font-bold text-[var(--fg-primary)] bg-[var(--bg-surface-alt)] px-2.5 py-1 rounded-[var(--radius-xs)] border border-[var(--border-subtle)]">
            ~445ms total
          </span>
        </div>
      </div>

      {/* 7-Stage Flow Sequence Nodes */}
      <div className="overflow-x-auto">
        <div className="min-w-[840px] grid grid-cols-7 gap-2.5 relative">
          {FLOW_NODES.map((node, idx) => {
            const isSelected = selectedNode.id === node.id;
            const Icon = node.icon;
            const isLast = idx === FLOW_NODES.length - 1;

            return (
              <div key={node.id} className="relative flex flex-col items-center">
                <button
                  onClick={() => setSelectedNode(node)}
                  className={cn(
                    "w-full text-left p-3 rounded-[var(--radius-md)] border transition-all duration-[var(--duration-fast)] relative group",
                    isSelected
                      ? "bg-[var(--brand-primary-muted)] border-[var(--brand-primary)] shadow-[var(--shadow-md)] ring-1 ring-[var(--brand-primary)]"
                      : "bg-[var(--bg-surface-alt)] border-[var(--border-subtle)] hover:bg-[var(--bg-surface)] hover:border-[var(--border-default)]"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold",
                        isSelected
                          ? "bg-[var(--brand-primary)] text-white"
                          : "bg-[var(--bg-raised)] text-[var(--fg-tertiary)] group-hover:text-[var(--fg-primary)]"
                      )}
                    >
                      {node.step}
                    </span>

                    <Icon
                      className={cn(
                        "w-3.5 h-3.5",
                        isSelected ? "text-[var(--brand-primary)]" : "text-[var(--fg-tertiary)]"
                      )}
                    />
                  </div>

                  <h4
                    className={cn(
                      "text-xs font-bold truncate leading-tight",
                      isSelected ? "text-[var(--brand-primary-hover)]" : "text-[var(--fg-primary)]"
                    )}
                  >
                    {node.name}
                  </h4>

                  <span className="text-[10px] font-mono text-[var(--fg-tertiary)] truncate block mt-0.5">
                    {node.version}
                  </span>

                  <div className="mt-2 pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between font-mono text-[10px]">
                    <span className="text-[var(--fg-tertiary)]">Latency</span>
                    <span className="font-semibold text-[var(--fg-primary)]">{node.latency}</span>
                  </div>
                </button>

                {/* Arrow Connector between nodes */}
                {!isLast && (
                  <div className="hidden lg:block absolute -right-2 top-8 z-10 pointer-events-none text-[var(--border-strong)]">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Node Telemetry Detail Banner */}
      <div className="p-4 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface-alt)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-[var(--radius-md)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-center flex-shrink-0 text-[var(--brand-primary)] shadow-[var(--shadow-xs)] mt-0.5">
            <selectedNode.icon className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-[var(--fg-primary)]">
                Stage {selectedNode.step}: {selectedNode.name}
              </span>
              <span className="text-[10px] font-mono text-[var(--brand-primary)] bg-[var(--brand-primary-muted)] px-1.5 py-0.2 rounded font-bold">
                {selectedNode.version}
              </span>
              <span className="text-[10px] font-mono text-[var(--fg-tertiary)]">
                Actor: <strong className="text-[var(--fg-secondary)]">{selectedNode.actor}</strong>
              </span>
            </div>
            <p className="text-xs text-[var(--fg-secondary)] mt-1">
              Fallback Mechanism: <strong className="text-[var(--fg-primary)]">{selectedNode.fallback}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 font-mono text-xs">
          <div className="text-right">
            <span className="text-[10px] text-[var(--fg-tertiary)] block">Inference Latency</span>
            <span className="font-bold text-[var(--brand-primary)]">{selectedNode.latency}</span>
          </div>
          <div className="h-8 w-px bg-[var(--border-subtle)]" />
          <span className="px-2 py-1 rounded-[var(--radius-xs)] bg-[var(--status-success-subtle)] text-[var(--status-success-text)] border border-[var(--status-success-border)] text-[10px] font-bold">
            {selectedNode.status}
          </span>
        </div>
      </div>
    </div>
  );
}
