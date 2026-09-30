"use client";

import React, { Suspense, useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMerchant } from "@/context/MerchantContext";
import { useToast } from "@/context/ToastContext";
import { getRecoveryCases, getRecoveryCase, getTransactions, getAudit, getDashboard } from "@/lib/api-services";
import { RecoveryCaseOut, AuditEventOut, DashboardResponse, PaginatedResponse, TransactionOut } from "@/types/api";
import { LoadingSpinner, ErrorState, EmptyState, SkeletonTable } from "@/components/ui-custom/FeedbackStates";
import { StatusBadge, ConfidenceBadge, PolicyDecisionBadge } from "@/components/ui-custom/StatusBadge";
import { CaseDetailDrawer } from "@/components/recovery/CaseDetailDrawer";
import { AnimatedNumber } from "@/components/ui-custom/AnimatedNumber";
import { formatCurrency, formatDateTime, formatRelativeTime, truncateId, cn } from "@/lib/utils";
import {
  ShieldAlert, Search, SlidersHorizontal, RefreshCw,
  Building2, BrainCircuit, ArrowUpRight, CheckCircle2,
  Filter, AlertTriangle, ArrowRight, Eye, Sparkles,
  TrendingUp, Clock, Zap, Percent
} from "lucide-react";
import {
  motion, AnimatePresence, useMotionValue,
  useSpring as useMotionSpring, Variants
} from "framer-motion";

/* ─────────────────────────────────────────────────────────────────────────────
   RecoveryCenterPage — PayRecover Financial Operations Console (/recovery)
   High-density command center for monitoring, inspecting, and authorizing
   autonomous revenue recovery interventions.
   ──────────────────────────────────────────────────────────────────────────── */

const SPRING_EASE = [0.16, 1, 0.3, 1] as const;

type PriorityFilter = "ALL" | "HIGH" | "MEDIUM" | "LOW" | "REVIEW" | "BLOCKED";

function mapFailureCategory(status?: string | null, errorCode?: string | null): string {
  const code = (errorCode || status || "").toLowerCase();
  if (code.includes("timeout") || code.includes("gateway")) return "Bank Gateway Latency Spike";
  if (code.includes("insufficient") || code.includes("balance")) return "Customer Balance Insufficient";
  if (code.includes("expired") || code.includes("intent")) return "UPI Intent Window Expired";
  if (code.includes("card") || code.includes("decline") || code.includes("honor")) return "Card Issuer Decline";
  if (code.includes("network") || code.includes("switch")) return "Inter-Bank Switch Failure";
  return "Transient Gateway Decline";
}

function mapRecommendedAction(status?: string | null, errorCode?: string | null, caseState?: string): string {
  if (caseState === "RECOVERED" || caseState === "CLOSED") return "Settlement Verified";
  if (caseState === "RECOVERY_WINDOW_EXPIRED") return "Fatigue Cap Enforced";
  const code = (errorCode || status || "").toLowerCase();
  if (code.includes("insufficient")) return "Balance-Refresh Retry (+4h)";
  if (code.includes("expired") || code.includes("intent")) return "UPI Intent FastPass Reroute";
  if (code.includes("card") || code.includes("decline")) return "Alternative Payment Link";
  return "Smart Exponential Retry (+180s)";
}

function getCaseFinancials(rc: RecoveryCaseOut, tx?: TransactionOut) {
  const amount = tx?.amount ?? null; // Only show real amounts from backend
  const failureCategory = mapFailureCategory(tx?.status, tx?.error_code);
  const recommendedAction = mapRecommendedAction(tx?.status, tx?.error_code, rc.state);
  // Only use real backend confidence; never synthesize a score from ID character codes
  const score = rc.confidence != null ? Math.round(rc.confidence * 100) : null;
  const probability = score != null ? (score / 100) * 0.98 : null;
  const policyStatus =
    rc.state === "RECOVERY_WINDOW_EXPIRED" ? "BLOCKED" :
    rc.state === "POLICY_CHECK" ? "REVIEW" : "APPROVED";

  const priority: "HIGH" | "MEDIUM" | "LOW" | null =
    score == null ? null : score >= 75 ? "HIGH" : score >= 45 ? "MEDIUM" : "LOW";

  return { amount, failureCategory, recommendedAction, score, probability, policyStatus, priority };
}

function RecoveryCenterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlCaseId = searchParams.get("caseId");
  const urlPriority = searchParams.get("priority");
  const urlState = searchParams.get("state");

  const { merchantId, isReady } = useMerchant();
  const { toast } = useToast();

  // Data states
  const [data, setData] = useState<PaginatedResponse<RecoveryCaseOut> | null>(null);
  const [txMap, setTxMap] = useState<Map<string, TransactionOut>>(new Map());
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [invalidCaseId, setInvalidCaseId] = useState<string | null>(null);

  // Pagination & Filtering
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [stateFilter, setStateFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("ALL");

  // Selected Drawer State
  const [selectedCase, setSelectedCase] = useState<RecoveryCaseOut | null>(null);
  const [auditEvents, setAuditEvents] = useState<AuditEventOut[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);

  // Synchronize URL query parameters with filter states
  useEffect(() => {
    if (urlPriority && ["ALL", "HIGH", "MEDIUM", "LOW", "REVIEW", "BLOCKED"].includes(urlPriority)) {
      setPriorityFilter(urlPriority as PriorityFilter);
    }
    if (urlState && ["ALL", "DETECTED", "ANALYZING", "PREDICTED", "DIAGNOSED", "PLANNED", "POLICY_CHECK", "RECOVERING", "RECOVERED", "RECOVERY_WINDOW_EXPIRED", "CLOSED"].includes(urlState)) {
      setStateFilter(urlState);
    }
  }, [urlPriority, urlState]);

  // Synchronize urlCaseId to automatically select case or show invalid ID alert
  useEffect(() => {
    if (!urlCaseId || !merchantId) {
      if (!urlCaseId && selectedCase) {
        setSelectedCase(null);
      }
      return;
    }

    if (data?.items && data.items.length > 0) {
      const match = data.items.find((c) => c.id === urlCaseId);
      if (match) {
        setSelectedCase(match);
        setInvalidCaseId(null);
        return;
      }
    }

    // Try fetching directly by ID if not in current page items
    getRecoveryCase(merchantId, urlCaseId)
      .then((singleCase) => {
        if (singleCase && singleCase.id) {
          setSelectedCase(singleCase);
          setInvalidCaseId(null);
        } else {
          setInvalidCaseId(urlCaseId);
          setSelectedCase(null);
        }
      })
      .catch(() => {
        setInvalidCaseId(urlCaseId);
        setSelectedCase(null);
      });
  }, [urlCaseId, data, merchantId]);

  // Handle case selection with URL sync
  const handleSelectCase = (rc: RecoveryCaseOut) => {
    setSelectedCase(rc);
    router.replace(`/recovery?caseId=${rc.id}`, { scroll: false });
  };

  const handleCloseDrawer = () => {
    setSelectedCase(null);
    router.replace("/recovery", { scroll: false });
  };

  const handleDismissInvalid = () => {
    setInvalidCaseId(null);
    router.replace("/recovery", { scroll: false });
  };

  // Fetch Cases and related Transactions
  const fetchCases = async (isManual = false) => {
    if (!merchantId) return;
    if (isManual) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const [casesRes, txRes, dashRes] = await Promise.all([
        getRecoveryCases(merchantId, page, 50),
        getTransactions(merchantId, page, 100).catch(() => ({ items: [] as TransactionOut[], total: 0 })),
        getDashboard(merchantId).catch(() => null),
      ]);

      setData(casesRes);
      if (txRes?.items) {
        const nextMap = new Map<string, TransactionOut>();
        txRes.items.forEach((t: TransactionOut) => nextMap.set(t.id, t));
        setTxMap(nextMap);
      }
      if (dashRes) setDashboardData(dashRes);

      if (isManual) {
        toast.success("Recovery Console Updated", "Latest recovery cases and probability scores loaded.");
      }
    } catch (err) {
      console.error("Failed to load recovery cases", err);
      setError(err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!isReady || !merchantId) return;
    fetchCases();
  }, [merchantId, isReady, page]);

  // Fetch Audit Trace for Selected Case
  useEffect(() => {
    if (!selectedCase || !merchantId) return;

    const fetchCaseAudit = async () => {
      setIsLoadingAudit(true);
      try {
        const result = await getAudit(merchantId, {
          recovery_case_id: selectedCase.id,
          size: 50,
        });
        setAuditEvents(
          (result.items || []).sort(
            (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          )
        );
      } catch (err) {
        console.error("Failed to fetch audit events for case", err);
      } finally {
        setIsLoadingAudit(false);
      }
    };

    fetchCaseAudit();
  }, [selectedCase, merchantId]);

  if (!merchantId) {
    return (
      <EmptyState
        title="Select a Merchant Workspace"
        description="Please select an active merchant workspace from the top header to access the Recovery Operations Console."
      />
    );
  }

  // Filter cases client-side
  const filteredCases = (data?.items || []).filter((item) => {
    const fin = getCaseFinancials(item, txMap.get(item.transaction_id));

    const matchesSearch =
      searchQuery === "" ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.transaction_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      fin.failureCategory.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesState =
      stateFilter === "ALL" || item.state === stateFilter;

    const matchesPriority =
      priorityFilter === "ALL" ||
      (priorityFilter === "HIGH" && fin.priority === "HIGH") ||
      (priorityFilter === "MEDIUM" && fin.priority === "MEDIUM") ||
      (priorityFilter === "LOW" && fin.priority === "LOW") ||
      (priorityFilter === "BLOCKED" && fin.policyStatus === "BLOCKED") ||
      (priorityFilter === "REVIEW" && fin.policyStatus === "REVIEW");

    return matchesSearch && matchesState && matchesPriority;
  });

  const totalCasesCount = data?.total || 0;
  const recoveredCount = dashboardData?.recovery?.cases_recovered || 0;
  const pendingCount = dashboardData?.recovery?.cases_pending || filteredCases.length;
  const recoveryRate = dashboardData?.recovery?.recovery_rate || 0;
  const atRiskAmount = dashboardData?.financial?.revenue_at_risk || 0;

  return (
    <div className="space-y-10 pb-20">
      {/* ──────────────────────────────────────────────────────────────────────────
          1. CONTROL ROOM EXECUTIVE HEADER
          ────────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[var(--border-subtle)]">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-xs)] text-[10px] font-mono font-bold tracking-[0.09em] uppercase"
              style={{
                background: "var(--brand-primary-muted)",
                border: "1px solid var(--brand-primary-ring)",
                color: "var(--brand-primary-light)",
              }}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              OPERATIONS CONSOLE
            </span>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-[var(--radius-xs)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] font-mono text-[11px] text-[var(--fg-secondary)]">
              <Building2 className="w-3 h-3 text-[var(--brand-primary)]" />
              <span>{truncateId(merchantId, 10)}</span>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--status-success-subtle)] text-[var(--status-success-text)] border border-[var(--status-success-border)]">
              AUTONOMOUS PIPELINE LIVE
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--fg-primary)] mt-2">
            Recovery Operations Center
          </h1>
          <p className="text-sm text-[var(--fg-secondary)] mt-1 max-w-2xl">
            Real-time transaction recovery queue, calibrated opportunity scoring, deterministic policy validation, and automated retry dispatch.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchCases(true)}
            disabled={isRefreshing}
            className="flex items-center gap-2 h-9 px-4 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-raised)] text-xs font-semibold text-[var(--fg-primary)] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin text-[var(--brand-primary)]")} />
            <span>{isRefreshing ? "Refreshing…" : "Sync Cases"}</span>
          </button>
          <Link
            href="/simulator"
            className="flex items-center gap-1.5 h-9 px-4 rounded-[var(--radius-md)] text-xs font-bold text-white transition-all"
            style={{ background: "var(--brand-primary)", boxShadow: "var(--glow-brand)" }}
          >
            Simulate Interventions
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────
          2. OPERATIONAL KPI STRIP (TiltCard + AnimatedNumber in INR)
          ────────────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: "Total Opportunities",
            value: totalCasesCount,
            formatType: "integer" as const,
            icon: ShieldAlert,
            color: "var(--brand-primary)",
            borderColor: "var(--brand-primary-ring)",
            desc: "Admitted to recovery pipeline",
          },
          {
            title: "Revenue at Risk",
            value: atRiskAmount,
            formatType: "currency" as const,
            icon: AlertTriangle,
            color: "var(--status-danger)",
            borderColor: "var(--status-danger-border)",
            desc: "Unsettled failed payments",
          },
          {
            title: "Successful Recoveries",
            value: recoveredCount,
            formatType: "integer" as const,
            icon: CheckCircle2,
            color: "var(--status-success)",
            borderColor: "var(--status-success-border)",
            desc: "Resolved with zero dispute flags",
          },
          {
            title: "Conversion Yield",
            value: recoveryRate,
            formatType: "percent" as const,
            icon: Percent,
            color: "var(--status-info)",
            borderColor: "var(--status-info-border)",
            desc: "Aggregate recovery success rate",
          },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.title}
              className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 sm:p-5 flex flex-col justify-between transition-colors hover:border-[var(--border-strong)]"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div
                    className="w-7 h-7 rounded-[var(--radius-sm)] flex items-center justify-center"
                    style={{
                      background: `color-mix(in srgb, ${kpi.color} 14%, transparent)`,
                      border: `1px solid color-mix(in srgb, ${kpi.color} 24%, transparent)`,
                    }}
                  >
                    <Icon className="w-3.5 h-3.5" style={{ color: kpi.color }} />
                  </div>
                  <span className="text-[10px] font-mono font-semibold text-[var(--status-success-text)] bg-[var(--status-success-subtle)] px-1.5 py-0.2 rounded">LIVE</span>
                </div>
                <div className="text-2xl font-bold font-mono text-[var(--fg-primary)] tabular-nums">
                  <AnimatedNumber value={kpi.value} formatType={kpi.formatType} currency="INR" />
                </div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--fg-tertiary)] mt-1">
                  {kpi.title}
                </div>
              </div>
              <p className="text-[11px] text-[var(--fg-secondary)] mt-2 pt-2 border-t border-[var(--border-subtle)] leading-relaxed">{kpi.desc}</p>
            </div>
          );
        })}
      </div>

      {/* Invalid Case ID Error Banner */}
      {invalidCaseId && (
        <div className="p-4 rounded-[var(--radius-lg)] bg-[var(--status-danger-subtle)] border border-[var(--status-danger-border)] text-[var(--status-danger-text)] text-xs flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-[var(--status-danger)] shrink-0" />
            <span>
              Recovery Case Not Found: No case record matches ID <strong className="font-mono">{invalidCaseId}</strong> for this merchant workspace.
            </span>
          </div>
          <button
            onClick={handleDismissInvalid}
            className="text-xs font-bold underline ml-4 hover:opacity-80"
          >
            Clear Filter
          </button>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          3. ADVANCED SEARCH & CONTROL FILTER BAR
          ────────────────────────────────────────────────────────────────────────── */}
      <div className="p-5 rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          {/* Search */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--fg-tertiary)] pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Case UUID, Transaction UUID, or root-cause…"
              className="w-full h-9 pl-9 pr-3 text-xs font-mono rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-surface-alt)] focus:bg-[var(--bg-surface)] focus:border-[var(--brand-primary)] outline-none text-[var(--fg-primary)] placeholder:text-[var(--fg-tertiary)] transition-colors"
            />
          </div>

          {/* State Filter */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="h-9 px-3 text-xs rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-surface-alt)] text-[var(--fg-primary)] font-semibold outline-none focus:border-[var(--brand-primary)] transition-colors"
            >
              <option value="ALL">All Lifecycle States</option>
              <option value="DETECTED">DETECTED</option>
              <option value="ANALYZING">ANALYZING</option>
              <option value="PREDICTED">PREDICTED</option>
              <option value="DIAGNOSED">DIAGNOSED</option>
              <option value="PLANNED">PLANNED</option>
              <option value="POLICY_CHECK">POLICY CHECK</option>
              <option value="RECOVERING">RECOVERING</option>
              <option value="RECOVERED">RECOVERED</option>
              <option value="RECOVERY_WINDOW_EXPIRED">EXPIRED</option>
              <option value="CLOSED">CLOSED</option>
            </select>
          </div>
        </div>

        {/* Priority Segmented Pills */}
        <div className="flex items-center justify-between pt-3 border-t border-[var(--border-subtle)] text-xs flex-wrap gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--fg-tertiary)] mr-1">
              Priority Segments:
            </span>
            {(
              [
                { id: "ALL", label: "All Cases" },
                { id: "HIGH", label: "High Yield (≥75%)" },
                { id: "MEDIUM", label: "Moderate (45-74%)" },
                { id: "LOW", label: "Low (<45%)" },
                { id: "REVIEW", label: "Human Review" },
                { id: "BLOCKED", label: "Policy Blocked" },
              ] as const
            ).map((p) => (
              <button
                key={p.id}
                onClick={() => setPriorityFilter(p.id)}
                className={cn(
                  "px-3 py-1 rounded-[var(--radius-xs)] text-xs font-medium transition-all",
                  priorityFilter === p.id
                    ? "bg-[var(--brand-primary)] text-white shadow-sm font-semibold"
                    : "bg-[var(--bg-raised)] text-[var(--fg-secondary)] hover:text-[var(--fg-primary)] hover:bg-[var(--bg-surface-alt)]"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          <span className="text-[11px] font-mono text-[var(--fg-tertiary)]">
            Showing <strong>{filteredCases.length}</strong> of {totalCasesCount} cases
          </span>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────
          4. MAIN RECOVERY CONSOLE TABLE (with mobile horizontal scroll safety)
          ────────────────────────────────────────────────────────────────────────── */}
      {isLoading && !data ? (
        <SkeletonTable rows={10} cols={8} />
      ) : error ? (
        <ErrorState error={error} retry={fetchCases} />
      ) : filteredCases.length === 0 ? (
        <EmptyState
          title="No recovery cases matched"
          description="Try adjusting your state filter, priority filter, or search query."
          action={
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setSearchQuery("");
                  setStateFilter("ALL");
                  setPriorityFilter("ALL");
                }}
                className="px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--bg-raised)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--fg-secondary)] hover:text-[var(--fg-primary)] transition-colors"
              >
                Reset Filters
              </button>
              <Link
                href="/simulator"
                className="px-3.5 py-1.5 rounded-[var(--radius-md)] text-xs font-bold text-white transition-all shadow-sm flex items-center gap-1.5"
                style={{ background: "var(--brand-primary)", boxShadow: "var(--glow-brand)" }}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Simulate a Failure Case →</span>
              </Link>
            </div>
          }
        />
      ) : (
        <div className="rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden shadow-[var(--shadow-sm)]">
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left text-xs border-collapse min-w-[780px]">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface-alt)]/60">
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--fg-tertiary)] first:pl-5">
                    Case & Transaction
                  </th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--fg-tertiary)] text-right">
                    Amount (₹)
                  </th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--fg-tertiary)]">
                    Failure Root Cause
                  </th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--fg-tertiary)]">
                    ML Probability
                  </th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--fg-tertiary)]">
                    Recommended Action
                  </th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--fg-tertiary)]">
                    Policy Gate
                  </th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--fg-tertiary)] text-right">
                    Lifecycle State
                  </th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--fg-tertiary)] text-right last:pr-5">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[var(--border-subtle)]">
                {filteredCases.map((rc) => {
                  const fin = getCaseFinancials(rc, txMap.get(rc.transaction_id));
                  const isSelected = selectedCase?.id === rc.id;

                  return (
                    <tr
                      key={rc.id}
                      onClick={() => handleSelectCase(rc)}
                      className={cn(
                        "cursor-pointer transition-colors duration-150 group",
                        isSelected
                          ? "bg-[var(--brand-primary-muted)]/50"
                          : "hover:bg-[var(--bg-raised)]"
                      )}
                    >
                      {/* Case ID */}
                      <td className="px-4 py-3.5 first:pl-5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-[var(--radius-sm)] flex items-center justify-center bg-[var(--bg-raised)] border border-[var(--border-subtle)] shrink-0">
                            <BrainCircuit className="w-3 h-3 text-[var(--brand-primary-light)]" />
                          </div>
                          <div>
                            <div className="font-mono font-bold text-[var(--fg-primary)] text-xs">
                              {truncateId(rc.id, 12)}
                            </div>
                            <div className="text-[10px] font-mono text-[var(--fg-tertiary)]">
                              tx: {truncateId(rc.transaction_id, 8)}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Amount in INR */}
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-xs text-[var(--fg-primary)]">
                        {fin.amount !== null ? formatCurrency(fin.amount, "INR") : "—"}
                      </td>

                      {/* Root Cause */}
                      <td className="px-4 py-3.5 text-[11px] text-[var(--fg-secondary)] max-w-[180px] truncate">
                        {fin.failureCategory}
                      </td>

                      {/* ML Probability Bar */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-14 h-1.5 rounded-full bg-[var(--bg-raised)] overflow-hidden">
                            {fin.score !== null && (
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${fin.score}%`,
                                  background: fin.score >= 75 ? "var(--status-success)" : fin.score >= 45 ? "var(--status-warning)" : "var(--status-danger)",
                                }}
                              />
                            )}
                          </div>
                          <span className="font-mono text-xs font-semibold text-[var(--fg-primary)]">
                            {fin.score !== null ? `${fin.score}%` : "—"}
                          </span>
                        </div>
                      </td>

                      {/* Recommended Action */}
                      <td className="px-4 py-3.5 text-[11px] font-medium text-[var(--fg-secondary)]">
                        {fin.recommendedAction}
                      </td>

                      {/* Policy Gate */}
                      <td className="px-4 py-3.5">
                        <PolicyDecisionBadge decision={fin.policyStatus} />
                      </td>

                      {/* State */}
                      <td className="px-4 py-3.5 text-right">
                        <StatusBadge
                          label={rc.state.replace(/_/g, " ")}
                          variant={
                            rc.state === "CLOSED" || rc.state === "RECOVERED"
                              ? "success"
                              : rc.state === "RECOVERING" || rc.state === "POLICY_CHECK"
                              ? "info"
                              : rc.state === "RECOVERY_WINDOW_EXPIRED"
                              ? "danger"
                              : "warning"
                          }
                          size="xs"
                          dot
                          mono
                        />
                      </td>

                      {/* Inspect Button */}
                      <td className="px-4 py-3.5 text-right last:pr-5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectCase(rc);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[var(--radius-xs)] bg-[var(--bg-surface-alt)] hover:bg-[var(--bg-raised)] text-[11px] font-semibold text-[var(--brand-primary)] border border-[var(--border-subtle)] transition-colors"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          5. CASE DETAIL DRAWER
          ────────────────────────────────────────────────────────────────────────── */}
      {selectedCase && (
        <CaseDetailDrawer
          selectedCase={selectedCase}
          onClose={handleCloseDrawer}
          auditEvents={auditEvents}
          isLoadingAudit={isLoadingAudit}
          currency="INR"
        />
      )}
    </div>
  );
}

export default function RecoveryCenterPage() {
  return (
    <Suspense fallback={<LoadingSpinner message="Calibrating Recovery Center Operations…" />}>
      <RecoveryCenterContent />
    </Suspense>
  );
}
