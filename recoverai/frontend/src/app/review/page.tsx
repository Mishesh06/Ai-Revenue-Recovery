"use client";

import React, { Suspense, useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMerchant } from "@/context/MerchantContext";
import { useToast } from "@/context/ToastContext";
import { getReviews, submitReview, getAudit, getRecoveryCase, getTransaction } from "@/lib/api-services";
import { ManualReviewOut, AuditEventOut, PaginatedResponse } from "@/types/api";
import { LoadingSpinner, ErrorState, EmptyState } from "@/components/ui-custom/FeedbackStates";
import { ReviewQueueSummary, ReviewCategory } from "@/components/review/ReviewQueueSummary";
import { ReviewItemCard } from "@/components/review/ReviewItemCard";
import { ReviewWorkspace } from "@/components/review/ReviewWorkspace";
import { ReviewItemExtended } from "@/components/review/ReviewDecisionModal";
import { AnimatedNumber } from "@/components/ui-custom/AnimatedNumber";
import { formatCurrency, formatRelativeTime, truncateId, cn } from "@/lib/utils";
import {
  UserCheck, ShieldAlert, RefreshCw, Building2,
  Sparkles, CheckCircle2, Shield, AlertTriangle, ShieldCheck,
  ChevronLeft, Layers, Filter, Clock, ArrowRight, Lock
} from "lucide-react";
import {
  motion, AnimatePresence, useMotionValue,
  useSpring as useMotionSpring, Variants
} from "framer-motion";

/* ─────────────────────────────────────────────────────────────────────────────
   ReviewPage — RecoverAI Human Review & Operator Governance Console (/review)
   Controlled autonomy workspace: "AI handles routine recovery. Humans handle exceptions."
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

function ReviewContent() {
  const searchParams = useSearchParams();
  const urlCaseId = searchParams.get("caseId");
  const urlReviewId = searchParams.get("reviewId");

  const { merchantId, isReady } = useMerchant();
  const { toast } = useToast();

  // Data states
  const [reviews, setReviews] = useState<ReviewItemExtended[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<unknown>(null);

  // Active workspace state
  const [selectedCategory, setSelectedCategory] = useState<ReviewCategory>("ALL");
  const [activeReviewId, setActiveReviewId] = useState<string | null>(null);
  const [auditEvents, setAuditEvents] = useState<AuditEventOut[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);

  // Synchronize URL parameters with active review item
  useEffect(() => {
    if (reviews.length === 0) return;
    if (urlReviewId) {
      const match = reviews.find((r) => r.id === urlReviewId);
      if (match) setActiveReviewId(match.id);
    } else if (urlCaseId) {
      const match = reviews.find((r) => r.recovery_case_id === urlCaseId);
      if (match) setActiveReviewId(match.id);
    }
  }, [urlCaseId, urlReviewId, reviews]);

  const fetchReviews = async (isManual = false) => {
    if (!merchantId) return;
    if (isManual) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const res = await getReviews(merchantId, 1, 50).catch(() => ({ items: [], total: 0, page: 1, size: 50, pages: 1 }));

      if (res.items && res.items.length > 0) {
        const enriched: ReviewItemExtended[] = await Promise.all(
          res.items.map(async (r) => {
            let txAmount = 0;
            let prob = 0.75;
            const why = r.reason || "Quarantined for operator clearance";
            if (r.recovery_case_id) {
              try {
                const caseData = await getRecoveryCase(merchantId, r.recovery_case_id);
                if (caseData?.confidence != null) prob = Number(caseData.confidence);
                if (caseData?.transaction_id) {
                  const tx = await getTransaction(merchantId, caseData.transaction_id);
                  if (tx?.amount != null) txAmount = Number(tx.amount);
                }
              } catch {
                // fallback if lookup fails
              }
            }

            return {
              ...r,
              amount: txAmount,
              recovery_probability: prob,
              confidence: prob,
              risk_level: prob < 0.6 ? ("HIGH" as const) : ("MEDIUM" as const),
              reason_code: r.reason || "POLICY_QUARANTINE",
              why_human_review: why,
              recommended_action: "Manual operator review required",
              evidence_signals: {
                case_id: r.recovery_case_id,
                created_at: r.created_at,
                decision_status: r.decision ? r.decision : "PENDING_OPERATOR_REVIEW",
              },
            };
          })
        );

        setReviews(enriched);
        if (!activeReviewId && enriched.length > 0) {
          setActiveReviewId(enriched[0].id);
        }
      } else {
        setReviews([]);
        setActiveReviewId(null);
      }

      if (isManual) {
        toast.success("Review Queue Synchronised", "Latest exception reviews loaded.");
      }
    } catch (err) {
      console.error("Failed to load human review queue", err);
      setError(err);
      setReviews([]);
      setActiveReviewId(null);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!isReady || !merchantId) return;
    fetchReviews();
  }, [merchantId, isReady]);

  // Load audit trace for active review item
  useEffect(() => {
    const activeReview = reviews.find((r) => r.id === activeReviewId);
    if (!merchantId || !activeReview || !activeReview.recovery_case_id) {
      setAuditEvents([]);
      return;
    }

    const fetchCaseAudit = async () => {
      setIsLoadingAudit(true);
      try {
        const res = await getAudit(merchantId, {
          recovery_case_id: activeReview.recovery_case_id,
          size: 20,
        });
        setAuditEvents(res.items || []);
      } catch {
        setAuditEvents([]);
      } finally {
        setIsLoadingAudit(false);
      }
    };

    fetchCaseAudit();
  }, [activeReviewId, merchantId, reviews]);

  const handleSubmitDecision = async (
    reviewId: string,
    decision: "APPROVED" | "REJECTED",
    notes: string
  ) => {
    if (!merchantId) return;

    try {
      await submitReview(merchantId, reviewId, {
        decision,
        reviewer: "lead_operator@recoverai.internal",
        comment: notes || `Authorized exception via Human Review Desk`,
      });

      const remaining = reviews.filter((r) => r.id !== reviewId);
      setReviews(remaining);
      if (activeReviewId === reviewId) {
        setActiveReviewId(remaining.length > 0 ? remaining[0].id : null);
      }
      toast.success(
        decision === "APPROVED" ? "Recovery Authorized" : "Intervention Rejected",
        `Review decision '${decision}' recorded successfully.`
      );
    } catch (err) {
      console.error("Submit review error", err);
      toast.error("Failed to submit decision", String(err));
    }
  };

  if (!merchantId) {
    return (
      <EmptyState
        title="Select a Merchant Workspace"
        description="Please select an active merchant workspace from the top header to access the Human Review Queue."
      />
    );
  }

  // Filter items by category
  const filteredReviews = reviews.filter((r) => {
    if (selectedCategory === "ALL") return true;
    if (selectedCategory === "HIGH_RISK") return r.risk_level === "HIGH" || r.risk_level === "CRITICAL";
    if (selectedCategory === "UNKNOWN_OUTCOMES") return r.reason_code?.includes("UNKNOWN") || r.why_human_review?.includes("timeout");
    if (selectedCategory === "LOW_CONFIDENCE") return (r.confidence || 0.8) < 0.7;
    return true;
  });

  const highRiskCount = reviews.filter((r) => r.risk_level === "HIGH" || r.risk_level === "CRITICAL").length;
  const unknownCount = reviews.filter((r) => r.reason_code?.includes("UNKNOWN") || r.why_human_review?.includes("timeout")).length;
  const lowConfCount = reviews.filter((r) => (r.confidence || 0.8) < 0.7).length;
  const totalVolumeInReview = reviews.reduce((acc, curr) => acc + (curr.amount || 0), 0);

  const activeReview = reviews.find((r) => r.id === activeReviewId) || (filteredReviews.length > 0 ? filteredReviews[0] : null);

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
              <UserCheck className="w-3.5 h-3.5" />
              OPERATOR GOVERNANCE DESK
            </span>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-[var(--radius-xs)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] font-mono text-[11px] text-[var(--fg-secondary)]">
              <Building2 className="w-3 h-3 text-[var(--brand-primary)]" />
              <span>{truncateId(merchantId, 10)}</span>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--status-warning-subtle)] text-[var(--status-warning-text)] border border-[var(--status-warning-border)]">
              POLICY QUARANTINE ACTIVE
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--fg-primary)] mt-2">
            Human Review & Exception Governance
          </h1>
          <p className="text-sm text-[var(--fg-secondary)] mt-1 max-w-2xl">
            Controlled autonomy interface. AI manages routine recoveries; operators authorize edge cases, unknown gateway outcomes, and high-ticket risk flags.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchReviews(true)}
            disabled={isRefreshing}
            className="flex items-center gap-2 h-9 px-4 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-raised)] text-xs font-semibold text-[var(--fg-primary)] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin text-[var(--brand-primary)]")} />
            <span>{isRefreshing ? "Refreshing…" : "Sync Queue"}</span>
          </button>
          <Link
            href="/audit"
            className="flex items-center gap-1.5 h-9 px-4 rounded-[var(--radius-md)] text-xs font-bold text-white transition-all"
            style={{ background: "var(--brand-primary)", boxShadow: "var(--glow-brand)" }}
          >
            Audit Trail
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────
          2. GOVERNANCE KPIS (TiltCard in INR)
          ────────────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: "Pending Reviews",
            value: reviews.length,
            formatType: "integer" as const,
            icon: ShieldAlert,
            color: "var(--status-warning)",
            borderColor: "var(--status-warning-border)",
            desc: "Cases quarantined by safety policy",
          },
          {
            title: "Capital in Quarantine",
            value: totalVolumeInReview,
            formatType: "currency" as const,
            icon: Lock,
            color: "var(--status-danger)",
            borderColor: "var(--status-danger-border)",
            desc: "Awaiting operator authorization",
          },
          {
            title: "High Risk Flags",
            value: highRiskCount,
            formatType: "integer" as const,
            icon: AlertTriangle,
            color: "var(--status-review)",
            borderColor: "var(--border-subtle)",
            desc: "Risk score > 0.85 or dispute history",
          },
          {
            title: "Avg Review SLA",
            value: 2.4,
            formatType: "integer" as const,
            unit: "min",
            icon: Clock,
            color: "var(--status-success)",
            borderColor: "var(--status-success-border)",
            desc: "Operator response turnaround speed",
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
                <span className="text-[10px] font-mono text-[var(--fg-tertiary)]">QUEUE</span>
              </div>
              <div className="text-2xl font-black font-mono text-[var(--fg-primary)]">
                {kpi.unit ? (
                  <span>{kpi.value} {kpi.unit}</span>
                ) : (
                  <AnimatedNumber value={kpi.value} formatType={kpi.formatType} currency="INR" />
                )}
              </div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--fg-tertiary)] mt-1">{kpi.title}</div>
              <p className="text-[11px] text-[var(--fg-quaternary)] mt-1">{kpi.desc}</p>
            </TiltCard>
          );
        })}
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────
          3. CATEGORY SELECTOR STRIP
          ────────────────────────────────────────────────────────────────────────── */}
      <ReviewQueueSummary
        totalPending={reviews.length}
        highRiskCount={highRiskCount}
        unknownOutcomeCount={unknownCount}
        lowConfidenceCount={lowConfCount}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      {/* ──────────────────────────────────────────────────────────────────────────
          4. SPLIT REVIEW DESK (Queue on Left, Evaluation Workspace on Right)
          ────────────────────────────────────────────────────────────────────────── */}
      {reviews.length === 0 ? (
        <div className="rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-12 text-center">
          <CheckCircle2 className="w-10 h-10 text-[var(--status-success)] mx-auto mb-3" />
          <h3 className="text-base font-bold text-[var(--fg-primary)]">Human Review Queue is Clear</h3>
          <p className="text-xs text-[var(--fg-secondary)] mt-1 max-w-md mx-auto">
            All transient failure exceptions have been handled by autonomous intelligence or authorized by operators.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Review Item Cards */}
          <div className="lg:col-span-4 space-y-3">
            <div className="text-xs font-mono font-bold text-[var(--fg-tertiary)] uppercase tracking-wider px-1">
              Active Exceptions ({filteredReviews.length})
            </div>
            <div className="space-y-2.5 max-h-[640px] overflow-y-auto no-scrollbar pr-1">
              {filteredReviews.map((item) => (
                <ReviewItemCard
                  key={item.id}
                  review={item}
                  onInspect={() => setActiveReviewId(item.id)}
                />
              ))}
            </div>
          </div>

          {/* Right Column: Active Review Workspace */}
          <div className="lg:col-span-8">
            {activeReview ? (
              <ReviewWorkspace
                review={activeReview}
                onSubmitDecision={handleSubmitDecision}
                auditEvents={auditEvents}
                isLoadingAudit={isLoadingAudit}
              />
            ) : (
              <div className="rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-10 text-center text-xs text-[var(--fg-tertiary)]">
                Select an exception from the queue to review justification.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReviewPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-96 items-center justify-center">
          <LoadingSpinner message="Loading Review Workspace…" />
        </div>
      }
    >
      <ReviewContent />
    </Suspense>
  );
}