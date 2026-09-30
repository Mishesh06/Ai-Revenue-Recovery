"use client";

import React from "react";
import { Search, SlidersHorizontal, X, Filter, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────────
   AuditFilterBar — PayRecover Design System
   Enterprise filter bar for the Audit Trail governance console.
   ──────────────────────────────────────────────────────────────────────────── */

export const AUDIT_EVENT_TYPES = [
  { value: "PaymentFailed",          label: "Payment Failed"          },
  { value: "OpportunityDetected",    label: "Opportunity Detected"    },
  { value: "PredictionCreated",      label: "Prediction Created"      },
  { value: "DiagnosisCreated",       label: "Diagnosis Created"       },
  { value: "RecoveryPlanned",        label: "Recovery Planned"        },
  { value: "PolicyEvaluated",        label: "Policy Evaluated"        },
  { value: "RecoveryApproved",       label: "Recovery Approved"       },
  { value: "RecoveryExecuted",       label: "Recovery Executed"       },
  { value: "RecoverySucceeded",      label: "Recovery Succeeded"      },
  { value: "RecoveryFailed",         label: "Recovery Failed"         },
  { value: "ManualReviewCreated",    label: "Manual Review Created"   },
  { value: "CaseClosed",             label: "Case Closed"             },
];

export const ACTORS = [
  { value: "ALL",               label: "All Actors"             },
  { value: "SYSTEM",            label: "SYSTEM (Ingestion)"     },
  { value: "AGENT_DIAGNOSIS",   label: "AI Diagnosis Agent"     },
  { value: "AGENT_PLANNER",     label: "AI Recovery Planner"    },
  { value: "POLICY_ENGINE",     label: "Policy Engine"          },
  { value: "ACTION_ADAPTER",    label: "Action Adapter"         },
  { value: "OPERATOR",          label: "Human Review Operator"  },
];

interface AuditFilterBarProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  selectedEventType: string;
  onEventTypeChange: (val: string) => void;
  selectedActor: string;
  onActorChange: (val: string) => void;
  onReset: () => void;
  isLoading?: boolean;
  activeCount: number;
  className?: string;
}

export function AuditFilterBar({
  searchQuery,
  onSearchChange,
  selectedEventType,
  onEventTypeChange,
  selectedActor,
  onActorChange,
  onReset,
  isLoading,
  activeCount,
  className,
}: AuditFilterBarProps) {
  return (
    <div
      className={cn(
        "p-4 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-[var(--shadow-sm)] space-y-3",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--fg-tertiary)]" />
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--fg-primary)]">
            Audit Stream Filter Controls
          </span>
          {activeCount > 0 && (
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold bg-[var(--brand-primary)] text-white">
              {activeCount}
            </span>
          )}
        </div>

        {activeCount > 0 && (
          <button
            onClick={onReset}
            className="text-[11px] font-semibold text-[var(--fg-tertiary)] hover:text-[var(--status-danger)] transition-colors flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            Clear filters
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
        {/* Search by Trace / UUID */}
        <div className="sm:col-span-6 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--fg-tertiary)] pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search Correlation ID, Case ID, or Transaction UUID..."
            className="w-full h-8 pl-9 pr-3 text-xs font-mono rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-surface-alt)] focus:bg-[var(--bg-surface)] focus:border-[var(--brand-primary)] outline-none text-[var(--fg-primary)] placeholder:text-[var(--fg-tertiary)]"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-[var(--fg-tertiary)] hover:text-[var(--fg-primary)]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Event Type Dropdown */}
        <div className="sm:col-span-3">
          <select
            value={selectedEventType}
            onChange={(e) => onEventTypeChange(e.target.value)}
            className="w-full h-8 px-2.5 text-xs rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--fg-primary)] font-medium outline-none focus:border-[var(--brand-primary)]"
          >
            <option value="">All Event Types</option>
            {AUDIT_EVENT_TYPES.map((ev) => (
              <option key={ev.value} value={ev.value}>
                {ev.label}
              </option>
            ))}
          </select>
        </div>

        {/* Actor Dropdown */}
        <div className="sm:col-span-3">
          <select
            value={selectedActor}
            onChange={(e) => onActorChange(e.target.value)}
            className="w-full h-8 px-2.5 text-xs rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--fg-primary)] font-medium outline-none focus:border-[var(--brand-primary)]"
          >
            {ACTORS.map((ac) => (
              <option key={ac.value} value={ac.value}>
                {ac.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
