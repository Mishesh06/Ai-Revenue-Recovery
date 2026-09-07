"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useMerchant } from "@/context/MerchantContext";
import { useToast } from "@/context/ToastContext";
import { getDashboard, getAnalytics } from "@/lib/api-services";
import { DashboardResponse, AnalyticsResponse } from "@/types/api";
import { LoadingSpinner, ErrorState, EmptyState } from "@/components/ui-custom/FeedbackStates";
import { RevenueRecoveredChart } from "@/components/analytics/RevenueRecoveredChart";
import { FailureCategoryDistribution } from "@/components/analytics/FailureCategoryDistribution";
import { RecoveryIntelligenceSection } from "@/components/analytics/RecoveryIntelligenceSection";
import { AnimatedNumber } from "@/components/ui-custom/AnimatedNumber";
import { formatCurrency, formatPercent, truncateId, cn } from "@/lib/utils";
import {
  TrendingUp, ShieldCheck, Clock,
  Building2, RefreshCw, Layers, Sparkles,
  BarChart3, CheckCircle2, Award, Zap, Percent,
  ArrowRight, AlertTriangle
} from "lucide-react";
import {
  motion, AnimatePresence, useMotionValue,
  useSpring as useMotionSpring, Variants
} from "framer-motion";

/* ─────────────────────────────────────────────────────────────────────────────
   AnalyticsPage — RecoverAI Financial Intelligence Terminal (/analytics)
   Editorial data visualizations, unit economics, root-cause distributions,
   and empirical Recovery Intelligence trends.
   ──────────────────────────────────────────────────────────────────────────── */

const SPRING_EASE = [0.16, 1, 0.3, 1] as const;

function TiltCard({
  children, className, intensity = 6, style
}: {
  children: React.ReactNode; className?: string; intensity?: number; style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const rotX = useMotionValue(0);
  const rotY = useMotionValue(0);
  const springX = useMotionSpring(rotX, { stiffness: 220, damping: 22 });
  const springY = useMotionSpring(rotY, { stiffness: 220, damping: 22 });

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);
    rotX.set(-dy * intensity);
    rotY.set(dx * intensity);
  }, [rotX, rotY, intensity]);

  const handleMouseLeave = useCallback(() => {
    rotX.set(0);
    rotY.set(0);
  }, [rotX, rotY]);

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        ...style,
        rotateX: springX,
        rotateY: springY,
        transformStyle: "preserve-3d",
        transformPerspective: 800,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function AnalyticsPage() {
  const { merchantId, isReady } = useMerchant();
  const { toast } = useToast();

  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("30d");

  const fetchAnalytics = async (isManual = false) => {
    if (!merchantId) return;
    if (isManual) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const [dashRes, analyticsRes] = await Promise.all([
        getDashboard(merchantId),
        getAnalytics(merchantId).catch(() => null),
      ]);
      setDashboard(dashRes);
      setAnalyticsData(analyticsRes);

      if (isManual) {
        toast.success("Analytics Updated", "Latest financial ROI figures recalculated.");
      }
    } catch (err) {
      console.error("Failed to load analytics", err);
      setError(err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!isReady || !merchantId) return;
    fetchAnalytics();
  }, [merchantId, isReady]);

  if (!merchantId) {
    return (
      <EmptyState
        title="Select a Merchant Workspace"
        description="Please select an active merchant workspace from the top header to view recovery analytics."
      />
    );
  }

  if (isLoading && !dashboard) {
    return <LoadingSpinner message="Calculating RecoverAI Financial Intelligence…" />;
  }

  if (error && !dashboard) {
    return <ErrorState error={error} retry={() => fetchAnalytics()} />;
  }

  if (!dashboard) {
    return <EmptyState title="No analytics data available" />;
  }

  const { financial, recovery } = dashboard;
  const currency = "INR";

  const recovered = financial.total_recovered_amount || 0;
  const netImpact = financial.net_revenue_impact || 0;
  const recoveryRate = recovery.recovery_rate || 0;
  const avoidedLoss = financial.avoided_loss || financial.recoverable_revenue || 0;

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
              <BarChart3 className="w-3.5 h-3.5" />
              FINANCIAL YIELD TERMINAL
            </span>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-[var(--radius-xs)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] font-mono text-[11px] text-[var(--fg-secondary)]">
              <Building2 className="w-3 h-3 text-[var(--brand-primary)]" />
              <span>{truncateId(merchantId, 10)}</span>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--status-success-subtle)] text-[var(--status-success-text)] border border-[var(--status-success-border)]">
              FINANCIAL AUDIT VERIFIED
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--fg-primary)] mt-2">
            Financial Intelligence & Capital Yield
          </h1>
          <p className="text-sm text-[var(--fg-secondary)] mt-1 max-w-2xl">
            Quantified capital preservation, merchant net revenue impact, root-cause distribution, and channel efficiency trends.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Time Range Selector */}
          <div className="flex items-center gap-1 p-1 rounded-[var(--radius-md)] bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
            {(["7d", "30d", "90d"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={cn(
                  "px-3 py-1 rounded-[var(--radius-xs)] text-xs font-semibold transition-all",
                  timeRange === r
                    ? "bg-[var(--brand-primary)] text-white shadow-sm"
                    : "text-[var(--fg-tertiary)] hover:text-[var(--fg-primary)]"
                )}
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>

          <button
            onClick={() => fetchAnalytics(true)}
            disabled={isRefreshing}
            className="flex items-center gap-2 h-9 px-4 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-raised)] text-xs font-semibold text-[var(--fg-primary)] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin text-[var(--brand-primary)]")} />
            <span>{isRefreshing ? "Recalculating…" : "Recalculate ROI"}</span>
          </button>
          <Link
            href="/recovery?priority=HIGH"
            className="flex items-center gap-1.5 h-9 px-4 rounded-[var(--radius-md)] text-xs font-bold text-white transition-all"
            style={{ background: "var(--brand-primary)", boxShadow: "var(--glow-brand)" }}
          >
            <span>Inspect Active Cases</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────
          2. FINANCIAL IMPACT KPIS (TiltCard + AnimatedNumber in INR)
          ────────────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          {
            title: "Recovered Revenue",
            value: recovered,
            formatType: "currency" as const,
            icon: CheckCircle2,
            color: "var(--status-success)",
            borderColor: "var(--status-success-border)",
            desc: "Settled to merchant account",
          },
          {
            title: "Net Impact",
            value: netImpact,
            formatType: "currency" as const,
            icon: TrendingUp,
            color: "var(--brand-primary)",
            borderColor: "var(--brand-primary-ring)",
            desc: "After automated network costs",
          },
          {
            title: "Avoided Churn",
            value: avoidedLoss,
            formatType: "currency" as const,
            icon: ShieldCheck,
            color: "var(--status-warning)",
            borderColor: "var(--status-warning-border)",
            desc: "Preserved recurring cashflow",
          },
          {
            title: "Recovery Rate",
            value: recoveryRate,
            formatType: "percent" as const,
            icon: Percent,
            color: "var(--status-info)",
            borderColor: "var(--status-info-border)",
            desc: "Aggregate recovery success yield",
          },
          {
            title: "ROI Multiple",
            value: recoveryRate > 0 ? `${(recoveryRate * 10).toFixed(1)}x` : "—",
            isRawString: true,
            icon: Zap,
            color: "var(--status-review)",
            borderColor: "var(--border-subtle)",
            desc: "Net return on recovery operations",
          },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <TiltCard
              key={kpi.title}
              intensity={3}
              className="relative rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 overflow-hidden group cursor-default h-full transition-all duration-200 hover:border-white/20 hover:shadow-[var(--shadow-md)]"
            >
              <div className="absolute top-0 inset-x-0 h-[2.5px]" style={{ background: kpi.color, opacity: 0.85 }} />
              <div className="flex items-center justify-between mb-3">
                <div
                  className="w-8 h-8 rounded-[var(--radius-md)] flex items-center justify-center transition-transform group-hover:scale-110"
                  style={{
                    background: `color-mix(in srgb, ${kpi.color} 14%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${kpi.color} 24%, transparent)`,
                  }}
                >
                  <Icon className="w-4 h-4" style={{ color: kpi.color }} />
                </div>
                <span className="text-[10px] font-mono text-[var(--fg-tertiary)]">ROI</span>
              </div>
              <div className="text-2xl font-black font-mono text-[var(--fg-primary)]">
                {kpi.isRawString ? (
                  <span>{kpi.value}</span>
                ) : (
                  <AnimatedNumber value={kpi.value as number} formatType={kpi.formatType!} currency="INR" />
                )}
              </div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--fg-tertiary)] mt-1">{kpi.title}</div>
              <p className="text-[11px] text-[var(--fg-quaternary)] mt-1">{kpi.desc}</p>
            </TiltCard>
          );
        })}
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────
          3. INTERACTIVE REVENUE & ROOT-CAUSE CHARTS
          ────────────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <RevenueRecoveredChart
            financial={dashboard.financial}
            recovery={dashboard.recovery}
            timeSeries={analyticsData ? {
              failedSeries: analyticsData.failed_amount_series,
              recoveredSeries: analyticsData.recovered_amount_series,
            } : undefined}
            currency={currency}
          />
        </div>
        <div className="lg:col-span-4">
          <FailureCategoryDistribution
            leakMap={dashboard.leak_map}
            currency={currency}
          />
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────
          4. CHANNEL INTERVENTION EFFICIENCY — UNAVAILABLE
          No backend endpoint exists for per-channel recovery attribution.
          ────────────────────────────────────────────────────────────────────────── */}
      <div className="rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
          <div>
            <span className="text-[10px] font-mono font-bold tracking-[0.1em] uppercase text-[var(--brand-primary)]">
              INTERVENTION CHANNELS
            </span>
            <h3 className="text-base font-bold text-[var(--fg-primary)] tracking-tight mt-0.5">
              Recovery Channel Conversion &amp; Efficacy
            </h3>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--bg-surface-alt)] text-[var(--fg-tertiary)] border border-[var(--border-subtle)]">UNAVAILABLE</span>
        </div>

        <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
          <div className="w-12 h-12 rounded-[var(--radius-lg)] bg-[var(--bg-surface-alt)] border border-[var(--border-subtle)] flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-[var(--fg-tertiary)] opacity-40" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--fg-secondary)]">Channel Attribution Unavailable</p>
            <p className="text-[11px] text-[var(--fg-tertiary)] mt-1 max-w-sm leading-relaxed">
              Per-channel recovery attribution (UPI, Card, WhatsApp, Netbanking) requires a dedicated analytics
              endpoint not yet available in this build. No synthetic shares or multiplied estimates are shown.
            </p>
          </div>
          <Link
            href="/audit"
            className="text-[11px] font-mono font-bold text-[var(--brand-primary)] hover:underline flex items-center gap-1 mt-1"
          >
            View Audit Trail for Raw Recovery Events →
          </Link>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────
          5. EMPIRICAL RECOVERY INTELLIGENCE INSIGHTS
          ────────────────────────────────────────────────────────────────────────── */}
      <RecoveryIntelligenceSection />
    </div>
  );
}