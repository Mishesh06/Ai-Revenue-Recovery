"use client";

import React, { useEffect, useState, useCallback, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMerchant } from "@/context/MerchantContext";
import { useToast } from "@/context/ToastContext";
import { getDashboard, getRecoveryCases, getTransactions } from "@/lib/api-services";
import { DashboardResponse, RecoveryCaseOut, TransactionOut } from "@/types/api";
import { LoadingSpinner, ErrorState, EmptyState } from "@/components/ui-custom/FeedbackStates";
import { StatusBadge } from "@/components/ui-custom/StatusBadge";
import { AnimatedNumber } from "@/components/ui-custom/AnimatedNumber";
import { formatCurrency, formatPercent, formatRelativeTime, truncateId, cn } from "@/lib/utils";
import {
  BrainCircuit, TrendingUp, ShieldAlert, Activity,
  Building2, RefreshCw, Layers, ArrowUpRight, Zap,
  CheckCircle2, AlertTriangle, Sparkles, PieChart,
  ArrowRight, ShieldCheck, Percent, HelpCircle,
  SlidersHorizontal, ChevronRight, BarChart3, Play,
  Copy, Check, CreditCard, ExternalLink
} from "lucide-react";
import {
  motion, AnimatePresence, useMotionValue,
  useSpring as useMotionSpring, Variants
} from "framer-motion";

/* ─────────────────────────────────────────────────────────────────────────────
   IntelligencePage — PayRecover Revenue Intelligence & Root-Cause Attribution
   Interactive ML predictions, failure categorization, bank issuer performance matrix,
   and calibrated recovery opportunity scoring.
   Connected to real backend recovery cases, transactions, and dashboard models.
   ──────────────────────────────────────────────────────────────────────────── */

const SPRING_EASE = [0.16, 1, 0.3, 1] as const;

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24, filter: "blur(4px)" },
  visible: (i: number = 0) => ({
    opacity: 1, y: 0, filter: "blur(0px)",
    transition: { duration: 0.5, ease: SPRING_EASE, delay: i * 0.07 }
  }),
};

function caseVariant(state: string): "success" | "info" | "warning" | "danger" | "neutral" {
  const s = state.toUpperCase();
  if (s === "CLOSED" || s === "RECOVERED") return "success";
  if (s === "RECOVERING" || s === "EXECUTING") return "info";
  if (s === "DETECTED" || s === "ANALYZING") return "warning";
  if (s === "RECOVERY_WINDOW_EXPIRED" || s === "FAILED") return "danger";
  return "neutral";
}

function IntelligenceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlTier = searchParams.get("tier");

  const { merchantId, isReady } = useMerchant();
  const { toast } = useToast();

  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [cases, setCases] = useState<RecoveryCaseOut[]>([]);
  const [transactions, setTransactions] = useState<TransactionOut[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<unknown>(null);
  // NOTE: selectedIssuer state removed — bank issuer matrix has no backend endpoint.
  const [confidenceTab, setConfidenceTab] = useState<"ALL" | "HIGH" | "MEDIUM" | "LOW">("HIGH");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Sync URL query tier parameter
  useEffect(() => {
    if (urlTier && ["ALL", "HIGH", "MEDIUM", "LOW"].includes(urlTier.toUpperCase())) {
      setConfidenceTab(urlTier.toUpperCase() as "ALL" | "HIGH" | "MEDIUM" | "LOW");
    }
  }, [urlTier]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(label);
    toast.success("Copied to clipboard", `${label}: ${truncateId(text, 12)}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const fetchIntelligence = async (isManual = false) => {
    if (!merchantId) return;
    if (isManual) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const [dashRes, casesRes, txRes] = await Promise.all([
        getDashboard(merchantId),
        getRecoveryCases(merchantId, 1, 50).catch(() => ({ items: [], total: 0, page: 1, size: 50, pages: 1 })),
        getTransactions(merchantId, 1, 50).catch(() => ({ items: [], total: 0, page: 1, size: 50, pages: 1 })),
      ]);

      setDashboard(dashRes);
      setCases(casesRes.items || []);
      setTransactions(txRes.items || []);

      if (isManual) {
        toast.success("Intelligence Updated", "Latest failure attribution and opportunity models loaded.");
      }
    } catch (err) {
      console.error("Failed to load revenue intelligence", err);
      setError(err);
      if (isManual) {
        toast.error("Update Failed", String(err));
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!isReady || !merchantId) return;
    fetchIntelligence();
  }, [merchantId, isReady]);

  if (!merchantId) {
    return (
      <div className="py-16">
        <EmptyState
          title="Select a Merchant Workspace"
          description="Please select an active merchant workspace from the top header to view revenue intelligence."
        />
      </div>
    );
  }

  if (isLoading && !dashboard) {
    return (
      <div className="py-24">
        <LoadingSpinner message="Calibrating Revenue Intelligence & Root-Cause Taxonomies…" />
      </div>
    );
  }

  if (error && !dashboard) {
    return (
      <div className="py-16">
        <ErrorState error={error} retry={() => fetchIntelligence()} />
      </div>
    );
  }

  if (!dashboard) return <EmptyState />;

  const { financial, recovery, leak_map } = dashboard;
  const currency = "INR";

  const atRisk = financial.revenue_at_risk || 0;
  const recovered = financial.total_recovered_amount || 0;
  const recoveryRate = recovery.recovery_rate || 0;
  const netImpact = financial.net_revenue_impact || 0;

  // Map transactions by ID for fast lookup
  const txMap = new Map<string, TransactionOut>(transactions.map((t) => [t.id, t]));

  // Deduplicate cases by ID to guarantee unique records
  const uniqueCases = Array.from(new Map(cases.map((c) => [c.id, c])).values());

  // Prioritize active, actionable recovery cases
  const activeCases = uniqueCases.filter(
    (c) => c.state !== "CLOSED" && c.state !== "RECOVERY_WINDOW_EXPIRED"
  );
  const baseCases = activeCases.length > 0 ? activeCases : uniqueCases;

  // Tier counts
  const highCases = baseCases.filter((c) => (c.confidence ?? 0.8) >= 0.8);
  const mediumCases = baseCases.filter(
    (c) => (c.confidence ?? 0.8) >= 0.5 && (c.confidence ?? 0.8) < 0.8
  );
  const lowCases = baseCases.filter((c) => (c.confidence ?? 0.8) < 0.5);

  // Filter cases based on confidence tab
  const filteredCases =
    confidenceTab === "HIGH"
      ? highCases
      : confidenceTab === "MEDIUM"
      ? mediumCases
      : confidenceTab === "LOW"
      ? lowCases
      : baseCases;

  // Real Failure Categories calculated from leak_map
  const failedTotal = leak_map.failed || 1;
  const tempPct = Math.round(((leak_map.temporary_failure || 0) / failedTotal) * 100);
  const expiredPct = Math.round(((leak_map.expired_card || 0) / failedTotal) * 100);
  const otherPct = Math.max(0, 100 - tempPct - expiredPct);

  // Only build failure attribution when we have real data from the backend leak_map
  const hasLeakData = (leak_map.temporary_failure || 0) + (leak_map.expired_card || 0) + (leak_map.other_failure || 0) > 0;

  const failureAttribution = hasLeakData ? [
    {
      category: "Bank Gateway Latency Spike",
      percent: tempPct,
      impact: leak_map.temporary_failure || 0,
      recRate: null, // No recovery yield rate endpoint available
      color: "var(--brand-primary)",
      desc: "Transient network timeouts between card networks and issuing core",
    },
    {
      category: "Card Token / 3DS Authentication Drop",
      percent: expiredPct,
      impact: leak_map.expired_card || 0,
      recRate: null,
      color: "var(--status-danger)",
      desc: "Expired tokens or customer verification drop-offs at SMS OTP step",
    },
    {
      category: "Insufficient Balance / Customer Refusal",
      percent: otherPct,
      impact: leak_map.other_failure || 0,
      recRate: null,
      color: "var(--status-warning)",
      desc: "Account limit reached or customer bank block requiring notification nudge",
    },
  ] : [];

  // Bank Issuer Matrix — no dedicated backend endpoint available.
  // Will render an unavailable state below.

  return (
    <div className="space-y-10 pb-20">
      {/* ──────────────────────────────────────────────────────────────────────────
          1. EXECUTIVE HEADER
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
              <Sparkles className="w-3 h-3" />
              AI ROOT-CAUSE TAXONOMY
            </span>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-[var(--radius-xs)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] font-mono text-[11px] text-[var(--fg-secondary)]">
              <Building2 className="w-3 h-3 text-[var(--brand-primary)]" />
              <span>{truncateId(merchantId, 10)}</span>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--status-success-subtle)] text-[var(--status-success-text)] border border-[var(--status-success-border)]">
              {uniqueCases.length} Cases Monitored
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--fg-primary)] mt-2">
            Revenue Intelligence & Failure Attribution
          </h1>
          <p className="text-sm text-[var(--fg-secondary)] mt-1 max-w-2xl">
            Macro analysis of cashflow leakage, bank issuer downtime patterns, and calibrated machine learning recovery opportunity scoring.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchIntelligence(true)}
            disabled={isRefreshing}
            className="flex items-center gap-2 h-9 px-4 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-raised)] text-xs font-semibold text-[var(--fg-primary)] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin text-[var(--brand-primary)]")} />
            <span>{isRefreshing ? "Synchronising…" : "Sync Intelligence"}</span>
          </button>
          <Link
            href="/recovery?priority=HIGH"
            className="flex items-center gap-1.5 h-9 px-4 rounded-[var(--radius-md)] text-xs font-bold text-white transition-all shadow-sm"
            style={{ background: "var(--brand-primary)", boxShadow: "var(--glow-brand)" }}
          >
            Inspect Active Cases
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────
          2. KPI STRIP (TiltCard + AnimatedNumber in INR)
          ────────────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: "Revenue at Risk",
            value: atRisk,
            formatType: "currency" as const,
            icon: AlertTriangle,
            color: "var(--status-danger)",
            borderColor: "var(--status-danger-border)",
            desc: "Gross failed volume within retry window",
          },
          {
            title: "Autonomous Recovery Yield",
            value: recoveryRate,
            formatType: "percent" as const,
            icon: CheckCircle2,
            color: "var(--status-success)",
            borderColor: "var(--status-success-border)",
            desc: "Success conversion across retry pipelines",
          },
          {
            title: "Recovered Capital",
            value: recovered,
            formatType: "currency" as const,
            icon: TrendingUp,
            color: "var(--brand-primary)",
            borderColor: "var(--brand-primary-ring)",
            desc: "Settled directly to merchant ledger",
          },
          {
            title: "Net Financial Impact",
            value: netImpact,
            formatType: "currency" as const,
            icon: Zap,
            color: "var(--status-info)",
            borderColor: "var(--status-info-border)",
            desc: "Net recovered value post processor fees",
          },
        ].map((kpi, idx) => {
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

      {/* ──────────────────────────────────────────────────────────────────────────
          3. ML OPPORTUNITY CONFIDENCE TIERS
          ────────────────────────────────────────────────────────────────────────── */}
      <div className="rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--border-subtle)]">
          <div>
            <span className="text-[10px] font-mono font-bold tracking-[0.1em] uppercase text-[var(--brand-primary)]">
              CALIBRATED INFERENCE ENGINE
            </span>
            <h2 className="text-lg font-bold text-[var(--fg-primary)] tracking-tight mt-0.5">
              Recovery Opportunity Confidence Tiers
            </h2>
          </div>
          <div className="flex items-center gap-1.5 p-1 rounded-[var(--radius-md)] bg-[var(--bg-raised)] border border-[var(--border-subtle)] flex-wrap">
            <button
              onClick={() => setConfidenceTab("HIGH")}
              className={cn(
                "px-3 py-1 rounded-[var(--radius-sm)] text-[11px] font-mono font-bold transition-all flex items-center gap-1",
                confidenceTab === "HIGH"
                  ? "bg-[var(--brand-primary)] text-white shadow-sm"
                  : "text-[var(--fg-tertiary)] hover:text-[var(--fg-primary)]"
              )}
            >
              <span>80-100% High</span>
              <span className="opacity-80 text-[10px]">({highCases.length})</span>
            </button>
            <button
              onClick={() => setConfidenceTab("MEDIUM")}
              className={cn(
                "px-3 py-1 rounded-[var(--radius-sm)] text-[11px] font-mono font-bold transition-all flex items-center gap-1",
                confidenceTab === "MEDIUM"
                  ? "bg-[var(--brand-primary)] text-white shadow-sm"
                  : "text-[var(--fg-tertiary)] hover:text-[var(--fg-primary)]"
              )}
            >
              <span>50-80% Moderate</span>
              <span className="opacity-80 text-[10px]">({mediumCases.length})</span>
            </button>
            <button
              onClick={() => setConfidenceTab("LOW")}
              className={cn(
                "px-3 py-1 rounded-[var(--radius-sm)] text-[11px] font-mono font-bold transition-all flex items-center gap-1",
                confidenceTab === "LOW"
                  ? "bg-[var(--brand-primary)] text-white shadow-sm"
                  : "text-[var(--fg-tertiary)] hover:text-[var(--fg-primary)]"
              )}
            >
              <span>&lt;50% Exception</span>
              <span className="opacity-80 text-[10px]">({lowCases.length})</span>
            </button>
            <button
              onClick={() => setConfidenceTab("ALL")}
              className={cn(
                "px-3 py-1 rounded-[var(--radius-sm)] text-[11px] font-mono font-bold transition-all flex items-center gap-1",
                confidenceTab === "ALL"
                  ? "bg-[var(--brand-primary)] text-white shadow-sm"
                  : "text-[var(--fg-tertiary)] hover:text-[var(--fg-primary)]"
              )}
            >
              <span>All Tiers</span>
              <span className="opacity-80 text-[10px]">({baseCases.length})</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-[var(--radius-lg)] bg-[var(--bg-surface-alt)] border border-[var(--border-subtle)]">
            <span className="text-[10px] font-mono text-[var(--brand-primary)] font-bold uppercase">Pipeline Strategy</span>
            <h4 className="text-sm font-bold text-[var(--fg-primary)] mt-1">
              {confidenceTab === "HIGH"
                ? "Immediate Smart Retry Routing"
                : confidenceTab === "MEDIUM"
                ? "Exponential Dynamic Window + UPI FastPass"
                : confidenceTab === "LOW"
                ? "Deterministic Policy Quarantine / Human Gate"
                : "Dynamic Multi-Tier Autonomous Routing"}
            </h4>
            <p className="text-xs text-[var(--fg-secondary)] mt-2 leading-relaxed">
              {confidenceTab === "HIGH"
                ? "Identified as transient gateway latency on healthy issuing bank. Interventions execute automatically in sub-second windows."
                : confidenceTab === "MEDIUM"
                ? "Moderate probability. System activates payment switch fallback or dispatches a zero-touch WhatsApp notification link."
                : confidenceTab === "LOW"
                ? "Elevated dispute probability or bank account issue. Automated direct charging is safely suspended for operator authorization."
                : "Comprehensive execution across high-confidence immediate retries, moderate fallbacks, and human exception review."}
            </p>
          </div>

          <div className="p-4 rounded-[var(--radius-lg)] bg-[var(--bg-surface-alt)] border border-[var(--border-subtle)]">
            <span className="text-[10px] font-mono text-[var(--status-success-text)] font-bold uppercase">Recovery Rate</span>
            <div className="text-3xl font-black font-mono text-[var(--fg-primary)] mt-1">
              {recoveryRate > 0 ? formatPercent(recoveryRate) : "—"}
            </div>
            <p className="text-[11px] text-[var(--fg-tertiary)] mt-1">
              {recoveryRate > 0 ? "Overall recovery rate across active cases." : "No recovery data yet for this workspace."}
            </p>
          </div>

          <div className="p-4 rounded-[var(--radius-lg)] bg-[var(--bg-surface-alt)] border border-[var(--border-subtle)]">
            <span className="text-[10px] font-mono text-[var(--status-info)] font-bold uppercase">Idempotency Guarantee</span>
            <div className="flex items-center gap-1.5 mt-2">
              <ShieldCheck className="w-4 h-4 text-[var(--status-success)]" />
              <span className="text-xs font-bold text-[var(--fg-primary)] font-mono">STRICT SHA-256 KEYING</span>
            </div>
            <p className="text-[11px] text-[var(--fg-tertiary)] mt-2">
              Every recovery plan generates a unique idempotency token to prevent double-debiting customer accounts under network partition.
            </p>
          </div>
        </div>

        {/* Confidence Tier Action Controls */}
        <div className="flex items-center justify-between pt-3 border-t border-[var(--border-subtle)] flex-wrap gap-3">
          <span className="text-xs font-mono text-[var(--fg-tertiary)]">
            Active Inference Tier: <strong className="text-[var(--fg-secondary)]">{confidenceTab} Yield Policy</strong>
          </span>
          <div className="flex items-center gap-2">
            <Link
              href={`/simulator?scenario=${confidenceTab === "HIGH" ? "A" : confidenceTab === "MEDIUM" ? "B" : "C"}`}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[var(--radius-md)] text-xs font-bold text-[var(--fg-primary)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-raised)] transition-colors"
            >
              <Play className="w-3 h-3 text-[var(--brand-primary)] fill-current" />
              Simulate Pipeline Strategy
            </Link>
            <Link
              href={`/recovery?priority=${confidenceTab === "ALL" ? "HIGH" : confidenceTab}`}
              className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-[var(--radius-md)] text-xs font-bold text-white transition-all shadow-sm"
              style={{ background: "var(--brand-primary)", boxShadow: "var(--glow-brand)" }}
            >
              Inspect {confidenceTab === "ALL" ? "All Active" : confidenceTab} Cases
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────
          3B. ACTIVE RECOVERY OPPORTUNITIES (Genuine Cases & Transactions)
          ────────────────────────────────────────────────────────────────────────── */}
      <div className="rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 space-y-4 shadow-[var(--shadow-sm)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[var(--border-subtle)]">
          <div>
            <span className="text-[10px] font-mono font-bold tracking-[0.1em] uppercase text-[var(--brand-primary)]">
              ACTIVE PREDICTIVE OPPORTUNITIES
            </span>
            <h3 className="text-base font-bold text-[var(--fg-primary)] tracking-tight mt-0.5">
              Identified Recovery Candidates ({filteredCases.length})
            </h3>
          </div>
          <span className="text-[11px] font-mono text-[var(--fg-tertiary)]">
            Click &apos;Inspect Active Case&apos; to open details, or &apos;Simulate&apos; to test interventions
          </span>
        </div>

        {filteredCases.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCases.slice(0, 6).map((opp, idx) => {
              const tx = txMap.get(opp.transaction_id);
              // Only display amount if the transaction record is genuinely loaded.
              const txAmount = tx?.amount ?? null;
              const errorCode = tx?.error_code || tx?.status || null;

              return (
                <div
                  key={opp.id}
                  className="p-5 rounded-[var(--radius-lg)] bg-[var(--bg-surface-alt)] border border-[var(--border-subtle)] hover:border-[var(--brand-primary)]/40 transition-all space-y-4 flex flex-col justify-between"
                >
                  <div>
                    {/* Header row with case ID and status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-[var(--radius-xs)] bg-[var(--brand-primary-muted)] text-[var(--brand-primary)] flex items-center justify-center font-mono text-[11px] font-bold shrink-0 mt-0.5">
                          #{idx + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-xs font-bold text-[var(--fg-primary)]">
                              {truncateId(opp.id, 14)}
                            </span>
                            <button
                              onClick={() => handleCopy(opp.id, `Case ${truncateId(opp.id, 8)}`)}
                              className="text-[var(--fg-quaternary)] hover:text-[var(--fg-primary)] p-0.5"
                              title="Copy Case UUID"
                            >
                              {copiedId === `Case ${truncateId(opp.id, 8)}` ? (
                                <Check className="w-3 h-3 text-[var(--status-success)]" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-[10px] font-mono text-[var(--fg-tertiary)]">Tx:</span>
                            <Link
                              href={`/transactions?transactionId=${opp.transaction_id}`}
                              className="font-mono text-[11px] font-semibold text-[var(--brand-primary)] hover:underline truncate"
                              title="Inspect Transaction"
                            >
                              {truncateId(opp.transaction_id, 12)} ↗
                            </Link>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-base font-mono font-bold text-[var(--fg-primary)]">
                          {txAmount !== null ? formatCurrency(txAmount, currency) : "—"}
                        </div>
                        <StatusBadge
                          label={opp.state.replace(/_/g, " ")}
                          variant={caseVariant(opp.state)}
                          size="xs"
                          dot
                          mono
                        />
                      </div>
                    </div>

                    {/* Metadata indicators */}
                    <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-[var(--border-subtle)] text-xs font-mono">
                      <div>
                        <span className="text-[10px] text-[var(--fg-quaternary)] uppercase block">Recovery Probability</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <div className="w-12 h-1.5 rounded-full bg-[var(--bg-raised)] overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[var(--status-success)]"
                              style={{ width: `${((opp.confidence ?? 0.8) * 100).toFixed(0)}%` }}
                            />
                          </div>
                          <strong className="text-[var(--status-success-text)] font-bold">
                            {formatPercent(opp.confidence ?? 0.88)}
                          </strong>
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] text-[var(--fg-quaternary)] uppercase block">Failure Reason</span>
                        <span className="font-semibold text-[var(--status-danger-text)] truncate block mt-0.5">
                          {errorCode || <span className="text-[var(--fg-tertiary)] italic">No data</span>}
                        </span>
                      </div>

                      <div className="mt-2">
                        <span className="text-[10px] text-[var(--fg-quaternary)] uppercase block">Recovery Window</span>
                        <span className="text-[11px] text-[var(--fg-secondary)] block mt-0.5">
                          {opp.recovery_window_ends_at ? formatRelativeTime(opp.recovery_window_ends_at) : "Active"}
                        </span>
                      </div>

                      <div className="mt-2">
                        <span className="text-[10px] text-[var(--fg-quaternary)] uppercase block">Correlation Trace</span>
                        <Link
                          href={`/audit?caseId=${opp.id}&correlationId=${opp.correlation_id}`}
                          className="text-[11px] text-[var(--fg-secondary)] hover:text-[var(--brand-primary-light)] truncate block mt-0.5 hover:underline"
                        >
                          {truncateId(opp.correlation_id, 10)} ↗
                        </Link>
                      </div>
                    </div>
                  </div>

                  {/* Explicit Required Action Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <Link
                      href={`/recovery?caseId=${opp.id}`}
                      className="h-9 px-3 rounded-[var(--radius-md)] text-xs font-bold text-[var(--fg-primary)] bg-[var(--bg-surface)] hover:bg-[var(--bg-raised)] border border-[var(--border-subtle)] flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                      title="Inspect case details in Recovery Center"
                    >
                      <span>Inspect active case</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
                    </Link>

                    <Link
                      href={`/simulator?caseId=${opp.id}&scenario=${(opp.confidence ?? 0.8) >= 0.8 ? "A" : "B"}`}
                      className="h-9 px-3 rounded-[var(--radius-md)] text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-all shadow-sm"
                      style={{ background: "var(--brand-primary)", boxShadow: "var(--glow-brand)" }}
                      title="Test interventions against this decline pattern"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Simulate interventions</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 rounded-[var(--radius-lg)] bg-[var(--bg-surface-alt)] border border-[var(--border-subtle)] text-center">
            <p className="text-sm text-[var(--fg-secondary)] font-medium">
              No recovery opportunities currently found in the {confidenceTab} tier.
            </p>
            <p className="text-xs text-[var(--fg-tertiary)] mt-1">
              {baseCases.length} total active recovery cases available across other tiers.
            </p>
            <button
              onClick={() => setConfidenceTab("ALL")}
              className="mt-3 px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--bg-raised)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--brand-primary)] hover:bg-[var(--bg-surface)]"
            >
              View All Tiers ({baseCases.length})
            </button>
          </div>
        )}
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────
          4. TWO-COLUMN: ROOT-CAUSE TAXONOMY & ISSUER MATRIX
          ────────────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Failure Root-Cause (7 cols) */}
        <div className="lg:col-span-7 rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
            <div>
              <span className="text-[10px] font-mono font-bold tracking-[0.1em] uppercase text-[var(--brand-primary)]">
                ROOT-CAUSE TAXONOMY
              </span>
              <h3 className="text-base font-bold text-[var(--fg-primary)] tracking-tight mt-0.5">
                Cashflow Leakage Attribution
              </h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--brand-primary-muted)] text-[var(--brand-primary)] font-bold border border-[var(--brand-primary-ring)]">
              ML CLASSIFIED
            </span>
          </div>

          <div className="space-y-4">
            {failureAttribution.map((item) => (
              <div
                key={item.category}
                className="space-y-2 p-4 rounded-[var(--radius-lg)] bg-[var(--bg-surface-alt)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-all"
              >
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-[var(--fg-primary)] block">{item.category}</span>
                    <span className="text-[11px] text-[var(--fg-tertiary)]">{item.desc}</span>
                  </div>
                  <span className="font-mono font-bold text-[var(--brand-primary)] text-sm">{item.percent}%</span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 rounded-full bg-[var(--bg-raised)] overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: item.color }}
                    initial={{ width: 0 }}
                    whileInView={{ width: `${item.percent}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, ease: SPRING_EASE }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono text-[var(--fg-tertiary)] pt-1">
                  <span>
                    Gross Volume: <strong className="text-[var(--fg-secondary)]">{formatCurrency(item.impact, currency)}</strong>
                  </span>
                  <span className="text-[var(--status-success-text)] font-bold">
                    {item.recRate !== null ? `Recovery Yield: ${item.recRate}` : ""}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {!hasLeakData && (
            <div className="text-center py-6 text-[var(--fg-tertiary)]">
              <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs font-medium">No failure category data recorded yet.</p>
              <p className="text-[11px] mt-1 opacity-70">Categories will populate as transactions are analyzed.</p>
            </div>
          )}
        </div>

        {/* Right: Bank Issuer Matrix — no backend endpoint available */}
        <div className="lg:col-span-5 rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
            <div>
              <span className="text-[10px] font-mono font-bold tracking-[0.1em] uppercase text-[var(--brand-primary)]">
                BANK DOWNTIME TELEMETRY
              </span>
              <h3 className="text-base font-bold text-[var(--fg-primary)] tracking-tight mt-0.5">
                Issuer Matrix
              </h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--bg-surface-alt)] text-[var(--fg-tertiary)] border border-[var(--border-subtle)]">UNAVAILABLE</span>
          </div>

          <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
            <div className="w-12 h-12 rounded-[var(--radius-lg)] bg-[var(--bg-surface-alt)] border border-[var(--border-subtle)] flex items-center justify-center">
              <Building2 className="w-5 h-5 text-[var(--fg-tertiary)] opacity-50" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--fg-secondary)]">Bank Issuer Telemetry Unavailable</p>
              <p className="text-[11px] text-[var(--fg-tertiary)] mt-1 max-w-[220px] leading-relaxed">
                Per-issuer failure rates and recovery yields require a dedicated bank telemetry endpoint not yet available in this build.
              </p>
            </div>
            <Link
              href="/audit"
              className="text-[11px] font-mono font-bold text-[var(--brand-primary)] hover:underline flex items-center gap-1 mt-1"
            >
              View Audit Trail for Raw Events →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function IntelligencePage() {
  return (
    <Suspense
      fallback={
        <div className="py-24">
          <LoadingSpinner message="Calibrating Revenue Intelligence & Root-Cause Taxonomies…" />
        </div>
      }
    >
      <IntelligenceContent />
    </Suspense>
  );
}