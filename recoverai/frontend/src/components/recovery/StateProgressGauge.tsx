"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Search, Activity, BrainCircuit, Map, ShieldCheck,
  Play, CheckCircle2, XCircle, Clock, AlertTriangle, UserCheck
} from "lucide-react";
import { CaseState } from "@/types/api";
import { activeNodePulse, transitions } from "@/lib/motion";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────────
   StateProgressGauge — RecoverAI Design System
   State Machine visualization tracking the formal case lifecycle:
   DETECTED → ANALYZING → PREDICTED → DIAGNOSED → PLANNED → POLICY_CHECK → RECOVERING → RECOVERED/CLOSED
   ──────────────────────────────────────────────────────────────────────────── */

export interface StateProgressGaugeProps {
  currentState: CaseState | string;
  className?: string;
}

const STATE_ORDER: { state: CaseState; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { state: "DETECTED",     label: "Detected",    icon: Search        },
  { state: "ANALYZING",    label: "Analyzing",   icon: Activity      },
  { state: "PREDICTED",    label: "Predicted",   icon: BrainCircuit  },
  { state: "DIAGNOSED",    label: "Diagnosed",   icon: Activity      },
  { state: "PLANNED",      label: "Planned",     icon: Map           },
  { state: "POLICY_CHECK", label: "Policy Check",icon: ShieldCheck   },
  { state: "RECOVERING",   label: "Recovering",  icon: Play          },
  { state: "RECOVERED",    label: "Recovered",   icon: CheckCircle2  },
];

function getStateIndex(state: string): number {
  const s = state.toUpperCase();
  if (s === "CLOSED" || s === "RECOVERED") return 7;
  if (s === "RECOVERY_WINDOW_EXPIRED" || s === "FAILED") return 6;
  const idx = STATE_ORDER.findIndex((item) => item.state === s);
  return idx !== -1 ? idx : 0;
}

export function StateProgressGauge({ currentState, className }: StateProgressGaugeProps) {
  const currentIdx = getStateIndex(currentState);
  const isTerminalSuccess = currentState === "RECOVERED" || currentState === "CLOSED";
  const isTerminalExpired = currentState === "RECOVERY_WINDOW_EXPIRED" || currentState === "FAILED";

  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface-alt)] p-4 shadow-[var(--shadow-xs)]",
        className
      )}
    >
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-[var(--fg-tertiary)]">
            Orchestration State Machine
          </span>
        </div>
        <span
          className={cn(
            "text-[10px] font-mono font-bold px-2 py-0.5 rounded-[var(--radius-xs)] border",
            isTerminalSuccess
              ? "bg-[var(--status-success-subtle)] text-[var(--status-success-text)] border-[var(--status-success-border)]"
              : isTerminalExpired
              ? "bg-[var(--status-danger-subtle)] text-[var(--status-danger-text)] border-[var(--status-danger-border)]"
              : "bg-[var(--brand-primary-muted)] text-[var(--brand-primary)] border-[var(--brand-primary-ring)]"
          )}
        >
          {String(currentState).replace(/_/g, " ")}
        </span>
      </div>

      {/* Progress Nodes Bar with Connecting Track */}
      <div className="grid grid-cols-8 gap-1 relative">
        {/* Continuous connector line behind nodes */}
        <div className="absolute left-[5%] right-[5%] top-[14px] h-[2px] bg-[var(--border-subtle)] -z-0" />
        
        {/* Dynamic completed progress fill */}
        <motion.div
          className="absolute left-[5%] top-[14px] h-[2px] bg-[var(--status-success)] -z-0"
          initial={false}
          animate={{
            width: `${Math.min(90, (currentIdx / 7) * 90)}%`,
          }}
          transition={transitions.emphasis}
        />

        {STATE_ORDER.map((item, idx) => {
          const isPassed = idx < currentIdx;
          const isCurrent = idx === currentIdx;
          const isFuture = idx > currentIdx;
          const Icon = item.icon;

          return (
            <div key={item.state} className="flex flex-col items-center text-center group relative z-10">
              {/* Step indicator node */}
              <div
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center border transition-all duration-200 bg-[var(--bg-surface)]",
                  isCurrent && !isTerminalExpired &&
                    "bg-[var(--brand-primary)] border-[var(--brand-primary)] text-white shadow-[var(--glow-brand)] scale-110",
                  isCurrent && isTerminalExpired &&
                    "bg-[var(--status-danger)] border-[var(--status-danger)] text-white shadow-[var(--glow-danger)]",
                  isPassed &&
                    "bg-[var(--status-success-subtle)] border-[var(--status-success-border)] text-[var(--status-success-text)]",
                  isFuture &&
                    "bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--fg-tertiary)]"
                )}
              >
                {isCurrent ? (
                  <motion.div
                    variants={activeNodePulse}
                    initial="idle"
                    animate="active"
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </motion.div>
                ) : isPassed ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <Icon className="w-3 h-3" />
                )}
              </div>

              {/* Label */}
              <span
                className={cn(
                  "text-[9px] font-mono font-medium truncate max-w-full mt-1.5 leading-tight",
                  isCurrent
                    ? "text-[var(--fg-primary)] font-bold"
                    : isPassed
                    ? "text-[var(--fg-secondary)]"
                    : "text-[var(--fg-tertiary)]"
                )}
              >
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
