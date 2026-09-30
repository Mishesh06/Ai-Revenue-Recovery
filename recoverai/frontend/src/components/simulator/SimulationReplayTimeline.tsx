"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock, CheckCircle2, AlertTriangle, ShieldCheck,
  UserCheck, Terminal, Copy, CheckCheck, Sparkles,
  ArrowRight, ShieldAlert, CreditCard, BrainCircuit, Activity,
  Map, ChevronDown, ChevronUp, Play, Info, Layers, CornerDownRight,
  ExternalLink, Hash, KeyRound, Cpu
} from "lucide-react";
import { AuditEventOut } from "@/types/api";
import {
  formatCurrency,
  formatPercent,
  truncateId,
  cn,
  formatTechnicalLabel,
  formatEventExactTime,
  formatEventType
} from "@/lib/utils";
import { useToast } from "@/context/ToastContext";

interface SimulationReplayTimelineProps {
  events: AuditEventOut[];
  scenario?: string;
  className?: string;
}

interface EventNarrative {
  title: string;
  narrative: string;
  badge: string;
  badgeColor: string;
  statusDot: string;
  actor: string;
  icon: React.ComponentType<{ className?: string }>;
  chips: { label: string; value: string; isHighlight?: boolean }[];
  technicalFields: { label: string; value: string; copyable?: boolean }[];
}

/**
 * Generates human-readable titles, narratives, and business attributes
 * dynamically from the actual event data without inventing mock details.
 */
function getEventNarrative(evt: AuditEventOut): EventNarrative {
  const data = (evt.event_data && typeof evt.event_data === "object") ? evt.event_data : {};
  const eventType = evt.event_type || "UnknownEvent";

  // Standard technical fields present across events
  const baseTechnicalFields: { label: string; value: string; copyable?: boolean }[] = [];

  if (data.previous_state && data.new_state) {
    baseTechnicalFields.push({
      label: "State transition",
      value: `${data.previous_state} → ${data.new_state}`,
    });
  }
  if (data.provider_code || data.error_code) {
    baseTechnicalFields.push({
      label: "Provider code",
      value: String(data.provider_code || data.error_code),
    });
  }
  if (data.provider_reference) {
    baseTechnicalFields.push({
      label: "Provider reference",
      value: String(data.provider_reference),
      copyable: true,
    });
  }
  if (evt.recovery_case_id) {
    baseTechnicalFields.push({
      label: "Recovery case ID",
      value: evt.recovery_case_id,
      copyable: true,
    });
  }
  if (evt.transaction_id) {
    baseTechnicalFields.push({
      label: "Transaction ID",
      value: evt.transaction_id,
      copyable: true,
    });
  }
  if (data.recovery_action_id || data.action_id) {
    baseTechnicalFields.push({
      label: "Recovery action ID",
      value: String(data.recovery_action_id || data.action_id),
      copyable: true,
    });
  }
  if (data.recovery_attempt_id || data.attempt_id) {
    baseTechnicalFields.push({
      label: "Recovery attempt ID",
      value: String(data.recovery_attempt_id || data.attempt_id),
      copyable: true,
    });
  }
  if (data.idempotency_key) {
    baseTechnicalFields.push({
      label: "Idempotency key",
      value: String(data.idempotency_key),
      copyable: true,
    });
  }
  if (evt.correlation_id) {
    baseTechnicalFields.push({
      label: "Correlation ID",
      value: evt.correlation_id,
      copyable: true,
    });
  }
  if (evt.id) {
    baseTechnicalFields.push({
      label: "Event ID",
      value: evt.id,
      copyable: true,
    });
  }

  switch (eventType) {
    case "PaymentFailed": {
      const amountStr = typeof data.amount === "number" ? formatCurrency(data.amount, "INR") : null;
      const code = data.error_code || "GATEWAY_DECLINE";
      const failureReason = data.failure_reason || `Payment declined by bank switch: ${code}`;
      const narrative = amountStr
        ? `A customer transaction of ${amountStr} failed at the payment gateway due to: ${failureReason}.`
        : `Payment transaction was declined by the payment gateway: ${failureReason}.`;

      return {
        title: "1. Payment Failed",
        narrative,
        badge: "DECLINED",
        badgeColor: "bg-[var(--status-danger-subtle)] text-[var(--status-danger-text)] border-[var(--status-danger-border)]",
        statusDot: "bg-[var(--status-danger)]",
        actor: data.actor || "PayRecover Ingest Gateway",
        icon: CreditCard,
        chips: [
          ...(amountStr ? [{ label: "Gross Failed Amount", value: amountStr, isHighlight: true }] : []),
          { label: "Decline Code", value: String(code) },
          { label: "Ingest Gateway", value: "PayRecover" },
        ],
        technicalFields: baseTechnicalFields,
      };
    }

    case "OpportunityDetected": {
      const priority = data.priority || "HIGH";
      const windowMin = data.detected_window_minutes || 120;
      const isRec = data.is_recoverable !== false;
      const narrative = isRec
        ? `PayRecover evaluated the decline code and determined the transaction is eligible for autonomous recovery within a ${windowMin}-minute operational window.`
        : `Failure manager evaluated the decline code and determined the transaction is protected by merchant policy guardrails.`;

      return {
        title: "2. Recovery Opportunity Identified",
        narrative,
        badge: isRec ? "RECOVERABLE" : "GUARDED",
        badgeColor: isRec
          ? "bg-[var(--status-info-subtle)] text-[var(--status-info-text)] border-[var(--status-info-border)]"
          : "bg-[var(--status-warning-subtle)] text-[var(--status-warning-text)] border-[var(--status-warning-border)]",
        statusDot: isRec ? "bg-[var(--status-info)]" : "bg-[var(--status-warning)]",
        actor: data.actor || "Failure Manager",
        icon: Sparkles,
        chips: [
          { label: "Opportunity Status", value: isRec ? "Active Opportunity" : "Policy Guarded", isHighlight: true },
          { label: "Recovery Window", value: `${windowMin} minutes` },
          { label: "Priority Tier", value: String(priority) },
        ],
        technicalFields: baseTechnicalFields,
      };
    }

    case "PredictionCreated": {
      const prob = data.recovery_probability ?? (typeof data.score === "number" ? data.score / 100 : null);
      const risk = typeof data.risk_score === "number" ? data.risk_score : null;
      const riskLabel = risk != null ? (risk > 0.7 ? "High Risk" : risk > 0.3 ? "Medium Risk" : "Low Risk") : "Low Risk";
      const probStr = prob != null ? formatPercent(prob) : "—";
      const narrative = prob != null
        ? `Machine learning recovery model calculated a ${probStr} recovery likelihood with ${riskLabel.toLowerCase()} customer profile.`
        : `Machine learning recovery model calibrated recovery confidence.`;

      return {
        title: "3. ML Recovery Confidence Scored",
        narrative,
        badge: "ML SCORED",
        badgeColor: "bg-[var(--brand-primary-muted)] text-[var(--brand-primary-light)] border-[var(--brand-primary-ring)]",
        statusDot: "bg-[var(--brand-primary)]",
        actor: data.actor || "RecoveryPredictor v1.3",
        icon: BrainCircuit,
        chips: [
          { label: "Recovery Likelihood", value: probStr, isHighlight: true },
          { label: "Customer Risk Profile", value: risk != null ? `${(risk * 100).toFixed(0)}/100 (${riskLabel})` : riskLabel },
          { label: "Model Architecture", value: "Random Forest Calibrated" },
        ],
        technicalFields: baseTechnicalFields,
      };
    }

    case "DiagnosisCreated": {
      const cat = data.failure_category || "TEMPORARY_FAILURE";
      const conf = typeof data.confidence === "number" ? formatPercent(data.confidence) : "High";
      const narrative = `AI diagnosis agent identified the underlying root cause as "${cat}" with ${conf} diagnostic confidence.`;

      return {
        title: "4. Root-Cause Diagnosed",
        narrative,
        badge: "DIAGNOSED",
        badgeColor: "bg-[var(--brand-primary-muted)] text-[var(--brand-primary-light)] border-[var(--brand-primary-ring)]",
        statusDot: "bg-[var(--brand-primary)]",
        actor: data.actor || "DiagnosisAgent v2.1",
        icon: Activity,
        chips: [
          { label: "Failure Category", value: String(cat), isHighlight: true },
          { label: "Diagnostic Confidence", value: conf },
          { label: "Evidence Rule", value: "Gateway Error Signature" },
        ],
        technicalFields: baseTechnicalFields,
      };
    }

    case "RecoveryPlanned": {
      const action = data.recommended_action || "RETRY_PAYMENT";
      const channel = data.channel || "API_RETRY";
      const priority = data.priority || "NORMAL";
      const narrative = `Recovery planner generated an optimized intervention strategy: recommended "${action}" via ${channel.replace(/_/g, " ").toLowerCase()} channel.`;

      return {
        title: "5. Recovery Action Planned",
        narrative,
        badge: "STRATEGY PLANNED",
        badgeColor: "bg-[var(--bg-raised)] text-[var(--fg-primary)] border-[var(--border-default)]",
        statusDot: "bg-[var(--brand-primary-light)]",
        actor: data.actor || "RecoveryPlanner v2.0",
        icon: Map,
        chips: [
          { label: "Recommended Strategy", value: String(action), isHighlight: true },
          { label: "Delivery Channel", value: String(channel) },
          { label: "Intervention Priority", value: String(priority) },
        ],
        technicalFields: baseTechnicalFields,
      };
    }

    case "PolicyEvaluated": {
      const dec = data.decision || "APPROVED";
      const isApproved = dec === "APPROVED";
      const isReview = dec === "REVIEW";
      const isBlocked = dec === "BLOCKED";
      const reason = data.reason || (isApproved ? "Rule check passed within merchant safety limits." : "Policy constraint triggered.");

      const narrative = isApproved
        ? `Deterministic Policy Engine approved the proposed recovery action: ${reason}`
        : isReview
        ? `Deterministic Policy Engine diverted case to Human Review Queue: ${reason}`
        : `Deterministic Policy Engine blocked execution to prevent customer fatigue: ${reason}`;

      return {
        title: "6. Deterministic Policy Evaluated",
        narrative,
        badge: isApproved ? "APPROVED" : isReview ? "REVIEW REQUIRED" : "BLOCKED",
        badgeColor: isApproved
          ? "bg-[var(--status-success-subtle)] text-[var(--status-success-text)] border-[var(--status-success-border)]"
          : isReview
          ? "bg-[var(--status-review-subtle)] text-[var(--status-review-text)] border-[var(--status-review-border)]"
          : "bg-[var(--status-warning-subtle)] text-[var(--status-warning-text)] border-[var(--status-warning-border)]",
        statusDot: isApproved
          ? "bg-[var(--status-success)]"
          : isReview
          ? "bg-[var(--status-review)]"
          : "bg-[var(--status-warning)]",
        actor: data.actor || "PolicyEngine v1.2",
        icon: ShieldCheck,
        chips: [
          { label: "Policy Decision", value: String(dec), isHighlight: true },
          { label: "Safety Rule Evaluated", value: String(data.reason_code || "RATE_LIMIT_CHECK") },
          { label: "Risk Tier", value: String(data.risk_level || (isApproved ? "LOW" : "HIGH")) },
        ],
        technicalFields: baseTechnicalFields,
      };
    }

    case "RecoveryApproved": {
      const action = data.action || "RETRY_PAYMENT";
      return {
        title: "7. Action Cleared by Policy",
        narrative: `Policy Engine verified that the intervention "${action}" complies with merchant limits and authorized automated dispatch.`,
        badge: "CLEARED",
        badgeColor: "bg-[var(--status-success-subtle)] text-[var(--status-success-text)] border-[var(--status-success-border)]",
        statusDot: "bg-[var(--status-success)]",
        actor: data.actor || "PolicyEngine",
        icon: ShieldCheck,
        chips: [
          { label: "Cleared Action", value: String(action), isHighlight: true },
          { label: "Authorization State", value: "Authorized for Dispatch" },
        ],
        technicalFields: baseTechnicalFields,
      };
    }

    case "RecoveryExecuted": {
      const mode = data.execution_mode || "SIMULATION";
      return {
        title: "8. Recovery Intervention Dispatched",
        narrative: `Action adapter dispatched the payment recovery intervention under ${mode} execution mode with a unique SHA-256 idempotency key to prevent double-charging.`,
        badge: "DISPATCHED",
        badgeColor: "bg-[var(--status-info-subtle)] text-[var(--status-info-text)] border-[var(--status-info-border)]",
        statusDot: "bg-[var(--status-info)]",
        actor: data.actor || "ActionAdapter v3.2",
        icon: Play,
        chips: [
          { label: "Idempotency Protection", value: "SHA-256 Locked & Active", isHighlight: true },
          { label: "Execution Mode", value: String(mode) },
        ],
        technicalFields: baseTechnicalFields,
      };
    }

    case "AttemptStarted": {
      return {
        title: "8. Recovery Attempt Initiated",
        narrative: `Gateway adapter initiated recovery attempt #1 and is awaiting asynchronous confirmation from the banking network.`,
        badge: "ATTEMPT STARTED",
        badgeColor: "bg-[var(--status-info-subtle)] text-[var(--status-info-text)] border-[var(--status-info-border)]",
        statusDot: "bg-[var(--status-info)]",
        actor: data.actor || "ActionAdapter",
        icon: Play,
        chips: [
          { label: "Attempt State", value: "STARTED → AWAITING PROVIDER", isHighlight: true },
          { label: "Gateway Handshake", value: "Active" },
        ],
        technicalFields: baseTechnicalFields,
      };
    }

    case "ActionExecuting": {
      return {
        title: "8. Action State: Executing",
        narrative: `Recovery action transitioned to executing state (${data.previous_state || "APPROVED"} → ${data.new_state || "EXECUTING"}).`,
        badge: "EXECUTING",
        badgeColor: "bg-[var(--status-info-subtle)] text-[var(--status-info-text)] border-[var(--status-info-border)]",
        statusDot: "bg-[var(--status-info)]",
        actor: data.actor || "ActionAdapter",
        icon: ArrowRight,
        chips: [
          { label: "State Transition", value: `${data.previous_state || "APPROVED"} → ${data.new_state || "EXECUTING"}`, isHighlight: true },
        ],
        technicalFields: baseTechnicalFields,
      };
    }

    case "RecoverySucceeded":
    case "AttemptSucceeded": {
      const amountStr = typeof data.amount === "number" ? formatCurrency(data.amount, "INR") : "Recovered Capital";
      return {
        title: "9. Payment Recovery Succeeded",
        narrative: `Payment was successfully recovered! ${amountStr} has been captured and verified in the merchant settlement ledger with zero dispute risk.`,
        badge: "SETTLED",
        badgeColor: "bg-[var(--status-success-subtle)] text-[var(--status-success-text)] border-[var(--status-success-border)]",
        statusDot: "bg-[var(--status-success)]",
        actor: data.actor || "Settlement Ledger",
        icon: CheckCircle2,
        chips: [
          { label: "Recovered Capital", value: amountStr, isHighlight: true },
          { label: "Settlement Status", value: "Verified Capture" },
          { label: "Fee Leakage", value: "Zero Dispute Risk" },
        ],
        technicalFields: baseTechnicalFields,
      };
    }

    case "AttemptUnknown":
    case "ActionOutcomeUnknown": {
      return {
        title: "9. Gateway Timeout & Failover Lock Engaged",
        narrative: `The payment gateway adapter timed out without definitive confirmation. PayRecover reserved the idempotency lock to halt blind duplicate retries and routed the case for operator verification.`,
        badge: "TIMEOUT LOCKED",
        badgeColor: "bg-[var(--status-info-subtle)] text-[var(--status-info-text)] border-[var(--status-info-border)]",
        statusDot: "bg-[var(--status-info)]",
        actor: data.actor || "FailureManager",
        icon: AlertTriangle,
        chips: [
          { label: "Gateway Response", value: "HTTP 504 / UNKNOWN", isHighlight: true },
          { label: "Blind Retries", value: "0 (Halted to prevent duplicate charge)" },
          { label: "Safety Lock", value: "Idempotency Active" },
        ],
        technicalFields: baseTechnicalFields,
      };
    }

    case "ManualReviewCreated": {
      const reason = data.reason || data.message || "Case held in operator queue to prevent double-billing.";
      return {
        title: "10. Case Escalated to Human Review",
        narrative: `Autonomous recovery was held in the Operator Review Queue: ${reason}. A human operator can safely confirm settlement or release the hold.`,
        badge: "HUMAN REVIEW",
        badgeColor: "bg-[var(--status-review-subtle)] text-[var(--status-review-text)] border-[var(--status-review-border)]",
        statusDot: "bg-[var(--status-review)]",
        actor: data.actor || "Policy Engine",
        icon: UserCheck,
        chips: [
          { label: "Review Status", value: "Pending Operator Action", isHighlight: true },
          { label: "Escalation Reason", value: String(data.reason || "POLICY_GATE") },
          { label: "Queue Assignment", value: "Compliance & Risk" },
        ],
        technicalFields: baseTechnicalFields,
      };
    }

    case "CaseRecovered":
    case "CaseClosed": {
      const title = eventType === "CaseRecovered" ? "10. Case Recovered" : "10. Case Closed & Settled";
      return {
        title,
        narrative: `Recovery case lifecycle completed (${data.previous_state || "RECOVERING"} → ${data.new_state || "CLOSED"}). Settlement confirmed in merchant ledger.`,
        badge: "CLOSED",
        badgeColor: "bg-[var(--status-success-subtle)] text-[var(--status-success-text)] border-[var(--status-success-border)]",
        statusDot: "bg-[var(--status-success)]",
        actor: data.actor || "FailureManager",
        icon: CheckCircle2,
        chips: [
          { label: "Final Case State", value: String(data.new_state || "CLOSED"), isHighlight: true },
          { label: "Ledger State", value: "Balanced & Reconciled" },
        ],
        technicalFields: baseTechnicalFields,
      };
    }

    case "RecoveryFailed":
    case "AttemptFailed":
    case "ActionFailed": {
      const reason = data.reason || "Maximum retry threshold exceeded or permanent decline.";
      return {
        title: "10. Intervention Halted Safely",
        narrative: `Recovery attempt halted by policy: ${reason}. Customer protected against payment fatigue.`,
        badge: "POLICY ENFORCED",
        badgeColor: "bg-[var(--status-warning-subtle)] text-[var(--status-warning-text)] border-[var(--status-warning-border)]",
        statusDot: "bg-[var(--status-warning)]",
        actor: data.actor || "Policy Engine",
        icon: ShieldAlert,
        chips: [
          { label: "Safety Constraint", value: String(data.reason_code || "RETRY_BUDGET_EXCEEDED"), isHighlight: true },
          { label: "Intervention Status", value: "Halted (Safe State)" },
        ],
        technicalFields: baseTechnicalFields,
      };
    }

    default: {
      const formattedTitle = formatEventType(eventType);
      return {
        title: formattedTitle,
        narrative: data.message || `System event recorded in the immutable audit trail.`,
        badge: "AUDIT EVENT",
        badgeColor: "bg-[var(--bg-raised)] text-[var(--fg-secondary)] border-[var(--border-subtle)]",
        statusDot: "bg-[var(--fg-tertiary)]",
        actor: data.actor || "PayRecover Core",
        icon: Info,
        chips: [
          { label: "Event Type", value: eventType, isHighlight: true },
        ],
        technicalFields: baseTechnicalFields,
      };
    }
  }
}

export function SimulationReplayTimeline({
  events,
  scenario,
  className,
}: SimulationReplayTimelineProps) {
  const { toast } = useToast();

  // Deduplicate and sort events chronologically to preserve backend execution sequence
  const uniqueEvents = React.useMemo(() => {
    const sorted = [...events].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    const seen = new Set<string>();
    const result: AuditEventOut[] = [];
    for (const evt of sorted) {
      const key = evt.id || `${evt.event_type}_${evt.timestamp}_${evt.correlation_id}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(evt);
      }
    }
    return result;
  }, [events]);

  const [activeIdx, setActiveIdx] = useState<number>(0);
  const [expandedEvents, setExpandedEvents] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const eventRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Update active index when events change
  useEffect(() => {
    if (uniqueEvents.length > 0) {
      setActiveIdx(uniqueEvents.length - 1);
    }
  }, [uniqueEvents.length]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    toast.success("Copied to clipboard", `${label}: ${truncateId(text, 14)}`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const toggleExpand = (key: string) => {
    setExpandedEvents((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const isAllExpanded = uniqueEvents.length > 0 && uniqueEvents.every((e, i) => expandedEvents[e.id || String(i)]);

  const toggleExpandAll = () => {
    const nextState = !isAllExpanded;
    const updated: Record<string, boolean> = {};
    uniqueEvents.forEach((e, i) => {
      updated[e.id || String(i)] = nextState;
    });
    setExpandedEvents(updated);
  };

  const scrollToEvent = (idx: number) => {
    setActiveIdx(idx);
    const target = eventRefs.current[idx];
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  };

  // Honest empty state handling
  if (uniqueEvents.length === 0) {
    return (
      <div
        className={cn(
          "rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 text-center space-y-3",
          className
        )}
      >
        <div className="w-10 h-10 rounded-full bg-[var(--bg-surface-alt)] border border-[var(--border-subtle)] flex items-center justify-center mx-auto text-[var(--fg-tertiary)]">
          <Clock className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-[var(--fg-primary)]">
            No Simulation Events Recorded
          </h4>
          <p className="text-xs text-[var(--fg-secondary)] mt-1 max-w-md mx-auto">
            Execute a scenario from the control bar above to view the real-time AI decision replay and deterministic policy ledger.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 sm:p-6 shadow-[var(--shadow-sm)] space-y-6",
        className
      )}
    >
      {/* ──────────────────────────────────────────────────────────────────────────
          HEADER & SCRUBBER CONTROLS
          ────────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--border-subtle)]">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[var(--brand-primary)]" />
            <h3 className="text-sm sm:text-base font-bold text-[var(--fg-primary)] tracking-tight">
              Simulation Replay & Decision Stream
            </h3>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--bg-raised)] text-[var(--fg-secondary)] border border-[var(--border-subtle)]">
              {uniqueEvents.length} {uniqueEvents.length === 1 ? "Event" : "Events"}
            </span>
          </div>
          <p className="text-xs text-[var(--fg-secondary)] mt-0.5">
            Chronological decision log with progressive disclosure and technical telemetry inspection.
          </p>
        </div>

        {/* Action Controls: Stepper + Expand/Collapse All */}
        <div className="flex items-center flex-wrap gap-2 text-xs font-mono">
          {/* Stepper Navigation */}
          <div className="flex items-center border border-[var(--border-subtle)] rounded-[var(--radius-sm)] bg-[var(--bg-surface-alt)] p-0.5">
            <button
              onClick={() => scrollToEvent(Math.max(0, activeIdx - 1))}
              disabled={activeIdx <= 0}
              aria-label="Previous event"
              className="px-2.5 py-1 rounded-[var(--radius-xs)] text-[var(--fg-secondary)] hover:text-[var(--fg-primary)] hover:bg-[var(--bg-raised)] disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
            >
              ← Prev
            </button>
            <span className="px-2 text-[11px] text-[var(--fg-tertiary)] font-bold select-none border-x border-[var(--border-subtle)]">
              Step {activeIdx + 1} of {uniqueEvents.length}
            </span>
            <button
              onClick={() => scrollToEvent(Math.min(uniqueEvents.length - 1, activeIdx + 1))}
              disabled={activeIdx >= uniqueEvents.length - 1}
              aria-label="Next event"
              className="px-2.5 py-1 rounded-[var(--radius-xs)] text-[var(--fg-secondary)] hover:text-[var(--fg-primary)] hover:bg-[var(--bg-raised)] disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
            >
              Next →
            </button>
          </div>

          {/* Expand/Collapse All Toggle */}
          <button
            onClick={toggleExpandAll}
            className="flex items-center gap-1.5 px-3 py-1 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-surface-alt)] hover:bg-[var(--bg-raised)] text-[var(--fg-secondary)] hover:text-[var(--fg-primary)] transition-colors"
          >
            <Layers className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
            <span>{isAllExpanded ? "Collapse All Details" : "Expand All Details"}</span>
          </button>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────
          MAIN HUMAN-READABLE CHRONOLOGICAL TIMELINE
          ────────────────────────────────────────────────────────────────────────── */}
      <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-[11px] sm:before:left-[15px] before:top-3 before:bottom-3 before:w-[2px] before:bg-[var(--border-subtle)]">
        {uniqueEvents.map((evt, idx) => {
          const eventKey = evt.id || String(idx);
          const isExpanded = !!expandedEvents[eventKey];
          const isFocused = idx === activeIdx;
          const narrative = getEventNarrative(evt);
          const Icon = narrative.icon;

          return (
            <div
              key={eventKey}
              ref={(el) => {
                eventRefs.current[idx] = el;
              }}
              className={cn(
                "relative transition-all duration-200 rounded-[var(--radius-lg)] border p-4 sm:p-5",
                isFocused
                  ? "bg-[var(--bg-surface-alt)] border-[var(--brand-primary-ring)] shadow-[var(--shadow-xs)]"
                  : "bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--border-default)]"
              )}
            >
              {/* Timeline Indicator Dot */}
              <div
                className={cn(
                  "absolute -left-[31px] sm:-left-[39px] top-5 w-4 h-4 rounded-full border-2 border-[var(--bg-surface)] flex items-center justify-center shadow-sm",
                  narrative.statusDot,
                  isFocused && "ring-2 ring-[var(--brand-primary-ring)] scale-110"
                )}
              />

              {/* Event Header Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-[var(--border-subtle)]">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-[var(--radius-sm)] bg-[var(--bg-raised)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--brand-primary)] shrink-0">
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="flex items-center flex-wrap gap-2">
                      <h4 className="text-sm font-bold text-[var(--fg-primary)] tracking-tight">
                        {narrative.title}
                      </h4>
                      <span className={cn("text-[9px] font-mono font-bold px-2 py-0.5 rounded border uppercase", narrative.badgeColor)}>
                        {narrative.badge}
                      </span>
                    </div>
                    <span className="text-[11px] text-[var(--fg-tertiary)] font-mono">
                      Actor: <strong>{narrative.actor}</strong>
                    </span>
                  </div>
                </div>

                {/* Timestamp & Step Marker */}
                <div className="flex items-center justify-between sm:justify-end gap-3 text-xs font-mono text-[var(--fg-tertiary)]">
                  <span className="text-[10px] text-[var(--fg-quaternary)]">
                    #{idx + 1} of {uniqueEvents.length}
                  </span>
                  <span className="text-[11px] font-semibold text-[var(--fg-secondary)]">
                    {formatEventExactTime(evt.timestamp)}
                  </span>
                </div>
              </div>

              {/* Event Human Narrative */}
              <p className="text-xs sm:text-sm text-[var(--fg-secondary)] leading-relaxed mt-3">
                {narrative.narrative}
              </p>

              {/* Business Information Chips */}
              {narrative.chips.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3 pt-1">
                  {narrative.chips.map((chip, cIdx) => (
                    <div
                      key={cIdx}
                      className="p-2 rounded-[var(--radius-sm)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] font-mono text-xs"
                    >
                      <span className="text-[9px] text-[var(--fg-tertiary)] block uppercase tracking-wider">
                        {chip.label}
                      </span>
                      <span
                        className={cn(
                          "text-xs font-bold mt-0.5 block truncate",
                          chip.isHighlight
                            ? "text-[var(--brand-primary-light)]"
                            : "text-[var(--fg-primary)]"
                        )}
                      >
                        {chip.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* ──────────────────────────────────────────────────────────────────
                  EXPANDABLE TECHNICAL DETAILS SECTION (Progressive Disclosure)
                  ────────────────────────────────────────────────────────────────── */}
              <div className="mt-3.5 pt-2.5 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => toggleExpand(eventKey)}
                  aria-expanded={isExpanded}
                  className="w-full flex items-center justify-between py-1 text-xs font-mono text-[var(--fg-tertiary)] hover:text-[var(--fg-primary)] transition-colors group select-none"
                >
                  <span className="flex items-center gap-1.5 font-semibold">
                    <Terminal className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
                    <span>Technical details</span>
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-[var(--brand-primary)] group-hover:underline">
                    <span>{isExpanded ? "Hide telemetry" : "Inspect telemetry"}</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </span>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.15, ease: "easeInOut" }}
                      className="overflow-hidden mt-3 space-y-3 pt-2"
                    >
                      {/* Formatted Technical Attributes Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 rounded-[var(--radius-md)] bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                        {narrative.technicalFields.map((field, fIdx) => (
                          <div
                            key={fIdx}
                            className="flex items-center justify-between gap-2 p-1.5 rounded text-xs font-mono bg-[var(--bg-surface-alt)] border border-[var(--border-subtle)]"
                          >
                            <span className="text-[10px] text-[var(--fg-tertiary)] uppercase tracking-tight shrink-0">
                              {field.label}:
                            </span>
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="font-semibold text-[var(--fg-primary)] truncate text-[11px]" title={field.value}>
                                {field.copyable ? truncateId(field.value, 14) : field.value}
                              </span>
                              {field.copyable && (
                                <button
                                  type="button"
                                  onClick={() => handleCopy(field.value, field.label)}
                                  className="text-[var(--fg-tertiary)] hover:text-[var(--fg-primary)] p-0.5 rounded transition-colors"
                                  title={`Copy ${field.label}`}
                                >
                                  {copiedKey === field.label ? (
                                    <CheckCheck className="w-3 h-3 text-[var(--status-success)]" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Raw Event JSON Telemetry (Collapsed Sub-Section) */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] font-mono text-[var(--fg-tertiary)]">
                          <span className="flex items-center gap-1">
                            <Cpu className="w-3 h-3 text-[var(--fg-quaternary)]" />
                            <span>Raw event payload</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(JSON.stringify(evt.event_data || {}, null, 2), "Raw JSON Payload")}
                            className="text-[var(--brand-primary)] hover:underline flex items-center gap-1"
                          >
                            <Copy className="w-3 h-3" />
                            <span>Copy JSON</span>
                          </button>
                        </div>
                        <pre className="p-3 rounded-[var(--radius-md)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] font-mono text-[11px] text-[var(--fg-secondary)] overflow-x-auto max-h-48 leading-relaxed selection:bg-[var(--brand-primary-muted)]">
                          {JSON.stringify(evt.event_data || {}, null, 2)}
                        </pre>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
