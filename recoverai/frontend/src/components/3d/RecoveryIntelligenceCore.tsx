"use client";

import React from "react";
import { formatCurrency, formatPercent, cn } from "@/lib/utils";
import { ShieldCheck, BrainCircuit, Activity, Map, Lock, CheckCircle2 } from "lucide-react";

/* ─────────────────────────────────────────────────────────────────────────────
   RecoveryIntelligenceCore — Autonomous Financial Intelligence Architecture
   Communicates the 5-phase deterministic recovery pipeline:
   Ingestion → ML Calibration → Root-Cause Diagnosis → Recovery Planning → Policy Gate → Settlement
   100% reliable, high-contrast SVG & React architecture. Zero WebGL overhead.
   ──────────────────────────────────────────────────────────────────────────── */

export interface RecoveryIntelligenceCoreProps {
  recovered?: number;
  rate?: number;
  className?: string;
  interactive?: boolean;
  isLive?: boolean;
}

const ENGINE_PIPELINE_STAGES = [
  { id: "ingest", name: "PayRecover Ingest", type: "STREAM", latency: "<1ms", status: "ONLINE", color: "var(--status-info)" },
  { id: "ml", name: "RecoveryPredictor", type: "GBDT v1.3", latency: "42ms", status: "CALIBRATED", color: "var(--brand-primary)" },
  { id: "diag", name: "DiagnosisAgent", type: "LLM v2.1", latency: "118ms", status: "ACTIVE", color: "var(--status-info)" },
  { id: "plan", name: "RecoveryPlanner", type: "PLANNER v2.0", latency: "80ms", status: "ACTIVE", color: "var(--status-review)" },
  { id: "gate", name: "Policy Engine", type: "DETERMINISTIC", latency: "2ms", status: "100% ENFORCED", color: "var(--status-warning)" },
  { id: "settle", name: "Action Adapter", type: "IDEMPOTENT", latency: "1.2ms", status: "VERIFIED", color: "var(--status-success)" },
];

export function RecoveryIntelligenceCore({
  recovered = 0,
  rate = 0,
  className,
}: RecoveryIntelligenceCoreProps) {
  return (
    <div className={cn("relative w-full h-full select-none flex flex-col justify-between p-4 sm:p-5", className)}>
      {/* Top Header & Live KPI */}
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[var(--status-success)]" />
          <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-[var(--fg-secondary)]">
            ENGINE STATUS: AUTONOMOUS
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-[var(--status-success-text)] bg-[var(--status-success-subtle)] border border-[var(--status-success-border)] px-2 py-0.5 rounded-[var(--radius-xs)]">
          <ShieldCheck className="w-3 h-3" />
          <span>IDEMPOTENCY LOCKED</span>
        </div>
      </div>

      {/* Center Architecture Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 my-3">
        {ENGINE_PIPELINE_STAGES.map((stage) => (
          <div
            key={stage.id}
            className="p-2.5 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface-alt)] flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono font-semibold text-[var(--fg-tertiary)] uppercase tracking-wider">
                {stage.type}
              </span>
              <span
                className="text-[8px] font-mono font-bold px-1.5 py-0.2 rounded"
                style={{
                  color: stage.color,
                  backgroundColor: `color-mix(in srgb, ${stage.color} 12%, transparent)`,
                }}
              >
                {stage.status}
              </span>
            </div>
            <div className="text-xs font-bold text-[var(--fg-primary)] mt-1.5 truncate">
              {stage.name}
            </div>
            <div className="text-[10px] font-mono text-[var(--fg-quaternary)] mt-1 flex items-center justify-between">
              <span>Latency</span>
              <span className="font-semibold text-[var(--fg-secondary)]">{stage.latency}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Settlement Metrics Readout */}
      <div className="pt-3 border-t border-[var(--border-subtle)] grid grid-cols-2 gap-4">
        <div>
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--fg-tertiary)]">
            Verified Recovered
          </div>
          <div className="text-base sm:text-lg font-bold font-mono text-[var(--status-success-text)] tabular-nums mt-0.5">
            {formatCurrency(recovered || 0, "INR")}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--fg-tertiary)]">
            Recovery Rate
          </div>
          <div className="text-base sm:text-lg font-bold font-mono text-[var(--fg-primary)] tabular-nums mt-0.5">
            {formatPercent(rate || 0)}
          </div>
        </div>
      </div>
    </div>
  );
}

