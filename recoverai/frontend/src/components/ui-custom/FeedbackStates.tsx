"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Loader2,
  AlertCircle,
  FileSearch,
  WifiOff,
  ShieldOff,
  ServerCrash,
  LucideIcon,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { fadeVariants } from "@/lib/motion";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────────
   FeedbackStates — PayRecover Design System
   LoadingState · SkeletonBlock · SkeletonMetricCard · SkeletonTable · ErrorState · EmptyState
   Calm, technical, and informative state indicators.
   ──────────────────────────────────────────────────────────────────────────── */

/* ── Skeleton Block ──────────────────────────────────────────────────────────*/
export function SkeletonBlock({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-[var(--radius-md)] skeleton-shimmer", className)}
      {...props}
    />
  );
}

/* ── Skeleton Metric Card ───────────────────────────────────────────────────*/
export function SkeletonMetricCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-xs)]",
        className
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <SkeletonBlock className="h-3 w-20" />
        <SkeletonBlock className="h-5 w-5 rounded-full" />
      </div>
      <SkeletonBlock className="h-8 w-32 mb-3" />
      <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between">
        <SkeletonBlock className="h-3 w-16" />
        <SkeletonBlock className="h-3 w-12" />
      </div>
    </div>
  );
}

/* ── Skeleton Table Row ───────────────────────────────────────────────────────*/
export function SkeletonTableRow({ cols = 6 }: { cols?: number }) {
  const widths = ["w-24", "w-32", "w-20", "w-16", "w-24", "w-20"];
  return (
    <tr className="border-b border-[var(--border-subtle)]">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="py-3.5 px-4 first:pl-5 last:pr-5">
          <SkeletonBlock className={cn("h-3.5", widths[i % widths.length])} />
        </td>
      ))}
    </tr>
  );
}

/* ── Skeleton Table ───────────────────────────────────────────────────────────*/
export function SkeletonTable({ rows = 6, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden shadow-[var(--shadow-sm)]">
      <div className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface-alt)] px-5 py-3 flex gap-8">
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonBlock
            key={i}
            className={cn("h-3", i === 0 ? "w-24" : i === cols - 1 ? "w-16" : "w-28")}
          />
        ))}
      </div>
      <table className="w-full">
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <SkeletonTableRow key={i} cols={cols} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Loading Spinner / LoadingState ─────────────────────────────────────────*/
export function LoadingSpinner({ message = "Loading operations telemetry…" }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 min-h-[280px]">
      <div className="relative mb-3.5">
        <div className="w-8 h-8 rounded-full border-2 border-[var(--brand-primary-muted)] border-t-[var(--brand-primary)] animate-spin" />
      </div>
      <p className="text-xs font-medium text-[var(--fg-tertiary)] font-mono tracking-wide">
        {message}
      </p>
    </div>
  );
}

export const LoadingState = LoadingSpinner;

/* ── Error State ────────────────────────────────────────────────────────────*/
function getErrorMeta(error: unknown): {
  icon: LucideIcon | React.ComponentType<{ className?: string }>;
  title: string;
  message: string;
} {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("timeout") || msg.includes("abort") || msg.includes("network")) {
      return {
        icon: WifiOff,
        title: "Connection Timeout",
        message: "Could not reach the PayRecover backend service. Check network or server state.",
      };
    }
    if (msg.includes("401") || msg.includes("403") || msg.includes("unauthorized")) {
      return {
        icon: ShieldOff,
        title: "Authorization Required",
        message: "Merchant workspace credentials missing or expired.",
      };
    }
    if (msg.includes("500") || msg.includes("server")) {
      return {
        icon: ServerCrash,
        title: "Service Exception",
        message: error.message || "An unexpected error occurred in the recovery pipeline.",
      };
    }
    return {
      icon: AlertCircle,
      title: "Telemetry Sync Issue",
      message: error.message,
    };
  }
  return {
    icon: AlertCircle,
    title: "Telemetry Sync Issue",
    message: typeof error === "string" ? error : "An unexpected telemetry error occurred.",
  };
}

export function ErrorState({
  error,
  retry,
}: {
  error: unknown;
  retry?: () => void;
}) {
  const { icon: Icon, title, message } = getErrorMeta(error);

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeVariants}
      className="rounded-[var(--radius-lg)] border border-[var(--status-danger-border)] bg-[var(--status-danger-subtle)] p-6 sm:p-8 flex flex-col items-center text-center shadow-[var(--shadow-xs)]"
    >
      <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3 bg-[var(--status-danger-subtle)] border border-[var(--status-danger-border)] text-[var(--status-danger)]">
        <Icon className="h-5 w-5" />
      </div>

      <h3 className="text-sm font-bold text-[var(--status-danger-text)] mb-1">
        {title}
      </h3>

      <p className="text-xs text-[var(--fg-secondary)] max-w-sm mb-4 leading-relaxed font-mono">
        {message}
      </p>

      {retry && (
        <button
          onClick={retry}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[var(--radius-md)] border border-[var(--status-danger-border)] bg-[var(--bg-surface)] text-xs font-bold text-[var(--status-danger-text)] hover:bg-[var(--status-danger-subtle)] transition-colors shadow-[var(--shadow-xs)]"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry Connection</span>
        </button>
      )}
    </motion.div>
  );
}

/* ── Empty State ────────────────────────────────────────────────────────────*/
export interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
  variant?: "default" | "search" | "filter";
  className?: string;
}

export function EmptyState({
  title = "No data available",
  description = "No telemetry or transactions match the current workspace criteria.",
  icon: CustomIcon,
  action,
  variant = "default",
  className,
}: EmptyStateProps) {
  const Icon = CustomIcon || FileSearch;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeVariants}
      className={cn(
        "flex flex-col items-center justify-center py-16 px-4 text-center rounded-[var(--radius-lg)]",
        variant === "default" &&
          "border border-dashed border-[var(--border-default)] bg-[var(--bg-surface-alt)]/60",
        variant === "search" &&
          "border border-dashed border-[var(--border-subtle)] bg-[var(--bg-surface)]",
        variant === "filter" &&
          "bg-[var(--bg-surface-alt)] border border-[var(--border-subtle)]",
        className
      )}
    >
      <div className="w-11 h-11 rounded-full flex items-center justify-center mb-3.5 bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--fg-tertiary)] shadow-[var(--shadow-xs)]">
        <Icon className="h-5 w-5 text-[var(--fg-tertiary)]" />
      </div>

      <h3 className="text-sm font-bold text-[var(--fg-primary)] mb-1">
        {title}
      </h3>

      <p className="text-xs text-[var(--fg-tertiary)] max-w-sm leading-relaxed">
        {description}
      </p>

      {action && <div className="mt-4">{action}</div>}
    </motion.div>
  );
}
