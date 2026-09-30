"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  ShieldAlert, Lock, AlertTriangle, UserCheck,
  CheckCircle2, ArrowRight, XCircle, ShieldCheck,
  Clock, RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────────
   IdempotencyFailoverBanner — PayRecover Safety Architecture (Scenario C)
   Demonstrates: "PayRecover did NOT blindly retry."
   Visualizes safe failover, idempotency reservation, and human review escalation.
   ──────────────────────────────────────────────────────────────────────────── */

interface IdempotencyFailoverBannerProps {
  caseId?: string | null;
  correlationId?: string | null;
  className?: string;
}

export function IdempotencyFailoverBanner({
  caseId,
  correlationId,
  className,
}: IdempotencyFailoverBannerProps) {
  const progressionSteps = [
    { label: "EXECUTING", status: "passed" },
    { label: "TIMEOUT", status: "timeout" },
    { label: "UNKNOWN", status: "warning" },
    { label: "OUTCOME UNKNOWN", status: "danger" },
    { label: "MANUAL REVIEW", status: "active" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={cn(
        "rounded-[var(--radius-lg)] border-2 border-[var(--status-danger-border)] bg-[var(--status-danger-subtle)]/40 p-5 shadow-[var(--shadow-md)] relative overflow-hidden",
        className
      )}
    >
      {/* Background watermark badge */}
      <div className="absolute -right-6 -bottom-6 opacity-5 pointer-events-none">
        <Lock className="w-48 h-48 text-[var(--status-danger)]" />
      </div>

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-[var(--status-danger-border)]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[var(--status-danger)] flex items-center justify-center text-white shadow-[var(--glow-danger)] flex-shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[var(--status-danger-text)] tracking-tight">
                Critical Safety Gate: PayRecover did NOT blindly retry
              </h3>
              <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--status-danger)] text-white">
                IDEMPOTENCY ENFORCED
              </span>
            </div>
            <p className="text-xs text-[var(--fg-secondary)] mt-0.5">
              Gateway adapter timed out. Automated blind retries were blocked to prevent double-charging the customer.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-[var(--status-danger-text)] font-semibold shrink-0">
          <Clock className="w-3.5 h-3.5" />
          <span>Execution Halted</span>
        </div>
      </div>

      {/* 5-Step Failover Sequence */}
      <div className="mb-5 p-3 rounded-[var(--radius-md)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-[var(--shadow-xs)]">
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--fg-tertiary)] block mb-2">
          Safety Failover State Progression
        </span>

        <div className="flex items-center justify-between flex-wrap gap-1">
          {progressionSteps.map((step, idx) => {
            const isLast = idx === progressionSteps.length - 1;

            return (
              <React.Fragment key={step.label}>
                <div className="flex items-center gap-1.5">
                  <div
                    className={cn(
                      "px-2 py-1 rounded-[var(--radius-xs)] font-mono text-[10px] font-bold border",
                      step.status === "passed"
                        ? "bg-[var(--bg-raised)] text-[var(--fg-secondary)] border-[var(--border-subtle)]"
                        : step.status === "timeout"
                        ? "bg-[var(--status-warning-subtle)] text-[var(--status-warning-text)] border-[var(--status-warning-border)]"
                        : step.status === "danger"
                        ? "bg-[var(--status-danger-subtle)] text-[var(--status-danger-text)] border-[var(--status-danger-border)]"
                        : "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)] shadow-[var(--glow-brand)]"
                    )}
                  >
                    {step.label}
                  </div>
                </div>

                {!isLast && (
                  <ArrowRight className="w-3 h-3 text-[var(--border-strong)] flex-shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* 4 Safety & Idempotency Pillars Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        {/* Pillar 1 */}
        <div className="p-3 rounded-[var(--radius-md)] bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
          <span className="text-[10px] font-mono text-[var(--fg-tertiary)] uppercase block">1. Idempotency State</span>
          <div className="flex items-center gap-1.5 mt-1">
            <Lock className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
            <span className="font-mono font-bold text-[var(--fg-primary)]">Key Reserved</span>
          </div>
          <span className="text-[10px] font-mono text-[var(--fg-tertiary)] truncate block mt-0.5">
            {correlationId ? `trace: ${correlationId.slice(0, 12)}…` : "Locked in DB"}
          </span>
        </div>

        {/* Pillar 2 */}
        <div className="p-3 rounded-[var(--radius-md)] bg-[var(--bg-surface)] border border-[var(--status-danger-border)] bg-[var(--status-danger-subtle)]/30">
          <span className="text-[10px] font-mono text-[var(--status-danger-text)] uppercase block font-semibold">2. Auto-Retry Status</span>
          <div className="flex items-center gap-1.5 mt-1">
            <XCircle className="w-3.5 h-3.5 text-[var(--status-danger)]" />
            <span className="font-mono font-bold text-[var(--status-danger-text)]">BLOCKED</span>
          </div>
          <span className="text-[10px] text-[var(--status-danger-text)]/80 block mt-0.5">
            Zero duplicate charges
          </span>
        </div>

        {/* Pillar 3 */}
        <div className="p-3 rounded-[var(--radius-md)] bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
          <span className="text-[10px] font-mono text-[var(--fg-tertiary)] uppercase block">3. Failure Cause</span>
          <div className="flex items-center gap-1.5 mt-1">
            <AlertTriangle className="w-3.5 h-3.5 text-[var(--status-warning)]" />
            <span className="font-mono font-bold text-[var(--fg-primary)]">Outcome Unknown</span>
          </div>
          <span className="text-[10px] text-[var(--fg-tertiary)] block mt-0.5">
            Gateway read timeout
          </span>
        </div>

        {/* Pillar 4 */}
        <div className="p-3 rounded-[var(--radius-md)] bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
          <span className="text-[10px] font-mono text-[var(--fg-tertiary)] uppercase block">4. Escalation Path</span>
          <div className="flex items-center gap-1.5 mt-1">
            <UserCheck className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
            <span className="font-mono font-bold text-[var(--brand-primary-hover)]">Human Review</span>
          </div>
          <span className="text-[10px] text-[var(--fg-tertiary)] block mt-0.5">
            Review case created
          </span>
        </div>
      </div>
    </motion.div>
  );
}
