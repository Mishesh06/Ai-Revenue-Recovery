"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  BrainCircuit, Activity, Map, ShieldCheck,
  CheckCircle2, Clock, Zap, AlertTriangle,
  Server, Cpu, Shield, ArrowRight, Layers, Lock
} from "lucide-react";
import { formatLatency, cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────────
   IntelligenceLayerCard — PayRecover AI Command Center
   Visualizes one of the 3 Intelligence Layers or the Deterministic Policy Engine.
   Zero chain-of-thought exposed. Pure structured outputs & fallback telemetry.
   ──────────────────────────────────────────────────────────────────────────── */

export interface AgentModuleInfo {
  id: string;
  name: string;
  version: string;
  question: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  status: "LIVE" | "DEGRADED" | "STANDBY" | "HEALTHY" | "ARMED";
  fallbackStatus: string;
  latencyMs: number;
  totalRuns: number;
  successRate: number;
  isDeterministicPolicy?: boolean;
  signals: { label: string; value: string }[];
  sampleOutput: Record<string, unknown>;
}

interface IntelligenceLayerCardProps {
  module: AgentModuleInfo;
  onInspectOutput?: (module: AgentModuleInfo) => void;
  className?: string;
}

export function IntelligenceLayerCard({
  module,
  onInspectOutput,
  className,
}: IntelligenceLayerCardProps) {
  const Icon = module.icon;
  const isPolicy = module.isDeterministicPolicy;

  const isLive = module.status === "LIVE" || module.status === "HEALTHY" || module.status === "ARMED";
  const isDegraded = module.status === "DEGRADED";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "rounded-[var(--radius-xl)] border p-5 sm:p-6 shadow-[var(--shadow-sm)] flex flex-col justify-between transition-all duration-[var(--duration-fast)]",
        isPolicy
          ? "bg-[var(--bg-surface)] border-[var(--status-warning-border)] shadow-[var(--shadow-md)]"
          : "bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--border-default)]",
        className
      )}
    >
      <div>
        {/* Top Header: Badge, Version & Status */}
        <div className="flex items-start justify-between gap-3 pb-3 mb-3 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center flex-shrink-0 shadow-[var(--shadow-xs)]",
                isPolicy
                  ? "bg-[var(--status-warning-subtle)] text-[var(--status-warning)] border border-[var(--status-warning-border)]"
                  : "bg-[var(--brand-primary-muted)] text-[var(--brand-primary)] border border-[var(--brand-primary-ring)]"
              )}
            >
              <Icon className="w-5 h-5" />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-[var(--fg-primary)] tracking-tight">
                  {module.name}
                </h3>
                <span className="text-[10px] font-mono font-bold text-[var(--fg-secondary)] bg-[var(--bg-raised)] px-1.5 py-0.5 rounded-[var(--radius-xs)]">
                  {module.version}
                </span>
              </div>

              <span className="text-xs font-semibold text-[var(--brand-primary)] italic block mt-0.5">
                &ldquo;{module.question}&rdquo;
              </span>
            </div>
          </div>

          {/* Status & Fallback Indicator */}
          <div className="text-right flex flex-col items-end">
            <span
              className={cn(
                "text-[10px] font-mono font-bold px-2 py-0.5 rounded-[var(--radius-xs)] border inline-flex items-center gap-1",
                isLive
                  ? "bg-[var(--status-success-subtle)] text-[var(--status-success-text)] border-[var(--status-success-border)]"
                  : isDegraded
                  ? "bg-[var(--status-warning-subtle)] text-[var(--status-warning-text)] border-[var(--status-warning-border)]"
                  : "bg-[var(--bg-raised)] text-[var(--fg-secondary)] border-[var(--border-subtle)]"
              )}
            >
              <span className={cn("w-1.5 h-1.5 rounded-full", isLive ? "bg-[var(--status-success)] animate-pulse" : "bg-[var(--status-warning)]")} />
              {module.status}
            </span>

            <span className="text-[9px] font-mono text-[var(--fg-tertiary)] mt-1">
              {module.fallbackStatus}
            </span>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-[var(--fg-secondary)] leading-relaxed mb-4">
          {module.description}
        </p>

        {/* Telemetry Grid */}
        <div className="grid grid-cols-3 gap-2 p-3 rounded-[var(--radius-md)] bg-[var(--bg-surface-alt)] border border-[var(--border-subtle)] text-xs font-mono mb-4">
          <div>
            <span className="text-[10px] text-[var(--fg-tertiary)] block">Avg Latency</span>
            <span className="font-bold text-[var(--fg-primary)]">
              {formatLatency(module.latencyMs)}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-[var(--fg-tertiary)] block">Total Executions</span>
            <span className="font-bold text-[var(--fg-primary)]">
              {module.totalRuns.toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-[var(--fg-tertiary)] block">Success Yield</span>
            <span className="font-bold text-[var(--status-success-text)]">
              {(module.successRate * 100).toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Key Signals */}
        <div className="space-y-1.5 text-xs font-mono mb-4">
          <span className="text-[10px] uppercase font-bold text-[var(--fg-tertiary)] block">
            Model Parameters & Signals
          </span>
          <div className="space-y-1">
            {module.signals.map((sig) => (
              <div key={sig.label} className="flex items-center justify-between py-1 border-b border-[var(--border-subtle)] last:border-0">
                <span className="text-[var(--fg-secondary)] text-[11px]">{sig.label}</span>
                <span className="font-semibold text-[var(--fg-primary)] text-[11px]">{sig.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Output Inspector CTA */}
      <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs">
        <span className="text-[10px] font-mono text-[var(--fg-tertiary)]">
          Structured Decision Output
        </span>
        {onInspectOutput && (
          <button
            onClick={() => onInspectOutput(module)}
            className="text-xs font-bold text-[var(--brand-primary)] hover:underline flex items-center gap-1"
          >
            Inspect Schema
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </motion.div>
  );
}
