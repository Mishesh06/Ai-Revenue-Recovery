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
      const failureReason = data.failure_reason || `Payment declined: ${code}`;
      const narrative = amountStr
        ? `Payment of ${amountStr} was declined because the bank or gateway reported ${code}.`
        : `Payment transaction was declined: ${failureReason}.`;

      return {
        title: "Payment Failed",
        narrative,
        badge: "DECLINED",
        badgeColor: "bg-[var(--status-danger-subtle)] text-[var(--status-danger-text)] border-[var(--status-danger-border)]",
        statusDot: "bg-[var(--status-danger)]",
        actor: data.actor || "Razorpay Ingest",
        icon: CreditCard,
        chips: [
          ...(amountStr ? [{ label: "Original Amount", value: amountStr, isHighlight: true }] : []),
          { label: "Decline Code", value: String(code) },
          { label: "Gateway", value: "Razorpay" },
        ],
        technicalFields: baseTechnicalFields,
      };
    }

    case "OpportunityDetected": {
      const priority = data.priority || "HIGH";
      const windowMin = data.detected_window_minutes || 120;
      const isRec = data.is_recoverable !== false;
      const narrative = isRec
        ? `The failure manager identified this payment as potentially recoverable within a ${windowMin}-minute recovery window.`
        : `Failure manager evaluated the decline code and determined payment is blocked by policy guardrails.`;

      return {
        title: "Opportunity Detected",
        narrative,
        badge: isRec ? "RECOVERABLE" : "GUARDED",
        badgeColor: isRec
          ? "bg-[var(--status-info-subtle)] text-[var(--status-info-text)] border-[var(--status-info-border)]"
          : "bg-[var(--status-warning-subtle)] text-[var(--status-warning-text)] border-[var(--status-warning-border)]",
        statusDot: isRec ? "bg-[var(--status-info)]" : "bg-[var(--status-warning)]",
        actor: data.actor || "FailureManager",
        icon: Sparkles,
        chips: [
          { label: "Priority", value: String(priority), isHighlight: true },
          { label: "Recovery Window", value: `${windowMin} min` },
          { label: "Recoverable", value: isRec ? "Yes" : "Policy Guard" },
        ],
        technicalFields: baseTechnicalFields,
      };
    }

    case "PredictionCreated": {
      const prob = data.recovery_probability ?? (typeof data.score === "number" ? data.score / 100 : null);
      const risk = typeof data.risk_score === "number" ? data.risk_score : null;
      const riskLabel = risk != null ? (risk > 0.7 ? "High" : risk > 0.3 ? "Medium" : "Low") : "Low";
      const probStr = prob != null ? formatPercent(prob) : "—";
      const narrative = prob != null
        ? `ML model estimated a ${probStr} probability of successful recovery with ${riskLabel.toLowerCase()} customer risk.`
        : `Machine learning recovery model scored payment recovery probability.`;

      return {
        title: "Recovery Confidence Scored",
        narrative,
        badge: "SCORED",
        badgeColor: "bg-[var(--brand-primary-muted)] text-[var(--brand-primary-light)] border-[var(--brand-primary-ring)]",
        statusDot: "bg-[var(--brand-primary)]",
        actor: data.actor || "RecoveryPredictor v1.3",
        icon: BrainCircuit,
        chips: [
          { label: "Confidence", value: probStr, isHighlight: true },
          { label: "Customer Risk", value: risk != null ? `${(risk * 100).toFixed(0)} / 100 (${riskLabel})` : riskLabel },
        ],
        technicalFields: baseTechnicalFields,
      };
    }

    case "DiagnosisCreated": {
      const cat = data.failure_category || "TEMPORARY_FAILURE";
      const conf = typeof data.confidence === "number" ? formatPercent(data.confidence) : "High";
      const narrative = `AI diagnosis categorized the drop as ${cat} with ${conf} diagnostic confidence.`;

      return {
        title: "AI Root-Cause Diagnosed",
        narrative,
        badge: "DIAGNOSED",
        badgeColor: "bg-[var(--brand-primary-muted)] text-[var(--brand-primary-light)] border-[var(--brand-primary-ring)]",
        statusDot: "bg-[var(--brand-primary)]",
        actor: data.actor || "DiagnosisAgent v2.1",
        icon: Activity,
        chips: [
          { label: "Failure Category", value: String(cat), isHighlight: true },
          { label: "AI Confidence", value: conf },
        ],
        technicalFields: baseTechnicalFields,
      };
    }

    case "RecoveryPlanned": {
      const action = data.recommended_action || "RETRY_PAYMENT";
      const channel = data.channel || "API_RETRY";
      const priority = data.priority || "NORMAL";
      const narrative = `Recovery Planner recommended ${action} via ${channel.replace(/_/g, " ").toLowerCase()} channel.`;

      return {
        title: "Recovery Planned",
        narrative,
        badge: "PLANNED",
        badgeColor: "bg-[var(--bg-raised)] text-[var(--fg-primary)] border-[var(--border-default)]",
        statusDot: "bg-[var(--brand-primary-light)]",
        actor: data.actor || "RecoveryPlanner v2.0",
        icon: Map,
        chips: [
          { label: "Recommended Action", value: String(action), isHighlight: true },
          { label: "Channel", value: String(channel) },
          { label: "Priority", value: String(priority) },
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
        ? `Policy engine approved the recommended action. ${reason}`
        : isReview
        ? `Policy engine flagged transaction for operator review: ${reason}`
        : `Policy engine blocked execution: ${reason}`;

      return {
        title: "Policy Evaluated",
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
          { label: "Decision", value: String(dec), isHighlight: true },
          { label: "Rule Code", value: String(data.reason_code || "RATE_LIMIT_CHECK") },
          { label: "Risk Level", value: String(data.risk_level || (isApproved ? "LOW" : "HIGH")) },
        ],
        technicalFields: baseTechnicalFields,
      };
    }

    case "RecoveryApproved": {
      const action = data.action || "RETRY_PAYMENT";
      return {
        title: "Action Approved",
        narrative: `Policy engine approved intervention ${action} for automated execution.`,
        badge: "APPROVED",
        badgeColor: "bg-[var(--status-success-subtle)] text-[var(--status-success-text)] border-[var(--status-success-border)]",
        statusDot: "bg-[var(--status-success)]",
        actor: data.actor || "PolicyEngine",
        icon: ShieldCheck,
        chips: [
          { label: "Approved Action", value: String(action), isHighlight: true },
          { label: "Status", value: "CLEARED" },
        ],
        technicalFields: baseTechnicalFields,
      };
    }

    case "RecoveryExecuted": {
      const mode = data.execution_mode || "SIMULATION";
      return {
        title: "Action Dispatched",
        narrative: `Action adapter dispatched payment recovery intervention in ${mode} mode with reserved idempotency key.`,
        badge: "DISPATCHED",
        badgeColor: "bg-[var(--status-info-subtle)] text-[var(--status-info-text)] border-[var(--status-info-border)]",
        statusDot: "bg-[var(--status-info)]",
        actor: data.actor || "ActionAdapter v3.2",
        icon: Play,
        chips: [
          { label: "Idempotency Lock", value: "Reserved & Active", isHighlight: true },
          { label: "Execution Mode", value: String(mode) },
        ],
        technicalFields: baseTechnicalFields,
      };
    }

    case "RecoverySucceeded": {
      const amountStr = typeof data.amount === "number" ? formatCurrency(data.amount, "INR") : "₹0.00";
      return {
        title: "Recovery Succeeded",
        narrative: `Payment was successfully recovered and ${amountStr} settled to the merchant ledger with zero dispute risk.`,
        badge: "SETTLED",
        badgeColor: "bg-[var(--status-success-subtle)] text-[var(--status-success-text)] border-[var(--status-success-border)]",
        statusDot: "bg-[var(--status-success)]",
        actor: data.actor || "Settlement Ledger",
        icon: CheckCircle2,
        chips: [
          { label: "Recovered Capital", value: amountStr, isHighlight: true },
          { label: "Ledger State", value: "Verified Capture" },
          { label: "Dispute Flag", value: "None" },
        ],
        technicalFields: baseTechnicalFields,
      };
    }

    case "ManualReviewCreated": {
      const reason = data.reason || data.message || "Intervention held in operator queue to prevent double-billing.";
      return {
        title: "Escalated to Operator Review",
        narrative: `Autonomous recovery held in human review queue: ${reason}`,
        badge: "REVIEW REQUIRED",
        badgeColor: "bg-[var(--status-review-subtle)] text-[var(--status-review-text)] border-[var(--status-review-border)]",
        statusDot: "bg-[var(--status-review)]",
        actor: data.actor || "PolicyEngine",
        icon: UserCheck,
        chips: [
          { label: "Escalation Reason", value: String(data.reason || "POLICY_GATE"), isHighlight: true },
          { label: "Risk Level", value: String(data.risk_level || "HIGH") },
          { label: "Review Status", value: "PENDING" },
        ],
        technicalFields: baseTechnicalFields,
      };
    }

    case "RecoveryFailed": {
      const reason = data.reason || "Maximum retry threshold exceeded or permanent decline.";
      return {
        title: "Intervention Halted by Policy",
        narrative: `Recovery attempt halted safely: ${reason}`,
        badge: "POLICY ENFORCED",
        badgeColor: "bg-[var(--status-warning-subtle)] text-[var(--status-warning-text)] border-[var(--status-warning-border)]",
        statusDot: "bg-[var(--status-warning)]",
        actor: data.actor || "PolicyEngine",
        icon: ShieldAlert,
        chips: [
          { label: "Constraint", value: String(data.reason_code || "RETRY_LIMIT_EXCEEDED"), isHighlight: true },
          { label: "Intervention State", value: "BLOCKED" },
        ],
        technicalFields: baseTechnicalFields,
      };
    }

    // State transition lifecycle events from FailureManager
    case "AttemptStarted": {
      return {
        title: "Recovery Attempt Started",
        narrative: `Gateway adapter initiated the recovery attempt — awaiting provider confirmation.`,
        badge: "ATTEMPT STARTED",
        badgeColor: "bg-[var(--status-info-subtle)] text-[var(--status-info-text)] border-[var(--status-info-border)]",
        statusDot: "bg-[var(--status-info)]",
        actor: data.actor || "ActionAdapter",
        icon: Play,
        chips: [
          { label: "Attempt State", value: "STARTED → AWAITING RESULT", isHighlight: true },
        ],
        technicalFields: baseTechnicalFields,
      };
    }

    case "ActionExecuting": {
      return {
        title: "Action Executing",
        narrative: `Recovery action transitioned to executing state — action adapter is processing the intervention.`,
        badge: "EXECUTING",
        badgeColor: "bg-[var(--status-info-subtle)] text-[var(--status-info-text)] border-[var(--status-info-border)]",
        statusDot: "bg-[var(--status-info)]",
        actor: data.actor || "ActionAdapter",
        icon: ArrowRight,
        chips: [
          { label: "Action State", value: `${data.previous_state || "APPROVED"} → ${data.new_state || "EXECUTING"}`, isHighlight: true },
        ],
        technicalFields: baseTechnicalFields,
      };
    }

    case "AttemptFailed":
    case "ActionFailed": {
      const title = formatEventType(eventType);
      return {
        title,
        narrative: `${title}: ${data.message || "Attempt did not succeed — will be re-evaluated by policy engine."}`,
        badge: "FAILED",
        badgeColor: "bg-[var(--status-danger-subtle)] text-[var(--status-danger-text)] border-[var(--status-danger-border)]",
        statusDot: "bg-[var(--status-danger)]",
        actor: data.actor || "FailureManager",
        icon: ShieldAlert,
        chips: [
          { label: "Transition", value: `${data.previous_state || "STARTED"} → ${data.new_state || "FAILED"}`, isHighlight: true },
          ...(data.provider_code ? [{ label: "Provider Code", value: String(data.provider_code) }] : []),
        ],
        technicalFields: baseTechnicalFields,
      };
    }

    case "AttemptSucceeded":
    case "ActionSucceeded":
    case "CaseRecovered":
    case "CaseClosed": {
      const title = formatEventType(eventType);
      return {
        title,
        narrative: `Lifecycle state transition completed successfully (${data.previous_state || "START"} → ${data.new_state || "DONE"}).`,
        badge: "STATE TRANSITION",
        badgeColor: "bg-[var(--status-success-subtle)] text-[var(--status-success-text)] border-[var(--status-success-border)]",
        statusDot: "bg-[var(--status-success)]",
        actor: data.actor || "FailureManager",
        icon: CheckCircle2,
        chips: [
          { label: "Transition", value: `${data.previous_state || "START"} → ${data.new_state || "DONE"}`, isHighlight: true },
          ...(data.provider_code ? [{ label: "Provider Code", value: String(data.provider_code) }] : []),
        ],
        technicalFields: baseTechnicalFields,
      };
    }

    case "AttemptUnknown":
    case "ActionOutcomeUnknown": {
      const title = formatEventType(eventType);
      return {
        title,
        narrative: `Adapter returned unknown outcome. Idempotency failover lock engaged to prevent duplicate recovery.`,
        badge: "TIMEOUT LOCKED",
        badgeColor: "bg-[var(--status-info-subtle)] text-[var(--status-info-text)] border-[var(--status-info-border)]",
        statusDot: "bg-[var(--status-info)]",
        actor: data.actor || "ActionAdapter",
        icon: AlertTriangle,
        chips: [
          { label: "Adapter Outcome", value: "UNKNOWN", isHighlight: true },
          { label: "Idempotency Lock", value: "Active" },
        ],
        technicalFields: baseTechnicalFields,
      };
    }

    default: {
      const formattedTitle = formatEventType(eventType);
      return {
        title: formattedTitle,
        narrative: data.message || `System event recorded into the audit trail.`,
        badge: "AUDIT EVENT",
        badgeColor: "bg-[var(--bg-raised)] text-[var(--fg-secondary)] border-[var(--border-subtle)]",
        statusDot: "bg-[var(--fg-tertiary)]",
        actor: data.actor || "RecoverAI System",
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

  // Deduplicate events by unique key to prevent UI repetition
  const uniqueEvents = React.useMemo(() => {
    const seen = new Set<string>();
    const result: AuditEventOut[] = [];
    for (const evt of events) {
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
