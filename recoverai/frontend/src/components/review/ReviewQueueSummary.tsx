"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  ShieldAlert, UserCheck, AlertTriangle, BrainCircuit,
  Lock, Clock, CheckCircle2, Shield
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────────
   ReviewQueueSummary — RecoverAI Human-in-the-Loop Architecture
   Communicates: "AI handles routine recovery. Humans handle exceptions."
   ──────────────────────────────────────────────────────────────────────────── */

export type ReviewCategory = "ALL" | "HIGH_RISK" | "UNKNOWN_OUTCOMES" | "LOW_CONFIDENCE";

interface ReviewQueueSummaryProps {
  totalPending: number;
  highRiskCount: number;
  unknownOutcomeCount: number;
  lowConfidenceCount: number;
  selectedCategory: ReviewCategory;
  onSelectCategory: (cat: ReviewCategory) => void;
  className?: string;
}

export function ReviewQueueSummary({
  totalPending,
  highRiskCount,
  unknownOutcomeCount,
  lowConfidenceCount,
  selectedCategory,
  onSelectCategory,
  className,
}: ReviewQueueSummaryProps) {
  const tabs: { id: ReviewCategory; label: string; count: number; icon: React.ComponentType<{ className?: string }>; color: string }[] = [
    { id: "ALL",              label: "All Pending Reviews", count: totalPending,           icon: UserCheck,     color: "text-[var(--brand-primary)]" },
    { id: "HIGH_RISK",        label: "High Risk",           count: highRiskCount,          icon: ShieldAlert,   color: "text-[var(--status-danger)]" },
    { id: "UNKNOWN_OUTCOMES", label: "Unknown Outcomes",    count: unknownOutcomeCount,    icon: Lock,          color: "text-[var(--status-warning)]" },
    { id: "LOW_CONFIDENCE",   label: "Low Confidence",      count: lowConfidenceCount,     icon: BrainCircuit,  color: "text-[var(--status-info)]" },
  ];

  return (
    <div className={cn("space-y-4", className)}>
      {/* Philosophy Banner */}
      <div className="p-4 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-[var(--shadow-sm)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-8 h-8 rounded-[var(--radius-md)] bg-[var(--brand-primary-muted)] flex items-center justify-center text-[var(--brand-primary)] flex-shrink-0">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[var(--fg-primary)] tracking-tight">
              Controlled AI Autonomy & Operator Governance
            </h3>
            <p className="text-[11px] text-[var(--fg-secondary)] mt-0.5">
              <span className="font-semibold text-[var(--brand-primary)]">AI handles routine recovery.</span>{" "}
              <span className="font-semibold text-[var(--fg-primary)]">Humans handle exceptions.</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-[var(--fg-tertiary)] bg-[var(--bg-surface-alt)] px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--border-subtle)] self-start sm:self-auto">
          <Clock className="w-3.5 h-3.5" />
          <span>SLA Target: &lt; 15 mins</span>
        </div>
      </div>

      {/* 4 Category Tabs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tabs.map((tab) => {
          const isSelected = selectedCategory === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => onSelectCategory(tab.id)}
              className={cn(
                "p-3.5 rounded-[var(--radius-md)] border text-left flex flex-col justify-between transition-all duration-[var(--duration-fast)] relative group",
                isSelected
                  ? "bg-[var(--brand-primary-muted)] border-[var(--brand-primary)] shadow-[var(--shadow-sm)] ring-1 ring-[var(--brand-primary)]"
                  : "bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--border-default)] hover:bg-[var(--bg-surface-alt)]"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium text-[var(--fg-secondary)] group-hover:text-[var(--fg-primary)]">
                  {tab.label}
                </span>
                <Icon className={cn("w-3.5 h-3.5", tab.color)} />
              </div>

              <div className="flex items-baseline gap-1">
                <span className={cn("text-xl font-bold font-mono", isSelected ? "text-[var(--brand-primary-hover)]" : "text-[var(--fg-primary)]")}>
                  {tab.count}
                </span>
                <span className="text-[10px] text-[var(--fg-tertiary)] font-mono">
                  cases
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
