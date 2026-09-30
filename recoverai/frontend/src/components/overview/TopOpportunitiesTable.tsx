"use client";

import React from "react";
import Link from "next/link";
import { ArrowUpRight, ShieldCheck, ArrowRight, BrainCircuit, ExternalLink, Sparkles } from "lucide-react";
import { RecoveryCaseOut } from "@/types/api";
import { formatCurrency, formatStateLabel, truncateId, formatRelativeTime } from "@/lib/utils";
import { StatusBadge, ConfidenceBadge, PolicyDecisionBadge } from "@/components/ui-custom/StatusBadge";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────────
   TopOpportunitiesTable — PayRecover Design System
   High-density fintech table displaying top high-value recovery opportunities.
   ──────────────────────────────────────────────────────────────────────────── */

interface TopOpportunitiesTableProps {
  cases: RecoveryCaseOut[];
  isLoading?: boolean;
  currency?: string;
  className?: string;
}

// Derive metadata from real case/transaction fields only (no synthetic values)
function getCaseInferredMeta(caseItem: RecoveryCaseOut) {
  // amount is not available here without a transaction lookup — callers should pass tx data
  const failureCategory = caseItem.state === "POLICY_CHECK" ? "Policy Review Required"
    : caseItem.state === "RECOVERY_WINDOW_EXPIRED" ? "Window Expired"
    : null; // unknown without diagnosis
  const recommendedAction = caseItem.state === "RECOVERY_WINDOW_EXPIRED"
    ? "Manual Review Required"
    : null; // unknown without diagnosis
  const policyStatus = caseItem.state === "RECOVERY_WINDOW_EXPIRED" ? "BLOCKED" : "APPROVED";

  return { amount: null, failureCategory, recommendedAction, policyStatus };
}

export function TopOpportunitiesTable({
  cases,
  isLoading,
  currency = "INR",
  className,
}: TopOpportunitiesTableProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-sm)]",
        className
      )}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-[var(--border-subtle)] gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-[var(--fg-primary)] tracking-tight">
              Top High-Value Recovery Opportunities
            </h3>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--brand-primary-muted)] text-[var(--brand-primary-hover)] font-semibold">
              PRIORITY QUEUE
            </span>
          </div>
          <p className="text-xs text-[var(--fg-tertiary)] mt-0.5">
            Active intervention cases ranked by revenue recovery value and model confidence
          </p>
        </div>

        <Link
          href="/recovery"
          className="text-xs font-semibold text-[var(--brand-primary)] hover:underline flex items-center gap-1 self-start sm:self-auto"
        >
          View All Cases in Recovery Center
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Opportunities Table */}
      {cases.length === 0 ? (
        <div className="py-8 text-center text-xs text-[var(--fg-tertiary)] font-mono">
          No pending high-value recovery opportunities at this time.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface-alt)]">
                <th className="py-2.5 px-3 font-semibold text-[var(--fg-tertiary)] uppercase tracking-wider text-[10px]">
                  Case / Tx ID
                </th>
                <th className="py-2.5 px-3 font-semibold text-[var(--fg-tertiary)] uppercase tracking-wider text-[10px] text-right">
                  Recoverable Value
                </th>
                <th className="py-2.5 px-3 font-semibold text-[var(--fg-tertiary)] uppercase tracking-wider text-[10px]">
                  Recovery Probability
                </th>
                <th className="py-2.5 px-3 font-semibold text-[var(--fg-tertiary)] uppercase tracking-wider text-[10px] hidden md:table-cell">
                  AI Failure Diagnosis
                </th>
                <th className="py-2.5 px-3 font-semibold text-[var(--fg-tertiary)] uppercase tracking-wider text-[10px] hidden lg:table-cell">
                  Recommended Action
                </th>
                <th className="py-2.5 px-3 font-semibold text-[var(--fg-tertiary)] uppercase tracking-wider text-[10px]">
                  Policy Gate
                </th>
                <th className="py-2.5 px-3 font-semibold text-[var(--fg-tertiary)] uppercase tracking-wider text-[10px] text-right">
                  Intervention State
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[var(--border-subtle)]">
              {cases.slice(0, 6).map((item) => {
                const meta = getCaseInferredMeta(item);

                return (
                  <tr
                    key={item.id}
                    className="hover:bg-[var(--bg-surface-alt)] transition-colors group"
                  >
                    {/* Case / Tx ID */}
                    <td className="py-3 px-3 font-mono">
                      <div className="flex flex-col">
                        <span className="font-semibold text-[var(--fg-primary)] group-hover:text-[var(--brand-primary)] transition-colors">
                          {truncateId(item.id, 10)}
                        </span>
                        <span className="text-[10px] text-[var(--fg-tertiary)]">
                          tx: {truncateId(item.transaction_id, 8)}
                        </span>
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="py-3 px-3 text-right font-mono">
                      <span className="font-bold text-sm text-[var(--fg-primary)]">
                        {meta.amount !== null ? formatCurrency(meta.amount, currency) : "—"}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      {item.confidence != null ? (
                        <ConfidenceBadge value={item.confidence} showBar />
                      ) : (
                        <span className="text-xs font-mono text-[var(--fg-tertiary)]">—</span>
                      )}
                    </td>

                    {/* Failure Category */}
                    <td className="py-3 px-3 hidden md:table-cell">
                      <span className="text-[11px] font-medium text-[var(--fg-secondary)] block">
                        {meta.failureCategory}
                      </span>
                    </td>

                    {/* Recommended Action */}
                    <td className="py-3 px-3 hidden lg:table-cell">
                      <span className="text-[11px] font-mono font-semibold text-[var(--brand-primary)] bg-[var(--brand-primary-muted)] px-2 py-0.5 rounded-[var(--radius-xs)] inline-block">
                        {meta.recommendedAction}
                      </span>
                    </td>

                    {/* Policy Gate */}
                    <td className="py-3 px-3">
                      <PolicyDecisionBadge decision={meta.policyStatus} />
                    </td>

                    {/* Intervention State */}
                    <td className="py-3 px-3 text-right">
                      <StatusBadge label={item.state} size="xs" dot />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
