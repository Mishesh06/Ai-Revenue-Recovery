"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  XCircle, Search, BrainCircuit, Activity, Map,
  ShieldCheck, Play, CheckCircle2, UserRoundCheck,
  AlertTriangle, FileText, CreditCard, Loader2, LucideIcon
} from "lucide-react";
import { cn, formatDateTime, formatEventType } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────────
   TimelineEvent — RecoverAI Design System
   Canonical timeline item for both Audit Trail and Transaction detail drawer.
   Merges: audit/EventItem + transactions/DrawerTimelineItem.
   ──────────────────────────────────────────────────────────────────────────── */

/* ── Event configuration map ─────────────────────────────────────────────────*/
export type EventStatus = "success" | "danger" | "warning" | "info" | "neutral" | "active";

interface EventConfig {
  icon: LucideIcon | React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  status: EventStatus;
  label?: string;
}

const EVENT_CONFIG_MAP: Record<string, EventConfig> = {
  PaymentFailed:            { icon: CreditCard,     status: "danger",  label: "Payment Failed"           },
  RecoveryFailed:           { icon: XCircle,        status: "danger",  label: "Recovery Failed"          },
  RecoveryWindowExpired:    { icon: XCircle,        status: "danger",  label: "Recovery Window Expired"  },
  OpportunityDetected:      { icon: Search,         status: "info",    label: "Opportunity Detected"     },
  PredictionCreated:        { icon: BrainCircuit,   status: "info",    label: "ML Prediction"            },
  DiagnosisCreated:         { icon: Activity,       status: "info",    label: "AI Diagnosis"             },
  RecoveryPlanned:          { icon: Map,            status: "neutral", label: "Action Recommended"       },
  PolicyEvaluated:          { icon: ShieldCheck,    status: "warning", label: "Policy Evaluated"         },
  RecoveryApproved:         { icon: ShieldCheck,    status: "success", label: "Recovery Approved"        },
  RecoveryExecuted:         { icon: Play,           status: "info",    label: "Action Executed"          },
  RecoverySucceeded:        { icon: CheckCircle2,   status: "success", label: "Recovery Succeeded"       },
  CaseClosed:               { icon: CheckCircle2,   status: "success", label: "Case Closed"              },
  ManualReviewCreated:      { icon: UserRoundCheck, status: "warning", label: "Manual Review Created"    },
};

const STATUS_TOKENS: Record<EventStatus, { bg: string; icon: string; line: string; border: string }> = {
  success: {
    bg:     "var(--status-success-subtle)",
    icon:   "var(--status-success)",
    line:   "var(--status-success)",
    border: "var(--status-success-border)",
  },
  danger: {
    bg:     "var(--status-danger-subtle)",
    icon:   "var(--status-danger)",
    line:   "var(--status-danger-border)",
    border: "var(--status-danger-border)",
  },
  warning: {
    bg:     "var(--status-warning-subtle)",
    icon:   "var(--status-warning)",
    line:   "var(--status-warning-border)",
    border: "var(--status-warning-border)",
  },
  info: {
    bg:     "var(--status-info-subtle)",
    icon:   "var(--status-info)",
    line:   "var(--status-info-border)",
    border: "var(--status-info-border)",
  },
  neutral: {
    bg:     "var(--bg-raised)",
    icon:   "var(--fg-tertiary)",
    line:   "var(--border-subtle)",
    border: "var(--border-subtle)",
  },
  active: {
    bg:     "var(--brand-primary-muted)",
    icon:   "var(--brand-primary)",
    line:   "var(--brand-primary)",
    border: "rgba(88,101,242,0.25)",
  },
};

export function getEventConfig(eventType: string, overrideStatus?: EventStatus): EventConfig {
  const base = EVENT_CONFIG_MAP[eventType];
  if (base) {
    return overrideStatus ? { ...base, status: overrideStatus } : base;
  }
  if (eventType.toLowerCase().includes("unknown")) {
    return { icon: AlertTriangle, status: "warning" };
  }
  return { icon: FileText, status: "neutral" };
}

/* ── Audit-style full timeline item (expandable) ─────────────────────────────*/
interface AuditTimelineItemProps {
  eventType: string;
  timestamp: string;
  correlationId: string;
  recoveryCaseId?: string;
  eventData?: Record<string, any> | null;
  isLast?: boolean;
  overrideStatus?: EventStatus;
  index?: number;
}

export function AuditTimelineItem({
  eventType,
  timestamp,
  correlationId,
  recoveryCaseId,
  eventData,
  isLast = false,
  overrideStatus,
  index = 0,
}: AuditTimelineItemProps) {
  const [expanded, setExpanded] = React.useState(false);
  const config = getEventConfig(eventType, overrideStatus);
  const Icon = config.icon;
  const tokens = STATUS_TOKENS[config.status];
  const label = config.label || formatEventType(eventType);

  return (
    <motion.div
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
      className="relative flex gap-4 pl-2"
    >
      {/* Vertical connector */}
      {!isLast && (
        <div
          className="absolute left-[19px] top-9 bottom-0 w-px"
          style={{ background: "var(--border-subtle)" }}
        />
      )}

      {/* Icon node */}
      <div
        className="relative z-10 mt-1 flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
        style={{
          background: tokens.bg,
          border: `1.5px solid ${tokens.border}`,
        }}
      >
        <Icon className="w-3.5 h-3.5" style={{ color: tokens.icon }} />
      </div>

      {/* Content */}
      <div className="flex-1 pb-5 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <span
              className="text-sm font-semibold leading-snug"
              style={{ color: tokens.icon }}
            >
              {label}
            </span>
            <div className="flex flex-wrap gap-3 mt-1">
              <span className="text-[10px] font-mono" style={{ color: "var(--fg-tertiary)" }}>
                {formatDateTime(timestamp)}
              </span>
              <span className="text-[10px] font-mono truncate max-w-[140px]" style={{ color: "var(--fg-tertiary)" }}>
                trace: {correlationId.slice(0, 12)}…
              </span>
              {recoveryCaseId && (
                <span className="text-[10px] font-mono" style={{ color: "var(--fg-tertiary)" }}>
                  case: {recoveryCaseId.slice(0, 8)}…
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-[10px] font-medium flex-shrink-0 mt-0.5 transition-colors"
            style={{ color: expanded ? "var(--brand-primary)" : "var(--fg-tertiary)" }}
          >
            {expanded ? "Hide" : "Expand"}
          </button>
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden"
            >
              <pre
                className="mt-2 p-3 rounded-[var(--radius-md)] text-[10px] font-mono overflow-x-auto"
                style={{
                  background: "var(--bg-surface-alt)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--fg-secondary)",
                }}
              >
                {JSON.stringify(eventData, null, 2)}
              </pre>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/* ── Drawer-style compact timeline item (transaction detail) ─────────────────*/
interface DrawerTimelineItemProps {
  title: string;
  content: React.ReactNode;
  status?: EventStatus;
  isLast?: boolean;
  isActive?: boolean;
}

export function DrawerTimelineItem({
  title,
  content,
  status = "neutral",
  isLast = false,
  isActive = false,
}: DrawerTimelineItemProps) {
  const resolvedStatus: EventStatus = isActive ? "active" : status;
  const tokens = STATUS_TOKENS[resolvedStatus];

  return (
    <div className="relative flex gap-3">
      {!isLast && (
        <div
          className="absolute left-[13px] top-7 bottom-0 w-px"
          style={{ background: "var(--border-subtle)" }}
        />
      )}

      {/* Dot node */}
      <div
        className="relative z-10 mt-1 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
        style={{
          background: tokens.bg,
          border: `1.5px solid ${tokens.border}`,
        }}
      >
        {isActive ? (
          <Loader2 className="w-3 h-3 animate-spin" style={{ color: tokens.icon }} />
        ) : (
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: tokens.icon }}
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 pb-5 min-w-0">
        <p
          className="text-xs font-semibold mb-1.5"
          style={{ color: "var(--fg-primary)" }}
        >
          {title}
        </p>
        <div
          className="text-[11px] font-mono p-2.5 rounded-[var(--radius-sm)]"
          style={{
            background: "var(--bg-surface-alt)",
            border: "1px solid var(--border-subtle)",
            color: "var(--fg-secondary)",
          }}
        >
          {content}
        </div>
      </div>
    </div>
  );
}
