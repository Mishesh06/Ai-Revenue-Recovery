"use client";

import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api-client";
import {
  Activity, Server, Database, BrainCircuit,
  Map, ShieldCheck, Play, Loader2, RefreshCw,
} from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────────
   SystemHealth — PayRecover Design System
   Real-time system component status with semantic status indicators.
   ──────────────────────────────────────────────────────────────────────────── */

const HEALTH_ITEMS = [
  { key: "api",              label: "API Gateway",      icon: Server        },
  { key: "database",         label: "Database",         icon: Database      },
  { key: "ml_model",         label: "ML Model",         icon: BrainCircuit  },
  { key: "diagnosis_agent",  label: "Diagnosis Agent",  icon: Activity      },
  { key: "recovery_planner", label: "Recovery Planner", icon: Map           },
  { key: "policy_engine",    label: "Policy Engine",    icon: ShieldCheck   },
  { key: "action_adapter",   label: "Action Adapter",   icon: Play          },
];

type HealthStatus = "OK" | "connected" | "DEGRADED" | "ERROR" | "UNKNOWN";

function getStatusStyle(status: string): {
  dotClass: string;
  textColor: string;
  label: string;
} {
  const s = status as HealthStatus;
  if (s === "OK" || s === "connected") {
    return {
      dotClass: "status-dot ok",
      textColor: "text-[var(--status-success-text)]",
      label: "Operational",
    };
  }
  if (s === "DEGRADED") {
    return {
      dotClass: "status-dot warning",
      textColor: "text-[var(--status-warning-text)]",
      label: "Degraded",
    };
  }
  if (s === "ERROR") {
    return {
      dotClass: "status-dot error",
      textColor: "text-[var(--status-danger-text)]",
      label: "Error",
    };
  }
  return {
    dotClass: "status-dot unknown",
    textColor: "text-[var(--fg-tertiary)]",
    label: "Unknown",
  };
}

function OverallStatus({ health }: { health: Record<string, string> | null }) {
  if (!health) return null;

  const statuses = Object.values(health);
  const hasError = statuses.some((s) => s === "ERROR");
  const hasDegraded = statuses.some((s) => s === "DEGRADED");
  const allOk = statuses.every((s) => s === "OK" || s === "connected");

  if (hasError) {
    return (
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius-sm)]"
        style={{
          background: "var(--status-danger-subtle)",
          border: "1px solid var(--status-danger-border)",
        }}
      >
        <div className="status-dot error" />
        <span className="text-[11px] font-semibold" style={{ color: "var(--status-danger-text)" }}>
          System Issue
        </span>
      </div>
    );
  }
  if (hasDegraded) {
    return (
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius-sm)]"
        style={{
          background: "var(--status-warning-subtle)",
          border: "1px solid var(--status-warning-border)",
        }}
      >
        <div className="status-dot warning" />
        <span className="text-[11px] font-semibold" style={{ color: "var(--status-warning-text)" }}>
          Degraded
        </span>
      </div>
    );
  }
  if (allOk) {
    return (
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius-sm)]"
        style={{
          background: "var(--status-success-subtle)",
          border: "1px solid var(--status-success-border)",
        }}
      >
        <div className="status-dot ok" />
        <span className="text-[11px] font-semibold" style={{ color: "var(--status-success-text)" }}>
          All Systems Operational
        </span>
      </div>
    );
  }
  return null;
}

export function SystemHealth() {
  const [health, setHealth] = useState<Record<string, string> | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const checkHealth = React.useCallback(async (manual = false) => {
    if (manual) setIsRefreshing(true);
    try {
      const res = await fetchApi<Record<string, string>>("/system/health");
      setHealth(res);
      setLastChecked(new Date());
    } catch (err) {
      console.error("Health check failed", err);
    } finally {
      setLoading(false);
      if (manual) setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let isSubscribed = true;
    fetchApi<Record<string, string>>("/system/health")
      .then((res) => {
        if (isSubscribed) {
          setHealth(res);
          setLastChecked(new Date());
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isSubscribed) {
          console.error("Health check failed", err);
          setLoading(false);
        }
      });

    const interval = setInterval(() => checkHealth(), 30000);
    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [checkHealth]);

  return (
    <div
      className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden shadow-[var(--shadow-sm)]"
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border-subtle)]"
        style={{ background: "var(--bg-surface-alt)" }}
      >
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4" style={{ color: "var(--brand-primary)" }} />
          <span className="text-sm font-semibold" style={{ color: "var(--fg-primary)" }}>
            System Health
          </span>
          {lastChecked && (
            <span className="text-[10px] font-medium" style={{ color: "var(--fg-tertiary)" }}>
              · checked {formatRelativeTime(lastChecked.toISOString())}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {health && <OverallStatus health={health} />}
          <a
            href="/system"
            className="text-[11px] font-mono font-semibold text-[var(--brand-primary)] hover:text-[var(--brand-primary-light)] transition-colors hidden sm:inline"
          >
            Inspect Infrastructure →
          </a>
          <button
            onClick={() => checkHealth(true)}
            disabled={isRefreshing}
            className={cn(
              "p-1.5 rounded-[var(--radius-sm)] transition-colors",
              "hover:bg-[var(--bg-raised)] disabled:opacity-40"
            )}
            title="Refresh health status"
          >
            <RefreshCw
              className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin")}
              style={{ color: "var(--fg-tertiary)" }}
            />
          </button>
        </div>
      </div>

      {/* Items */}
      {loading && !health ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--fg-tertiary)" }} />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {HEALTH_ITEMS.map(({ key, label, icon: Icon }, idx) => {
            const status = health?.[key] || "UNKNOWN";
            const { dotClass, textColor, label: statusLabel } = getStatusStyle(status);

            return (
              <div
                key={key}
                className={cn(
                  "flex flex-col gap-2 p-4",
                  "border-r border-b border-[var(--border-subtle)]",
                  "last:border-r-0",
                  "[&:nth-child(4)]:border-r-0 lg:[&:nth-child(4)]:border-r",
                  "xl:[&:nth-child(4)]:border-r",
                  "transition-colors hover:bg-[var(--bg-surface-alt)]"
                )}
              >
                <Icon className="w-4 h-4" style={{ color: "var(--fg-tertiary)" }} />
                <div>
                  <p
                    className="text-[11px] font-medium leading-snug"
                    style={{ color: "var(--fg-secondary)" }}
                  >
                    {label}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className={dotClass} />
                    <span className={cn("text-[10px] font-semibold font-mono uppercase tracking-wide", textColor)}>
                      {statusLabel}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
