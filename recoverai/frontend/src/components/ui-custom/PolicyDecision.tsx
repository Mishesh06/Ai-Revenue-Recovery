"use client";

import React from "react";
import { ShieldCheck, ShieldAlert, ShieldX, UserCheck, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { PolicyDecisionBadge } from "./StatusBadge";

/* ─────────────────────────────────────────────────────────────────────────────
   PolicyDecision — RecoverAI Design System
   Displays policy engine validation output, risk level, rules evaluated,
   and whether human-in-the-loop review was triggered.
   ──────────────────────────────────────────────────────────────────────────── */

interface PolicyDecisionProps {
  decision: "APPROVED" | "REVIEW" | "BLOCKED" | string;
  reasonCode?: string;
  reason?: string;
  riskLevel?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | string;
  requiresReview?: boolean;
  policyVersion?: string;
  className?: string;
}

export function PolicyDecision({
  decision,
  reasonCode,
  reason,
  riskLevel,
  requiresReview,
  policyVersion,
  className,
}: PolicyDecisionProps) {
  const isApproved = decision === "APPROVED";
  const isReview = decision === "REVIEW";
  const isBlocked = decision === "BLOCKED";

  const Icon = isApproved ? ShieldCheck : isReview ? ShieldAlert : ShieldX;
  const iconColor = isApproved
    ? "text-[var(--status-success)]"
    : isReview
    ? "text-[var(--status-warning)]"
    : "text-[var(--status-danger)]";

  const boxBg = isApproved
    ? "bg-[var(--status-success-subtle)] border-[var(--status-success-border)]"
    : isReview
    ? "bg-[var(--status-warning-subtle)] border-[var(--status-warning-border)]"
    : "bg-[var(--status-danger-subtle)] border-[var(--status-danger-border)]";

  return (
    <div
      className={cn(
        "rounded-[var(--radius-md)] border p-4 shadow-[var(--shadow-xs)]",
        boxBg,
        className
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className={cn("w-4 h-4", iconColor)} />
          <span className="text-xs font-semibold text-[var(--fg-primary)]">
            Policy Engine Evaluation
          </span>
        </div>
        <PolicyDecisionBadge decision={decision} />
      </div>

      <div className="space-y-2 text-xs">
        {reasonCode && (
          <div className="flex items-center justify-between">
            <span className="text-[var(--fg-tertiary)]">Reason Code</span>
            <span className="font-mono font-medium text-[var(--fg-primary)]">
              {reasonCode}
            </span>
          </div>
        )}

        {reason && (
          <div className="pt-1.5 border-t border-[var(--border-subtle)]/60 text-[var(--fg-secondary)] text-[11px]">
            {reason}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]/60">
          {riskLevel && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-[var(--fg-tertiary)]">Risk Level:</span>
              <span className={cn(
                "text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-[var(--radius-xs)]",
                riskLevel === "LOW" ? "bg-[var(--status-success-subtle)] text-[var(--status-success-text)] border border-[var(--status-success-border)]" :
                riskLevel === "MEDIUM" ? "bg-[var(--status-warning-subtle)] text-[var(--status-warning-text)] border border-[var(--status-warning-border)]" :
                "bg-[var(--status-danger-subtle)] text-[var(--status-danger-text)] border border-[var(--status-danger-border)]"
              )}>
                {riskLevel}
              </span>
            </div>
          )}

          {requiresReview && (
            <div className="flex items-center gap-1 text-[10px] font-medium text-[var(--status-warning-text)]">
              <UserCheck className="w-3 h-3" />
              <span>Escalated to Review</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
