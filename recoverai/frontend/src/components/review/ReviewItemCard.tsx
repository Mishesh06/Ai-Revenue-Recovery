"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  ShieldAlert, UserCheck, AlertTriangle, BrainCircuit,
  Lock, ArrowRight, CheckCircle2, XCircle, Copy, CheckCheck,
  Sparkles, Clock, Eye
} from "lucide-react";
import { ReviewItemExtended } from "./ReviewDecisionModal";
import { ConfidenceBadge, StatusBadge, PolicyDecisionBadge } from "@/components/ui-custom/StatusBadge";
import { formatCurrency, formatDateTime, formatRelativeTime, truncateId, cn } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";

/* ─────────────────────────────────────────────────────────────────────────────
   ReviewItemCard — PayRecover Design System
   High-density exception item card with clear justification and deliberate decision trigger.
   ──────────────────────────────────────────────────────────────────────────── */

interface ReviewItemCardProps {
  review: ReviewItemExtended;
  onInspect: (review: ReviewItemExtended) => void;
  className?: string;
}

export function ReviewItemCard({
  review,
  onInspect,
  className,
}: ReviewItemCardProps) {
  const { toast } = useToast();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (e: React.MouseEvent, text: string, label: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    toast.success("Copied to clipboard", `${label}: ${truncateId(text, 12)}`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const amount = review.amount || 24990;
  const whyReview =
    review.why_human_review ||
    review.reason ||
    "Payment gateway timed out during execution. Blind retries were blocked by policy to prevent duplicate charging.";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className={cn(
        "p-4 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-[var(--shadow-sm)] hover:border-[var(--border-default)] transition-all duration-[var(--duration-fast)] space-y-3",
        className
      )}
    >
      {/* Top row: Case/Tx + Amount + Risk Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-[var(--radius-md)] bg-[var(--status-warning-subtle)] border border-[var(--status-warning-border)] flex items-center justify-center text-[var(--status-warning)] flex-shrink-0">
            <UserCheck className="w-4 h-4" />
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="font-bold text-[var(--fg-primary)]">
                Review #{truncateId(review.id, 8)}
              </span>
              <button
                onClick={(e) => handleCopy(e, review.id, "Review ID")}
                className="text-[var(--fg-tertiary)] hover:text-[var(--fg-primary)]"
                title="Copy Review UUID"
              >
                {copiedKey === "Review ID" ? <CheckCheck className="w-3 h-3 text-[var(--status-success)]" /> : <Copy className="w-3 h-3" />}
              </button>
              <span className="text-[var(--border-strong)]">·</span>
              <span className="text-[var(--fg-tertiary)]">
                case: {truncateId(review.recovery_case_id, 8)}
              </span>
            </div>

            <span className="text-[10px] font-mono text-[var(--fg-tertiary)] mt-0.5">
              Escalated {formatRelativeTime(review.created_at)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          <div className="text-right">
            <span className="text-[10px] text-[var(--fg-tertiary)] block font-mono">At-Risk Value</span>
            <span className="text-base font-bold font-mono text-[var(--fg-primary)]">
              {formatCurrency(amount)}
            </span>
          </div>

          <span
            className={cn(
              "text-[10px] font-mono font-bold px-2 py-0.5 rounded-[var(--radius-xs)] border shrink-0",
              review.risk_level === "HIGH" || review.risk_level === "CRITICAL"
                ? "bg-[var(--status-danger-subtle)] text-[var(--status-danger-text)] border-[var(--status-danger-border)]"
                : "bg-[var(--status-warning-subtle)] text-[var(--status-warning-text)] border-[var(--status-warning-border)]"
            )}
          >
            {review.risk_level || "MEDIUM"} RISK
          </span>
        </div>
      </div>

      {/* Middle row: Why Human Review justification box */}
      <div className="p-3 rounded-[var(--radius-md)] bg-[var(--bg-surface-alt)] border border-[var(--border-subtle)] flex items-start gap-2.5 text-xs">
        <AlertTriangle className="w-4 h-4 text-[var(--status-warning)] flex-shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <span className="font-bold text-[var(--fg-primary)] text-[11px] block">
            Why Human Review is Required:
          </span>
          <p className="text-[11px] text-[var(--fg-secondary)] leading-relaxed mt-0.5">
            {whyReview}
          </p>
        </div>
      </div>

      {/* Bottom metadata strip & CTA */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs font-mono">
        <div>
          <span className="text-[10px] text-[var(--fg-tertiary)] block">ML Probability</span>
          <span className="font-bold text-[var(--brand-primary)]">
            {((review.recovery_probability || 0.78) * 100).toFixed(0)}%
          </span>
        </div>

        <div>
          <span className="text-[10px] text-[var(--fg-tertiary)] block">Reason Code</span>
          <span className="font-semibold text-[var(--fg-secondary)] truncate block">
            {review.reason_code || "UNKNOWN_TIMEOUT"}
          </span>
        </div>

        <div>
          <span className="text-[10px] text-[var(--fg-tertiary)] block">Proposed Action</span>
          <span className="font-semibold text-[var(--status-info-text)] truncate block">
            {review.recommended_action || "Smart Retry (+4m)"}
          </span>
        </div>

        <div className="flex items-center justify-end col-span-2 sm:col-span-1">
          <button
            onClick={() => onInspect(review)}
            className="w-full sm:w-auto px-3.5 py-1.5 rounded-[var(--radius-md)] bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-[var(--shadow-xs)] cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            Inspect & Decide
          </button>
        </div>
      </div>
    </motion.div>
  );
}
