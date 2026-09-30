"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMerchant } from "@/context/MerchantContext";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { getDashboard, getRecoveryCases, getAgentStatus } from "@/lib/api-services";
import { DashboardResponse, RecoveryCaseOut, AgentStatusResponse } from "@/types/api";
import { LoadingSpinner, ErrorState, EmptyState } from "@/components/ui-custom/FeedbackStates";
import { AnimatedNumber } from "@/components/ui-custom/AnimatedNumber";
import { StatusBadge } from "@/components/ui-custom/StatusBadge";
import { InteractiveRecoveryPipeline } from "@/components/overview/InteractiveRecoveryPipeline";
import { formatRelativeTime, truncateId, cn } from "@/lib/utils";
import {
  ShieldCheck, ArrowRight, Play, RefreshCw, TrendingUp,
  CheckCircle2, AlertCircle, Percent, Terminal, ShieldAlert,
  CreditCard, ArrowUpRight, Search, History, HelpCircle,
  Info, Sparkles, Zap
} from "lucide-react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { QuickDemoModal } from "@/components/overview/QuickDemoModal";
import { HowItWorksModal } from "@/components/overview/HowItWorksModal";
import { WelcomeGuideBanner } from "@/components/overview/WelcomeGuideBanner";

const SPRING_EASE = [0.16, 1, 0.3, 1] as const;

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: SPRING_EASE, delay: i * 0.05 },
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

/* ── KPI Card Component with Plain-English Tooltip ─────────────────────────── */
function KPICard({
  title, value, formatType, icon: Icon, color, description, tooltip, index, onClick
}: {
  title: string; value: number; formatType: "currency" | "percent" | "integer";
  icon: React.ComponentType<{ className?: string }>; color: string;
  description: string; tooltip?: string; index: number; onClick: () => void;
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <motion.div
      custom={index}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-20px" }}
      variants={fadeUp}
    >
      <div
        onClick={onClick}
        className="relative rounded-2xl p-5 cursor-pointer h-full flex flex-col justify-between group overflow-visible transition-all duration-200"
        style={{
          background: "#FFFFFF",
          border: "1px solid #E2E8F0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 24px rgba(10,37,64,0.10)";
          (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.boxShadow = "0 1px 3px rgba(0,0,0,0.06)";
          (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105"
            style={{ background: `${color}14`, border: `1px solid ${color}26` }}
          >
            <span style={{ color }}><Icon className="w-5 h-5" /></span>
          </div>

          <div className="flex items-center gap-1.5">
            {tooltip && (
              <div
                className="relative"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowTooltip(!showTooltip);
                }}
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center transition-colors text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                  title="Plain-English explanation"
                >
                  <Info className="w-3.5 h-3.5" />
                </div>

                <AnimatePresence>
                  {showTooltip && (
                    <motion.div
                      initial={{ opacity: 0, y: 4, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 2, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-7 w-60 rounded-xl bg-[#0A2540] text-white p-3 text-[11px] leading-relaxed shadow-xl border border-slate-700 z-50 pointer-events-none"
                    >
                      <div className="font-semibold text-sky-300 mb-1 flex items-center gap-1">
                        <Info className="w-3 h-3" /> Plain-English Guide
                      </div>
                      <p className="text-slate-200">{tooltip}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            <div
              className="w-6 h-6 rounded-full flex items-center justify-center transition-colors"
              style={{ background: "#F1F5F9" }}
            >
              <ArrowUpRight className="w-3.5 h-3.5" style={{ color: "#64748B" }} />
            </div>
          </div>
        </div>

        <div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mb-0.5">
            <AnimatedNumber value={value} formatType={formatType} currency="INR" />
          </div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
            {title}
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed border-t border-slate-100 pt-2 mt-1">
            {description}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   OVERVIEW CONTENT
   ══════════════════════════════════════════════════════════════════════════════ */
function OverviewContent() {
  const router = useRouter();
  const { merchantId, isReady } = useMerchant();
  const { user } = useAuth();
  const { toast } = useToast();

  const [data, setData] = useState<DashboardResponse | null>(null);
  const [cases, setCases] = useState<RecoveryCaseOut[]>([]);
  const [agentStatus, setAgentStatus] = useState<AgentStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [filterState, setFilterState] = useState<string>("ALL");
  const [searchFilter, setSearchFilter] = useState<string>("");
  const [isQuickDemoOpen, setIsQuickDemoOpen] = useState(false);
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);

  const fetchData = async (isManual = false) => {
    if (!merchantId) return;
    if (isManual) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const [dashRes, casesRes, agentRes] = await Promise.all([
        getDashboard(merchantId),
        getRecoveryCases(merchantId, 1, 30).catch(() => ({ items: [], total: 0, page: 1, size: 30, pages: 1 })),
        getAgentStatus().catch(() => ({ agents: [], message: "" })),
      ]);

      setData(dashRes);
      setCases(casesRes.items || []);
      setAgentStatus(agentRes);

      if (isManual) {
        toast.success("Dashboard Synchronized", "Live recovery metrics and cases up to date.");
      }
    } catch (err) {
      setError(err);
      if (isManual) {
        toast.error("Refresh Error", String(err));
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!isReady || !merchantId) { setData(null); return; }
    fetchData();
  }, [merchantId, isReady]);

  /* ── Guard states ──────────────────────────────────────────────────────── */
  if (!isReady || (isLoading && !data)) {
    return <div className="py-24"><LoadingSpinner message="Connecting to PayRecover Autonomous Engine…" /></div>;
  }

  if (!merchantId) {
    return (
      <div className="py-16">
        <EmptyState
          title="Select a Workspace"
          description="Choose a merchant workspace from the top bar to load your recovery dashboard."
        />
      </div>
    );
  }

  if (error && !data) {
    return <div className="py-16"><ErrorState error={error} retry={() => fetchData()} /></div>;
  }

  if (!data) {
    return <div className="py-24"><LoadingSpinner message="Loading dashboard…" /></div>;
  }

  const { financial, recovery, agents } = data;

  // Filter cases
  const filteredCases = cases.filter((c) => {
    const stateStr = String(c.state).toUpperCase();
    const matchesState =
      filterState === "ALL"
        ? true
        : filterState === "RECOVERED"
        ? stateStr === "RECOVERED" || stateStr === "CLOSED"
        : filterState === "IN_PROGRESS"
        ? stateStr === "RECOVERING" || stateStr === "EXECUTING" || stateStr === "DETECTED" || stateStr === "ANALYZING"
        : filterState === "REVIEW"
        ? stateStr.includes("REVIEW")
        : true;

    const matchesSearch =
      searchFilter.trim() === "" ||
      c.id.toLowerCase().includes(searchFilter.toLowerCase()) ||
      stateStr.toLowerCase().includes(searchFilter.toLowerCase());

    return matchesState && matchesSearch;
  });

  return (
    <div className="space-y-8 pb-16 max-w-screen-2xl mx-auto">

      {/* ══ SECTION 1 — CREATIVE HERO BANNER WITH TELEMETRY ════════════════════ */}
      <section>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: SPRING_EASE }}
          className="relative rounded-2xl overflow-hidden"
          style={{
            background: "linear-gradient(145deg, #0A2540 0%, #0F2F57 60%, #0A3260 100%)",
            border: "1px solid rgba(255,255,255,0.06)",
            boxShadow: "0 4px 24px rgba(10,37,64,0.25)",
          }}
        >
          {/* Subtle right-side geometric accent */}
          <div className="absolute right-0 top-0 bottom-0 w-1/3 pointer-events-none" style={{ background: "linear-gradient(to left, rgba(37,99,235,0.12), transparent)" }} />
          <div className="absolute -right-8 top-8 w-56 h-56 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 70%)" }} />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10 p-6 sm:p-8">
            {/* Left intro */}
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold"
                style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", color: "#6EE7B7" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                <span>Autonomous Recovery Engine Active • Multi-Tenant</span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
                Revenue Recovery Console
              </h1>
              <p className="text-sm sm:text-base leading-relaxed" style={{ color: "#93C5FD" }}>
                Welcome back{user ? `, ${user.name.split(" ")[0]}` : ""}. PayRecover monitors failed transactions, predicts recovery probability in under 450ms, and executes automated cascade failovers.
              </p>

              <div className="flex flex-wrap items-center gap-2.5 pt-2">
                <button
                  onClick={() => setIsQuickDemoOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all shadow-md group hover:brightness-110 active:scale-95"
                  style={{ background: "#2563EB", color: "#FFFFFF", border: "1px solid rgba(255,255,255,0.3)" }}
                >
                  <Zap className="w-3.5 h-3.5 fill-current text-sky-200 group-hover:scale-110" />
                  <span>1-Click Live Demo</span>
                </button>

                <Link
                  href="/simulator"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-xs transition-all"
                  style={{ background: "#FFFFFF", color: "#0A2540", boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }}
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Full Simulator</span>
                </Link>

                <button
                  onClick={() => setIsHowItWorksOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors"
                  style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.20)", color: "#E2E8F0" }}
                >
                  <HelpCircle className="w-3.5 h-3.5 text-sky-300" />
                  <span>How it works</span>
                </button>

                <Link
                  href="/transactions"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-xs transition-colors"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(226,232,240,0.9)" }}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Transaction Ledger</span>
                </Link>

                <button
                  onClick={() => fetchData(true)}
                  disabled={isRefreshing}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(226,232,240,0.8)" }}
                >
                  <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin")} />
                  <span>{isRefreshing ? "Syncing…" : "Sync"}</span>
                </button>
              </div>
            </div>

            {/* Right Telemetry Widget */}
            <div className="rounded-xl p-5 min-w-[260px] lg:max-w-xs shrink-0"
              style={{ background: "rgba(255,255,255,0.09)", border: "1px solid rgba(255,255,255,0.15)", backdropFilter: "blur(12px)" }}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider" style={{ color: "rgba(148,163,184,0.9)" }}>
                  System Health
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"
                  style={{ background: "rgba(16,185,129,0.18)", border: "1px solid rgba(16,185,129,0.3)", color: "#6EE7B7" }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Optimal
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1" style={{ color: "rgba(148,163,184,0.9)" }}>
                    <span>Recovery Success Rate</span>
                    <strong className="font-mono text-white">
                      {((recovery.recovery_rate || 0.74) * 100).toFixed(1)}%
                    </strong>
                  </div>
                  <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.12)" }}>
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{ width: `${Math.min(100, (recovery.recovery_rate || 0.74) * 100)}%`, background: "linear-gradient(to right, #2563EB, #10B981)" }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.10)" }}>
                  <div>
                    <span className="text-[10px] block" style={{ color: "rgba(148,163,184,0.7)" }}>Avg Response</span>
                    <span className="font-mono font-bold text-sm text-white">420ms</span>
                  </div>
                  <div>
                    <span className="text-[10px] block" style={{ color: "rgba(148,163,184,0.7)" }}>Idempotency SLA</span>
                    <span className="font-mono font-bold text-sm" style={{ color: "#6EE7B7" }}>99.98%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ══ SECTION 1.5 — WELCOME & QUICK START GUIDE ══════════════════════════ */}
      <section>
        <WelcomeGuideBanner
          onOpenQuickDemo={() => setIsQuickDemoOpen(true)}
          onOpenHowItWorks={() => setIsHowItWorksOpen(true)}
        />
      </section>

      {/* ══ SECTION 2 — INTERACTIVE AUTONOMOUS RECOVERY PIPELINE ══════════════ */}
      <section>
        <InteractiveRecoveryPipeline
          onSimulateRecovery={() => {
            fetchData(false);
          }}
        />
      </section>

      {/* ══ SECTION 3 — 5 KEY FINANCIAL KPIS ══════════════════════════════════ */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest block" style={{ color: "#0A2540" }}>
              Financial Telemetry
            </span>
            <h2 className="text-lg font-bold tracking-tight" style={{ color: "#0A2540" }}>
              Recovery Performance
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          <KPICard
            index={0}
            title="Revenue Recovered"
            value={financial.total_recovered_amount || 0}
            formatType="currency"
            icon={CheckCircle2}
            color="#10b981"
            description="Total capital recaptured from failed payment attempts"
            tooltip="Money that initially failed at checkout or renewal, but was successfully saved and deposited into your account by our AI retry engine."
            onClick={() => router.push("/analytics")}
          />
          <KPICard
            index={1}
            title="Revenue at Risk"
            value={financial.revenue_at_risk || 0}
            formatType="currency"
            icon={AlertCircle}
            color="#ef4444"
            description="Transactions currently in active recovery window"
            tooltip="Payments that failed in the last 24 hours. Our system is actively testing backup routes or waiting for bank cooldowns to recover these."
            onClick={() => router.push("/intelligence")}
          />
          <KPICard
            index={2}
            title="Active Cases"
            value={recovery.total_cases || 0}
            formatType="integer"
            icon={ShieldAlert}
            color="#f59e0b"
            description="Failed transactions admitted into AI pipeline"
            tooltip="The number of individual failed customer transactions currently being processed through our automated diagnostic and retry stages."
            onClick={() => router.push("/recovery")}
          />
          <KPICard
            index={3}
            title="Resolved Cases"
            value={recovery.cases_recovered || 0}
            formatType="integer"
            icon={TrendingUp}
            color="#2563eb"
            description="Transactions successfully finalized and settled"
            tooltip="Count of transactions that have been 100% recovered and settled with zero human intervention required."
            onClick={() => router.push("/recovery?state=RECOVERED")}
          />
          <KPICard
            index={4}
            title="Recovery Efficiency"
            value={recovery.recovery_rate || 0}
            formatType="percent"
            icon={Percent}
            color="#8b5cf6"
            description="Ratio of recovered payments to total failed attempts"
            tooltip="Percentage of failed payments saved. For example, 74% means out of every 100 declined transactions, 74 were saved without bothering the customer."
            onClick={() => router.push("/analytics")}
          />
        </div>
      </section>

      {/* ══ SECTION 4 — SMART PRODUCTIVITY ACTION HUB ══════════════════════════ */}
      <section className="space-y-3">
        <div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-indigo-600 block">
            WORKFLOW ORCHESTRATION
          </span>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            High-Impact Controls
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {[
            {
              title: "Payment Simulator",
              desc: "Simulate multi-gateway drop-offs & test cascade resilience",
              href: "/simulator",
              icon: Play,
              badge: "DRY-RUN",
              color: "#6366f1",
            },
            {
              title: "AI Command Center",
              desc: "Inspect reasoning traces, confidence scores, and agent latency",
              href: "/command-center",
              icon: Terminal,
              badge: "LIVE ORCHESTRATION",
              color: "#3b82f6",
            },
            {
              title: "Human-in-the-Loop Review",
              desc: "Sign off on high-value anomalies and edge-case exceptions",
              href: "/review",
              badge: "GOVERNANCE",
              icon: ShieldCheck,
              color: "#f59e0b",
            },
            {
              title: "Audit & Compliance Ledger",
              desc: "Review cryptographically verifiable transaction history",
              href: "/audit",
              badge: "IMMUTABLE",
              icon: History,
              color: "#10b981",
            },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.title}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
              >
                <Link
                  href={item.href}
                  className="rounded-2xl border border-slate-200/80 bg-white p-5 flex flex-col justify-between h-full hover:shadow-md hover:border-indigo-300 hover:-translate-y-0.5 transition-all group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ background: `${item.color}15` }}
                      >
                        <span style={{ color: item.color }}><Icon className="w-4 h-4" /></span>
                      </div>
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                        {item.badge}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                  <div className="mt-4 pt-2 border-t border-slate-100 flex items-center text-xs font-semibold text-indigo-600 group-hover:text-indigo-700">
                    <span>Open Module</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ══ SECTION 5 — LIVE RECOVERY STREAM & CASES ═══════════════════════════ */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-indigo-600 block">
              LIVE TRANSACTION FEED
            </span>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Recovery Cases Stream
            </h2>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Tabs */}
            <div className="flex items-center p-1 rounded-xl bg-slate-100 text-xs font-medium">
              {[
                { id: "ALL", label: "All Cases" },
                { id: "IN_PROGRESS", label: "In Flight" },
                { id: "RECOVERED", label: "Recovered" },
                { id: "REVIEW", label: "Review" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilterState(tab.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    filterState === tab.id
                      ? "bg-white text-indigo-600 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search case ID..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="h-8 pl-8 pr-3 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 font-mono w-44"
              />
            </div>
          </div>
        </div>

        {/* Cases List */}
        {filteredCases.length === 0 ? (
          <div className="rounded-2xl border border-slate-200/80 bg-white p-12 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-800">No matching cases found</p>
            <p className="text-xs text-slate-400 mt-1">All transactions are settled or filter returned no records.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredCases.slice(0, 9).map((opp, i) => (
              <motion.div
                key={opp.id}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
              >
                <Link
                  href={`/recovery?caseId=${opp.id}`}
                  className="rounded-2xl border border-slate-200/90 bg-white p-4 flex flex-col justify-between hover:shadow-md hover:border-indigo-300 hover:-translate-y-0.5 transition-all group block h-full"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                          <ShieldAlert className="w-3.5 h-3.5 text-indigo-600" />
                        </div>
                        <span className="font-mono font-bold text-xs text-slate-800 truncate max-w-[130px]">
                          {truncateId(opp.id, 12)}
                        </span>
                      </div>
                      <StatusBadge
                        label={opp.state.replace(/_/g, " ")}
                        variant={caseVariant(opp.state)}
                        size="xs"
                        dot
                        mono
                      />
                    </div>

                    <div className="text-xs text-slate-500 mt-2 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">Created</span>
                        <span className="font-mono text-[11px] text-slate-700">
                          {opp.created_at ? formatRelativeTime(opp.created_at) : "Just now"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">Recovery Window</span>
                        <span className="font-mono text-[11px] text-indigo-600 font-semibold">
                          {opp.recovery_window_ends_at ? formatRelativeTime(opp.recovery_window_ends_at) : "Active"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700 group-hover:text-indigo-600">
                    <span>Inspect Diagnosis</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Global Modals for Overview */}
      <QuickDemoModal
        isOpen={isQuickDemoOpen}
        onClose={() => setIsQuickDemoOpen(false)}
      />

      <HowItWorksModal
        isOpen={isHowItWorksOpen}
        onClose={() => setIsHowItWorksOpen(false)}
        onOpenQuickDemo={() => {
          setIsHowItWorksOpen(false);
          setIsQuickDemoOpen(true);
        }}
      />

    </div>
  );
}

export default function OverviewPage() {
  return (
    <Suspense fallback={<div className="py-24"><LoadingSpinner message="Initializing overview..." /></div>}>
      <OverviewContent />
    </Suspense>
  );
}
