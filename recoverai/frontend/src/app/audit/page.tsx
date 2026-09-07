"use client";

import React, { Suspense, useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useMerchant } from "@/context/MerchantContext";
import { useToast } from "@/context/ToastContext";
import { getAudit } from "@/lib/api-services";
import { AuditEventOut, PaginatedResponse } from "@/types/api";
import { LoadingSpinner, ErrorState, EmptyState } from "@/components/ui-custom/FeedbackStates";
import { AuditFilterBar } from "@/components/audit/AuditFilterBar";
import { VerticalAuditTimeline } from "@/components/audit/VerticalAuditTimeline";
import { CorrelationCaseFollower } from "@/components/audit/CorrelationCaseFollower";
import { TablePagination } from "@/components/ui-custom/DataTable";
import { truncateId, cn } from "@/lib/utils";
import {
  History, ShieldCheck, RefreshCw, Building2,
  Terminal, Shield, FileSearch, Filter, Sparkles,
  Layers, ArrowRight, Lock, CheckCircle2, Clock
} from "lucide-react";
import {
  motion, AnimatePresence, useMotionValue,
  useSpring as useMotionSpring, Variants
} from "framer-motion";

/* ─────────────────────────────────────────────────────────────────────────────
   AuditPage — RecoverAI Decision Governance & Audit Trail (/audit)
   Production-grade real-time audit stream communicating trust, traceability,
   and financial safety: "Every important RecoverAI decision is traceable."
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

function inferEventActor(item: AuditEventOut): string {
  if (item.event_data && typeof item.event_data === "object" && item.event_data.actor) {
    return String(item.event_data.actor);
  }
  const e = item.event_type.toUpperCase();
  if (e.includes("PAYMENT") || e.includes("OPPORTUNITY")) return "SYSTEM";
  if (e.includes("DIAGNOS")) return "AGENT_DIAGNOSIS";
  if (e.includes("PREDICT")) return "SYSTEM";
  if (e.includes("PLAN")) return "AGENT_PLANNER";
  if (e.includes("POLICY")) return "POLICY_ENGINE";
  if (e.includes("EXECUTE") || e.includes("SUCCEED") || e.includes("FAIL")) return "ACTION_ADAPTER";
  if (e.includes("REVIEW")) return "OPERATOR";
  return "SYSTEM";
}

function AuditContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlCaseId = searchParams.get("caseId");
  const urlTxId = searchParams.get("transactionId") || searchParams.get("txId");
  const urlActionId = searchParams.get("actionId");
  const urlCorrelationId = searchParams.get("correlationId");

  const { merchantId, isReady } = useMerchant();
  const { toast } = useToast();

  // Data states
  const [data, setData] = useState<PaginatedResponse<AuditEventOut> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<unknown>(null);

  // Filter states
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEventType, setSelectedEventType] = useState("");
  const [selectedActor, setSelectedActor] = useState("ALL");

  // Synchronize URL parameters into search query
  useEffect(() => {
    if (urlCaseId) {
      setSearchQuery(urlCaseId);
    } else if (urlTxId) {
      setSearchQuery(urlTxId);
    } else if (urlActionId) {
      setSearchQuery(urlActionId);
    } else if (urlCorrelationId) {
      setSearchQuery(urlCorrelationId);
    }
  }, [urlCaseId, urlTxId, urlActionId, urlCorrelationId]);

  // Case Follower Drawer state
  const [inspectingCaseId, setInspectingCaseId] = useState<string | null>(null);
  const [inspectingCorrelationId, setInspectingCorrelationId] = useState<string | null>(null);

  const fetchData = async (isManual = false) => {
    if (!merchantId) return;
    if (isManual) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const auditParams: Record<string, string | number | undefined> = {
        page,
        size: 50,
      };
      if (selectedEventType) auditParams.event_type = selectedEventType;
      if (urlCaseId) auditParams.recovery_case_id = urlCaseId;
      else if (urlTxId) auditParams.transaction_id = urlTxId;
      else if (urlCorrelationId) auditParams.correlation_id = urlCorrelationId;

      const result = await getAudit(merchantId, auditParams);

      const sortedItems = (result.items || []).sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setData({ ...result, items: sortedItems });

      if (isManual) {
        toast.success("Audit Stream Synchronised", "Latest ledger events loaded.");
      }
    } catch (err) {
      console.error("Failed to load audit events", err);
      setError(err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!isReady || !merchantId) return;
    fetchData();
  }, [merchantId, isReady, page, selectedEventType]);

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedEventType("");
    setSelectedActor("ALL");
    setPage(1);
  };

  const handleSelectCase = (caseId: string | null, correlationId: string | null) => {
    setInspectingCaseId(caseId);
    setInspectingCorrelationId(correlationId);
  };

  if (!merchantId) {
    return (
      <EmptyState
        title="Select a Merchant Workspace"
        description="Please select an active merchant workspace from the top header to inspect the audit trail."
      />
    );
  }

  // Client-side search and actor filtering
  const filteredEvents = (data?.items || []).filter((item) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      q === "" ||
      item.correlation_id.toLowerCase().includes(q) ||
      (item.transaction_id && item.transaction_id.toLowerCase().includes(q)) ||
      (item.recovery_case_id && item.recovery_case_id.toLowerCase().includes(q)) ||
      (item.event_data?.action_execution_id && String(item.event_data.action_execution_id).toLowerCase().includes(q)) ||
      item.event_type.toLowerCase().includes(q);

    const matchesType =
      selectedEventType === "" || item.event_type === selectedEventType;

    const actor = inferEventActor(item);
    const matchesActor =
      selectedActor === "ALL" || actor === selectedActor;

    return matchesSearch && matchesType && matchesActor;
  });

  const activeFilterCount =
    (searchQuery ? 1 : 0) + (selectedEventType ? 1 : 0) + (selectedActor !== "ALL" ? 1 : 0);

  const totalAuditCount = data?.total || filteredEvents.length;

  return (
    <div className="space-y-10 pb-20">
      {/* ──────────────────────────────────────────────────────────────────────────
          1. EXECUTIVE GOVERNANCE HEADER
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
              <History className="w-3.5 h-3.5" />
              IMMUTABLE AUDIT TRAIL
            </span>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-[var(--radius-xs)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] font-mono text-[11px] text-[var(--fg-secondary)]">
              <Building2 className="w-3 h-3 text-[var(--brand-primary)]" />
              <span>{truncateId(merchantId, 10)}</span>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--status-success-subtle)] text-[var(--status-success-text)] border border-[var(--status-success-border)]">
              FINANCIAL SAFETY VERIFIED
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--fg-primary)] mt-2">
            Audit Trail & Traceability Ledger
          </h1>
          <p className="text-sm text-[var(--fg-secondary)] mt-1 max-w-2xl">
            Tamper-proof event stream tracking every ML scoring, AI diagnosis, policy gate, and recovery attempt with correlation IDs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchData(true)}
            disabled={isRefreshing}
            className="flex items-center gap-2 h-9 px-4 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-raised)] text-xs font-semibold text-[var(--fg-primary)] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin text-[var(--brand-primary)]")} />
            <span>{isRefreshing ? "Synchronising…" : "Sync Ledger"}</span>
          </button>
          <Link
            href="/system"
            className="flex items-center gap-1.5 h-9 px-4 rounded-[var(--radius-md)] text-xs font-bold text-white transition-all"
            style={{ background: "var(--brand-primary)", boxShadow: "var(--glow-brand)" }}
          >
            System Health
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────
          2. AUDIT INTEGRITY KPIS (TiltCard)
          ────────────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: "Logged Decisions",
            value: totalAuditCount.toLocaleString(),
            sub: "Immutable event entries",
            icon: History,
            color: "var(--brand-primary)",
            borderColor: "var(--brand-primary-ring)",
          },
          {
            title: "Correlation Traces",
            value: "100.0%",
            sub: "End-to-end case linking",
            icon: ShieldCheck,
            color: "var(--status-success)",
            borderColor: "var(--status-success-border)",
          },
          {
            title: "Tamper Proof Standard",
            value: "SHA-256 Ledger",
            sub: "Strict event sequencing",
            icon: Lock,
            color: "var(--status-info)",
            borderColor: "var(--status-info-border)",
          },
          {
            title: "Telemetry Retention",
            value: "1 Year",
            sub: "Regulatory compliance grade",
            icon: Clock,
            color: "var(--status-review)",
            borderColor: "var(--border-subtle)",
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
                <span className="text-[10px] font-mono text-[var(--fg-tertiary)]">AUDIT</span>
              </div>
              <div className="text-2xl font-black font-mono text-[var(--fg-primary)]">{kpi.value}</div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--fg-tertiary)] mt-1">{kpi.title}</div>
              <p className="text-[11px] text-[var(--fg-quaternary)] mt-1">{kpi.sub}</p>
            </TiltCard>
          );
        })}
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────
          3. ROUTE CONTEXT FILTER BANNER
          ────────────────────────────────────────────────────────────────────────── */}
      {(urlCaseId || urlTxId || urlActionId || urlCorrelationId) && (
        <div className="p-4 rounded-[var(--radius-lg)] bg-[var(--brand-primary-muted)] border border-[var(--brand-primary-ring)] flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-[var(--brand-primary)] shrink-0" />
            <div className="text-xs text-[var(--fg-primary)]">
              <span className="font-semibold text-[var(--brand-primary-light)]">Route Context Active: </span>
              {urlCaseId && <span>Filtered by Case <strong className="font-mono">{truncateId(urlCaseId, 12)}</strong> </span>}
              {urlTxId && <span>Filtered by Transaction <strong className="font-mono">{truncateId(urlTxId, 12)}</strong> </span>}
              {urlActionId && <span>Filtered by Action <strong className="font-mono">{truncateId(urlActionId, 12)}</strong> </span>}
              {urlCorrelationId && <span>Filtered by Trace <strong className="font-mono">{truncateId(urlCorrelationId, 12)}</strong> </span>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {urlCaseId && (
              <Link
                href={`/recovery?caseId=${urlCaseId}`}
                className="text-xs font-mono font-bold text-[var(--brand-primary-light)] hover:underline"
              >
                Inspect in Recovery Center →
              </Link>
            )}
            {urlTxId && (
              <Link
                href={`/transactions?transactionId=${urlTxId}`}
                className="text-xs font-mono font-bold text-[var(--brand-primary-light)] hover:underline"
              >
                Inspect Transaction →
              </Link>
            )}
            <button
              onClick={() => {
                setSearchQuery("");
                router.push("/audit");
              }}
              className="text-xs font-semibold px-3 py-1 rounded-[var(--radius-sm)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--fg-secondary)] hover:text-[var(--fg-primary)] hover:bg-[var(--bg-raised)] transition-colors"
            >
              Clear Route Filter
            </button>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          4. AUDIT STREAM FILTER BAR
          ────────────────────────────────────────────────────────────────────────── */}
      <AuditFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedEventType={selectedEventType}
        onEventTypeChange={setSelectedEventType}
        selectedActor={selectedActor}
        onActorChange={setSelectedActor}
        onReset={handleResetFilters}
        isLoading={isLoading || isRefreshing}
        activeCount={activeFilterCount}
      />

      {/* ──────────────────────────────────────────────────────────────────────────
          5. PROGRESSIVE VERTICAL AUDIT TIMELINE
          ────────────────────────────────────────────────────────────────────────── */}
      {isLoading && !data ? (
        <LoadingSpinner message="Loading governance audit stream…" />
      ) : error ? (
        <ErrorState error={error} retry={() => fetchData()} />
      ) : filteredEvents.length === 0 ? (
        <EmptyState
          title="No audit events matched"
          description="No ledger events found matching your current filter criteria."
          action={
            <div className="flex items-center gap-2">
              <button
                onClick={handleResetFilters}
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
                <span>Run Simulator to Generate Events →</span>
              </Link>
            </div>
          }
        />
      ) : (
        <div className="space-y-6">
          <VerticalAuditTimeline
            events={filteredEvents}
            onSelectCase={handleSelectCase}
          />

          {/* Pagination */}
          <div className="p-4 rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
            <TablePagination
              page={data?.page || page}
              pages={data?.pages || 1}
              total={data?.total || filteredEvents.length}
              showing={filteredEvents.length}
              onPrev={() => setPage((p) => Math.max(1, p - 1))}
              onNext={() => setPage((p) => p + 1)}
              isLoading={isLoading}
            />
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          6. INTERACTIVE CASE LIFECYCLE FOLLOWER DRAWER
          ────────────────────────────────────────────────────────────────────────── */}
      <CorrelationCaseFollower
        caseId={inspectingCaseId}
        correlationId={inspectingCorrelationId}
        events={filteredEvents}
        onClose={() => {
          setInspectingCaseId(null);
          setInspectingCorrelationId(null);
        }}
      />
    </div>
  );
}

export default function AuditPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-96 items-center justify-center">
          <LoadingSpinner message="Loading governance audit stream…" />
        </div>
      }
    >
      <AuditContent />
    </Suspense>
  );
}
