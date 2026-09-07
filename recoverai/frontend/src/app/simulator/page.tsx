"use client";

import React, { Suspense, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMerchant } from "@/context/MerchantContext";
import { useToast } from "@/context/ToastContext";
import {
  createSimulation, getAudit, getRecoveryCase, getTransaction
} from "@/lib/api-services";
import {
  AuditEventOut, RecoveryCaseOut, TransactionOut,
  SimulationMetricsOut, SimulationCreateResponse
} from "@/types/api";
import { LoadingSpinner, EmptyState } from "@/components/ui-custom/FeedbackStates";
import { ScenarioCardSelector, SCENARIOS } from "@/components/simulator/ScenarioCardSelector";
import { LiveSimulationPipeline, StageState, SIMULATION_STAGES } from "@/components/simulator/LiveSimulationPipeline";
import { IdempotencyFailoverBanner } from "@/components/simulator/IdempotencyFailoverBanner";
import { SimulationResultCard } from "@/components/simulator/SimulationResultCard";
import { SimulationMetricsSummary } from "@/components/simulator/SimulationMetricsSummary";
import { SimulationReplayTimeline } from "@/components/simulator/SimulationReplayTimeline";
import { formatCurrency, formatTime, truncateId, cn } from "@/lib/utils";
import {
  Play, Loader2, Sparkles, Building2, ShieldAlert,
  CheckCircle2, AlertTriangle, RefreshCw, Terminal,
  Layers, Lock, RotateCcw, ShieldCheck, Zap, ArrowRight, X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/* ─────────────────────────────────────────────────────────────────────────────
   SimulatorPage — RecoverAI Interactive Simulation Workspace (/simulator)
   Deterministic test bench for simulating autonomous recovery orchestration,
   policy gates, safe idempotency locks, and operator reviews.
   ──────────────────────────────────────────────────────────────────────────── */

function SimulatorContent() {
  const searchParams = useSearchParams();
  const urlScenario = searchParams.get("scenario");
  const urlCaseId = searchParams.get("caseId");

  const { merchantId } = useMerchant();
  const { toast } = useToast();

  // Configuration state
  const [selectedScenario, setSelectedScenario] = useState<string>("A");
  const [targetCaseId, setTargetCaseId] = useState<string | null>(null);
  const [selectedCase, setSelectedCase] = useState<RecoveryCaseOut | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionOut | null>(null);
  const [isCaseLoading, setIsCaseLoading] = useState<boolean>(false);
  const [caseLoadError, setCaseLoadError] = useState<string | null>(null);

  // Synchronize URL parameters
  useEffect(() => {
    if (urlScenario && ["A", "B", "C", "D", "E"].includes(urlScenario.toUpperCase())) {
      setSelectedScenario(urlScenario.toUpperCase());
    }
    if (urlCaseId) {
      setTargetCaseId(urlCaseId);
    }
  }, [urlScenario, urlCaseId]);

  // Load selected case context when targetCaseId is present
  useEffect(() => {
    if (!merchantId || !targetCaseId) {
      setSelectedCase(null);
      setSelectedTransaction(null);
      setIsCaseLoading(false);
      setCaseLoadError(null);
      return;
    }

    let isSubscribed = true;
    setIsCaseLoading(true);
    setCaseLoadError(null);

    (async () => {
      try {
        const c = await getRecoveryCase(merchantId, targetCaseId);
        if (!isSubscribed) return;
        setSelectedCase(c);

        if (c.transaction_id) {
          try {
            const tx = await getTransaction(merchantId, c.transaction_id);
            if (isSubscribed) {
              setSelectedTransaction(tx);
            }
          } catch {
            // Optional transaction lookup
          }
        }
      } catch (err) {
        if (isSubscribed) {
          console.warn("Failed to load target case", err);
          setCaseLoadError(`Recovery case ${truncateId(targetCaseId, 10)} not found in active merchant workspace.`);
        }
      } finally {
        if (isSubscribed) {
          setIsCaseLoading(false);
        }
      }
    })();

    return () => {
      isSubscribed = false;
    };
  }, [merchantId, targetCaseId]);

  // Simulation execution telemetry
  const [simulationMetrics, setSimulationMetrics] = useState<SimulationMetricsOut | null>(null);
  const [caseId, setCaseId] = useState<string | null>(null);
  const [correlationId, setCorrelationId] = useState<string | null>(null);
  const [auditEvents, setAuditEvents] = useState<AuditEventOut[]>([]);

  // Pipeline stage progression states
  const [simulationState, setSimulationState] = useState<Record<string, StageState>>({});
  const [activeStageIdx, setActiveStageIdx] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Trigger Simulation via real backend API
  const startSimulation = async () => {
    if (!merchantId) return;

    setIsLoading(true);
    setError(null);
    setAuditEvents([]);
    setIsPlaying(false);
    setActiveStageIdx(-1);
    setSimulationState(
      SIMULATION_STAGES.reduce((acc, stage) => ({ ...acc, [stage.id]: "pending" }), {})
    );
    setSimulationMetrics(null);
    setCaseId(null);
    setCorrelationId(null);

    try {
      // Execute simulation synchronously via POST /api/simulations
      const res = await createSimulation(merchantId, {
        scenario: selectedScenario,
        execution_mode: "SIMULATION",
        configuration: (targetCaseId && !caseLoadError) ? { case_id: targetCaseId } : undefined,
      });

      if (!res.generated_cases || res.generated_cases.length === 0) {
        throw new Error("No cases generated by the simulator for this scenario.");
      }

      setSimulationMetrics(res.metrics);
      const generatedCaseId = res.generated_cases[0];
      setCaseId(generatedCaseId);

      // Fetch verified audit events produced by this simulation run
      const auditRes = await getAudit(merchantId, {
        recovery_case_id: generatedCaseId,
        size: 50,
      });

      const sortedEvents = (auditRes.items || []).sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      setAuditEvents(sortedEvents);
      if (sortedEvents[0]?.correlation_id) {
        setCorrelationId(sortedEvents[0].correlation_id);
      }

      // If the target case was not initially pre-loaded, look up the newly generated case
      if (!selectedCase) {
        try {
          const newCase = await getRecoveryCase(merchantId, generatedCaseId);
          setSelectedCase(newCase);
          if (newCase.transaction_id) {
            const newTx = await getTransaction(merchantId, newCase.transaction_id);
            setSelectedTransaction(newTx);
          }
        } catch {
          // Non-blocking fallback
        }
      }

      // Start the sequential animation loop
      setIsPlaying(true);
      setActiveStageIdx(0);
      toast.info(
        `Scenario ${selectedScenario} Dispatched`,
        "Simulating autonomous recovery orchestration pipeline…"
      );
    } catch (err) {
      console.error("Simulation run failed", err);
      setError(err instanceof Error ? err.message : String(err));
      toast.error("Simulation Failed", err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Staged Progression Loop (runs all 8 stages from SCANNING to terminal OUTCOME)
  useEffect(() => {
    if (!isPlaying || activeStageIdx < 0) return;

    if (activeStageIdx >= SIMULATION_STAGES.length) {
      setIsPlaying(false);
      return;
    }

    const currentStage = SIMULATION_STAGES[activeStageIdx];

    // Mark current stage as active
    setSimulationState((prev) => ({ ...prev, [currentStage.id]: "active" }));

    const timer = setTimeout(() => {
      let newState: StageState = "completed";

      if (currentStage.id === "POLICY_CHECK") {
        const policyEvt = auditEvents.find((e) => e.event_type === "PolicyEvaluated");
        const dec = policyEvt?.event_data?.decision;
        if (dec === "BLOCKED" || selectedScenario === "E") {
          newState = "blocked";
        } else {
          newState = "completed";
        }
      } else if (currentStage.id === "EXECUTING") {
        if (selectedScenario === "B" || selectedScenario === "E") {
          newState = "blocked";
        } else {
          newState = "completed";
        }
      } else if (currentStage.id === "OUTCOME") {
        if (
          selectedScenario === "C" ||
          auditEvents.some(
            (e) =>
              e.event_type === "ManualReviewCreated" &&
              (e.event_data?.outcome === "UNKNOWN" || e.event_data?.previous_state === "EXECUTING")
          )
        ) {
          newState = "unknown";
        } else if (selectedScenario === "B" || auditEvents.some((e) => e.event_type === "ManualReviewCreated")) {
          newState = "blocked";
        } else if (selectedScenario === "E" || auditEvents.some((e) => e.event_type === "RecoveryFailed")) {
          newState = "failed";
        } else {
          newState = "completed";
        }
      } else {
        newState = "completed";
      }

      setSimulationState((prev) => ({ ...prev, [currentStage.id]: newState }));

      const isTerminalStage = activeStageIdx === SIMULATION_STAGES.length - 1;

      if (!isTerminalStage) {
        setActiveStageIdx((idx) => idx + 1);
      } else {
        // Final stage (OUTCOME) reached
        setIsPlaying(false);
        if (newState === "unknown") {
          toast.warning(
            "Safe Failover Triggered",
            "Gateway timeout encountered. Blind retry blocked by idempotency lock."
          );
        } else if (selectedScenario === "B") {
          toast.info(
            "Policy Review Gated",
            "High customer risk score flagged. Escalated to Operator Review Queue."
          );
        } else if (selectedScenario === "E") {
          toast.warning(
            "Policy Constraints Enforced",
            "Maximum retry limit exceeded. Intervention halted safely."
          );
        } else {
          toast.success(
            "Pipeline Execution Complete",
            `Scenario ${selectedScenario} finished with verified telemetry.`
          );
        }
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [isPlaying, activeStageIdx, auditEvents, selectedScenario]);

  if (!merchantId) {
    return (
      <EmptyState
        title="Select a Merchant Workspace"
        description="Please select an active merchant workspace from the top header to initialize the AI Pipeline Simulator."
      />
    );
  }

  const currentScenarioDef = SCENARIOS.find((s) => s.id === selectedScenario) || SCENARIOS[0];
  const isScenarioC = selectedScenario === "C";
  const isOutcomeReached =
    simulationState["OUTCOME"] !== undefined &&
    simulationState["OUTCOME"] !== "pending" &&
    simulationState["OUTCOME"] !== "active";

  // Derive business metrics for results card
  const failedEvent = auditEvents.find((e) => e.event_type === "PaymentFailed");
  const originalAmount = selectedTransaction?.amount ?? (failedEvent?.event_data?.amount ?? null);

  const policyEvent = auditEvents.find((e) => e.event_type === "PolicyEvaluated");
  const policyDecision = (
    policyEvent?.event_data?.decision ||
    (selectedScenario === "B" ? "REVIEW" : selectedScenario === "E" ? "BLOCKED" : "APPROVED")
  ) as "APPROVED" | "REVIEW" | "BLOCKED";
  const policyReason = policyEvent?.event_data?.reason || null;

  const recoveryOutcome =
    selectedScenario === "A" || selectedScenario === "D"
      ? "SUCCEEDED"
      : selectedScenario === "B"
      ? "REVIEW_REQUIRED"
      : selectedScenario === "C"
      ? "TIMEOUT_LOCKED"
      : "BLOCKED";

  const actionTaken =
    selectedScenario === "A"
      ? "Scheduled Exponential Retry (Window: 120s)"
      : selectedScenario === "B"
      ? "Intervention Diverted to Human Review"
      : selectedScenario === "C"
      ? "Idempotency Failover Lock Reserved"
      : selectedScenario === "D"
      ? "Intent Window Optimization & Retry"
      : "Intervention Blocked by Policy Constraint";

  const attemptOutcome =
    selectedScenario === "A" || selectedScenario === "D"
      ? "Capital Successfully Settled to Merchant"
      : selectedScenario === "B"
      ? "Pending Human Review Decision"
      : selectedScenario === "C"
      ? "Gateway Timeout — Lock Preserved (Zero Blind Retries)"
      : "Attempt Threshold Exceeded (3 of 3 Attempts)";

  const finalCaseState =
    selectedScenario === "A" || selectedScenario === "D"
      ? "CLOSED"
      : selectedScenario === "B"
      ? "POLICY_CHECK"
      : selectedScenario === "C"
      ? "RECOVERING"
      : "RECOVERY_WINDOW_EXPIRED";

  return (
    <div className="space-y-8 pb-20">
      {/* ──────────────────────────────────────────────────────────────────────────
          1. SIMULATOR EXECUTIVE HEADER
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
              <Play className="w-3.5 h-3.5 fill-current" />
              INTERACTIVE PIPELINE SIMULATOR
            </span>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-[var(--radius-xs)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] font-mono text-[11px] text-[var(--fg-secondary)]">
              <Building2 className="w-3 h-3 text-[var(--brand-primary)]" />
              <span>{truncateId(merchantId, 10)}</span>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--brand-primary-muted)] text-[var(--brand-primary-light)] border border-[var(--brand-primary-ring)]">
              TEST BENCH READY
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--fg-primary)] mt-2">
            AI Recovery Pipeline Simulator
          </h1>
          <p className="text-sm text-[var(--fg-secondary)] mt-1 max-w-2xl">
            Simulate end-to-end payment drop-offs, observe real-time agent reasoning, inspect policy guardrails, and experience zero-chargeback idempotency failovers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setSimulationState({});
              setActiveStageIdx(-1);
              setIsPlaying(false);
              setAuditEvents([]);
              setSimulationMetrics(null);
              setError(null);
            }}
            disabled={isLoading || isPlaying}
            className="flex items-center gap-2 h-9 px-4 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-raised)] text-xs font-semibold text-[var(--fg-primary)] transition-colors disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
          <button
            onClick={startSimulation}
            disabled={isLoading || isPlaying}
            className="flex items-center gap-2 h-9 px-5 rounded-[var(--radius-md)] text-xs font-bold text-white transition-all disabled:opacity-50 shadow-md"
            style={{ background: "var(--brand-primary)", boxShadow: "var(--glow-brand)" }}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Simulating…</span>
              </>
            ) : isPlaying ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Running Pipeline…</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Execute Scenario {selectedScenario}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────
          2. SIMULATOR KPIS (Restrained Financial Cards)
          ────────────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: "Selected Scenario",
            value: `Scenario ${selectedScenario}`,
            sub: currentScenarioDef.name,
            icon: Sparkles,
            color: "var(--brand-primary)",
            borderColor: "var(--brand-primary-ring)",
          },
          {
            title: "Simulated Recovery Yield",
            value:
              simulationMetrics?.revenue_recovered !== undefined
                ? formatCurrency(simulationMetrics.revenue_recovered, "INR")
                : isOutcomeReached && (selectedScenario === "A" || selectedScenario === "D")
                ? formatCurrency(originalAmount || 0, "INR")
                : "₹0.00",
            sub: isOutcomeReached ? "Settlement ledger verified" : "Awaiting execution trigger",
            icon: CheckCircle2,
            color: "var(--status-success)",
            borderColor: "var(--status-success-border)",
          },
          {
            title: "Idempotency Safety",
            value: "SHA-256 Locked",
            sub: "Zero risk of duplicate billing",
            icon: ShieldCheck,
            color: "var(--status-info)",
            borderColor: "var(--status-info-border)",
          },
          {
            title: "Policy Engine Decision",
            value: isOutcomeReached ? policyDecision : "Pending",
            sub: isOutcomeReached ? (policyReason || "Rule boundary evaluated") : "Deterministic rule check",
            icon: Zap,
            color: policyDecision === "APPROVED" ? "var(--status-success)" : policyDecision === "REVIEW" ? "var(--status-review)" : "var(--status-warning)",
            borderColor: "var(--border-subtle)",
          },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.title}
              className="relative rounded-[var(--radius-xl)] border bg-[var(--bg-surface)] p-5 overflow-hidden transition-all duration-200 hover:border-white/20 hover:shadow-[var(--shadow-xs)]"
              style={{ borderColor: kpi.borderColor }}
            >
              <div className="absolute top-0 inset-x-0 h-[2px]" style={{ background: kpi.color, opacity: 0.8 }} />
              <div className="flex items-center justify-between mb-3">
                <div
                  className="w-8 h-8 rounded-[var(--radius-md)] flex items-center justify-center"
                  style={{
                    background: `color-mix(in srgb, ${kpi.color} 14%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${kpi.color} 24%, transparent)`,
                  }}
                >
                  <Icon className="w-4 h-4" style={{ color: kpi.color }} />
                </div>
                <span className="text-[10px] font-mono text-[var(--fg-tertiary)]">SIM</span>
              </div>
              <div className="text-xl sm:text-2xl font-black font-mono text-[var(--fg-primary)] truncate">
                {kpi.value}
              </div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--fg-tertiary)] mt-1 truncate">
                {kpi.title}
              </div>
              <p className="text-[11px] text-[var(--fg-quaternary)] mt-1 truncate">{kpi.sub}</p>
            </div>
          );
        })}
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────
          3. SCENARIO SELECTOR & CASE CONTEXT
          ────────────────────────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        {/* Dynamic Target Case Calibration Context Card */}
        {targetCaseId && (
          <div className="rounded-[var(--radius-xl)] border border-[var(--brand-primary-ring)] bg-[var(--bg-surface)] p-5 shadow-sm space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-[var(--radius-md)] bg-[var(--brand-primary-muted)] border border-[var(--brand-primary-ring)] flex items-center justify-center text-[var(--brand-primary-light)]">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--brand-primary-light)]">
                      Calibrated Target Case
                    </span>
                    {selectedCase && (
                      <span className={cn(
                        "text-[9px] font-mono font-bold px-2 py-0.5 rounded border uppercase",
                        selectedCase.state === "CLOSED" ? "bg-[var(--status-success-subtle)] text-[var(--status-success-text)] border-[var(--status-success-border)]" :
                        selectedCase.state === "RECOVERING" ? "bg-[var(--status-info-subtle)] text-[var(--status-info-text)] border-[var(--status-info-border)]" :
                        "bg-[var(--bg-raised)] text-[var(--fg-secondary)] border-[var(--border-subtle)]"
                      )}>
                        {selectedCase.state}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-mono font-bold text-[var(--fg-primary)] mt-0.5">
                    {targetCaseId}
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/recovery?caseId=${targetCaseId}`}
                  className="h-8 px-3 rounded-[var(--radius-sm)] text-xs font-semibold text-[var(--brand-primary-light)] bg-[var(--brand-primary-muted)] hover:bg-[var(--brand-primary-ring)]/30 border border-[var(--brand-primary-ring)] flex items-center gap-1.5 transition-colors"
                >
                  <span>Inspect Case</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
                <button
                  onClick={() => {
                    setTargetCaseId(null);
                    setSelectedCase(null);
                    setSelectedTransaction(null);
                    setCaseLoadError(null);
                    const params = new URLSearchParams();
                    params.set("scenario", selectedScenario);
                    window.history.replaceState(null, "", `/simulator?${params.toString()}`);
                  }}
                  className="h-8 px-2.5 rounded-[var(--radius-sm)] text-xs font-semibold text-[var(--fg-tertiary)] hover:text-[var(--fg-primary)] hover:bg-[var(--bg-raised)] border border-[var(--border-subtle)] transition-colors flex items-center gap-1"
                  title="Clear case calibration"
                >
                  <X className="w-3 h-3" />
                  <span>Clear Filter</span>
                </button>
              </div>
            </div>

            {isCaseLoading ? (
              <div className="flex items-center gap-2 text-xs text-[var(--fg-tertiary)] py-2">
                <Loader2 className="w-4 h-4 animate-spin text-[var(--brand-primary)]" />
                <span>Loading active case parameters from database…</span>
              </div>
            ) : caseLoadError ? (
              <div className="p-3 rounded-[var(--radius-md)] bg-[var(--status-warning-subtle)] border border-[var(--status-warning-border)] text-xs text-[var(--status-warning-text)]">
                Notice: {caseLoadError} Simulation will execute with benchmark defaults.
              </div>
            ) : selectedCase ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 font-mono text-xs">
                <div className="p-3 rounded-[var(--radius-md)] bg-[var(--bg-surface-alt)] border border-[var(--border-subtle)]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--fg-tertiary)] block">Transaction Amount</span>
                  <span className="text-base font-black text-[var(--fg-primary)] mt-0.5 block">
                    {selectedTransaction?.amount !== undefined
                      ? formatCurrency(selectedTransaction.amount, "INR")
                      : "—"}
                  </span>
                </div>
                <div className="p-3 rounded-[var(--radius-md)] bg-[var(--bg-surface-alt)] border border-[var(--border-subtle)]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--fg-tertiary)] block">Decline Reason</span>
                  <span className="text-xs font-bold text-[var(--status-danger-text)] mt-1 block truncate">
                    {selectedTransaction?.status || "GATEWAY_TIMEOUT"}
                  </span>
                </div>
                <div className="p-3 rounded-[var(--radius-md)] bg-[var(--bg-surface-alt)] border border-[var(--border-subtle)]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--fg-tertiary)] block">Recovery Confidence</span>
                  <span className="text-sm font-black text-[var(--status-success-text)] mt-0.5 block">
                    {selectedCase.confidence != null
                      ? `${Math.round(selectedCase.confidence * 100)}%`
                      : "—"}
                  </span>
                </div>
                <div className="p-3 rounded-[var(--radius-md)] bg-[var(--bg-surface-alt)] border border-[var(--border-subtle)]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--fg-tertiary)] block">Calibration Mode</span>
                  <span className="text-xs font-semibold text-[var(--fg-secondary)] mt-1 block">
                    Active Merchant Case
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="p-4 rounded-[var(--radius-lg)] bg-[var(--status-danger-subtle)] border border-[var(--status-danger-border)] text-[var(--status-danger-text)] flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[var(--status-danger)] shrink-0" />
              <span className="text-xs font-medium">
                Simulation error: {error}
              </span>
            </div>
            <button
              onClick={startSimulation}
              className="px-3 py-1 text-xs font-bold rounded bg-[var(--status-danger)] text-white hover:opacity-90 transition-opacity"
            >
              Retry Simulation
            </button>
          </div>
        )}

        {/* Scenario Selector */}
        <ScenarioCardSelector
          selectedScenario={selectedScenario}
          onSelect={(s: string) => {
            if (!isPlaying && !isLoading) {
              setSelectedScenario(s);
              setSimulationState({});
              setActiveStageIdx(-1);
              setSimulationMetrics(null);
              setAuditEvents([]);
              setError(null);
              const params = new URLSearchParams();
              params.set("scenario", s);
              if (targetCaseId) {
                params.set("caseId", targetCaseId);
              }
              window.history.replaceState(null, "", `/simulator?${params.toString()}`);
            }
          }}
          onSimulate={startSimulation}
          isRunning={isPlaying || isLoading}
        />
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────
          4. LIVE SIMULATION PIPELINE PROGRESSION
          ────────────────────────────────────────────────────────────────────────── */}
      <div className="rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
          <div>
            <span className="text-[10px] font-mono font-bold tracking-[0.1em] uppercase text-[var(--brand-primary)]">
              ORCHESTRATION PIPELINE
            </span>
            <h3 className="text-base font-bold text-[var(--fg-primary)] tracking-tight mt-0.5">
              Live Stage Progression
            </h3>
          </div>
          <div className="flex items-center gap-2 font-mono text-xs">
            {isPlaying && (
              <span className="flex items-center gap-1.5 text-[var(--brand-primary)] font-semibold">
                <span className="w-2 h-2 rounded-full bg-[var(--brand-primary)] animate-ping" />
                Executing Stage {activeStageIdx + 1}/{SIMULATION_STAGES.length}…
              </span>
            )}
            {isOutcomeReached && (
              <span className="flex items-center gap-1.5 text-[var(--status-success-text)] font-semibold">
                <CheckCircle2 className="w-4 h-4 text-[var(--status-success)]" />
                Terminal Outcome Reached
              </span>
            )}
          </div>
        </div>

        <LiveSimulationPipeline
          simulationState={simulationState}
          auditEvents={auditEvents}
          activeStageIdx={activeStageIdx}
          scenario={selectedScenario}
          caseId={caseId || targetCaseId}
        />
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────
          5. BUSINESS RESULT SCREEN (Step 5 of User Request)
          ────────────────────────────────────────────────────────────────────────── */}
      {isOutcomeReached && (
        <SimulationResultCard
          scenario={selectedScenario}
          scenarioName={currentScenarioDef.name}
          caseId={caseId || targetCaseId || "sim-generated-case"}
          transactionId={selectedTransaction?.id || auditEvents.find((e) => e.transaction_id)?.transaction_id}
          originalAmount={originalAmount}
          recoveredAmount={simulationMetrics?.revenue_recovered}
          recoveryOutcome={recoveryOutcome}
          actionTaken={actionTaken}
          attemptOutcome={attemptOutcome}
          finalCaseState={finalCaseState}
          policyDecision={policyDecision}
          policyReason={policyReason}
          executionMode="SIMULATION"
          metrics={simulationMetrics}
          auditEvents={auditEvents}
        />
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          6. IDEMPOTENCY FAILOVER BANNER (Scenario C)
          ────────────────────────────────────────────────────────────────────────── */}
      {isScenarioC && isOutcomeReached && (
        <IdempotencyFailoverBanner
          caseId={caseId || targetCaseId || "case-sim-idem-001"}
          correlationId={correlationId || "corr-idem-lock-001"}
        />
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          7. VERIFIED SUMMARY METRICS STRIP
          ────────────────────────────────────────────────────────────────────────── */}
      {simulationMetrics && (
        <SimulationMetricsSummary
          metrics={simulationMetrics}
          scenario={selectedScenario}
        />
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          8. REPLAY TIMELINE & DECISION STREAM (Step 6 of User Request)
          ────────────────────────────────────────────────────────────────────────── */}
      {auditEvents.length > 0 && (
        <SimulationReplayTimeline
          events={auditEvents}
          scenario={selectedScenario}
        />
      )}
    </div>
  );
}

export default function SimulatorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-96 items-center justify-center">
          <LoadingSpinner message="Calibrating Simulation Engine…" />
        </div>
      }
    >
      <SimulatorContent />
    </Suspense>
  );
}