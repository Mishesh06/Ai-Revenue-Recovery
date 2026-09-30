import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/* ─────────────────────────────────────────────────────────────────────────────
   PayRecover Design Utilities
   ──────────────────────────────────────────────────────────────────────────── */

/** Tailwind class merger — canonical cn() utility */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/* ── Currency Formatting ─────────────────────────────────────────────────────
   Canonical formatter — use this everywhere; never define inline formatters.
   Defaults to INR (PayRecover/Indian market context).
*/
export function formatCurrency(
  value: number,
  currency: string = "INR",
  locale: string = "en-IN",
  decimals?: number
): string {
  const hasFraction = value % 1 !== 0;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: decimals !== undefined ? decimals : (hasFraction ? 2 : 0),
    maximumFractionDigits: decimals !== undefined ? decimals : (hasFraction ? 2 : 0),
  }).format(value);
}

/** Compact currency for large values: ₹1.2Cr, ₹45L, $1.2M */
export function formatCurrencyCompact(
  value: number,
  currency: string = "INR",
  locale: string = "en-IN"
): string {
  if (Math.abs(value) >= 1e7) {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      notation: "compact",
      compactDisplay: "short",
      maximumFractionDigits: 1,
    }).format(value);
  }
  return formatCurrency(value, currency, locale);
}

/* ── Percentage Formatting ───────────────────────────────────────────────────*/
/** Format a 0–1 fraction as a percentage string: 0.876 → "87.6%" */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/** Format a 0–100 percent as string: 87.6 → "87.6%" */
export function formatPercentDirect(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/* ── Date & Time Formatting ──────────────────────────────────────────────────*/
/** Short date: "29 Aug 2026" */
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

/** Short time: "12:34 PM" */
export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

/** Date + time: "29 Aug, 12:34 PM" */
export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

/** Relative time: "2 hours ago", "3 days ago" */
export function formatRelativeTime(iso: string): string {
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const diff = (new Date(iso).getTime() - Date.now()) / 1000;
  const absSeconds = Math.abs(diff);

  if (absSeconds < 60) return rtf.format(Math.round(diff), "second");
  if (absSeconds < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (absSeconds < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  return rtf.format(Math.round(diff / 86400), "day");
}

/** Days elapsed since ISO timestamp */
export function daysElapsed(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

/* ── ID Formatting ───────────────────────────────────────────────────────────*/
/** Truncate UUID for display: "abc12def-..." → "abc12def…" */
export function truncateId(id: string, length: number = 8): string {
  return `${id.slice(0, length)}…`;
}

/** Mask UUID preserving last 4: "••••••••-••••-••••-••••-abcd" */
export function maskId(id: string): string {
  const parts = id.split("-");
  return `${"•".repeat(8)}-${"•".repeat(4)}-${"•".repeat(4)}-${"•".repeat(4)}-${parts[4]}`;
}

/* ── Number Formatting ───────────────────────────────────────────────────────*/
/** Compact number: 12500 → "12.5K", 1200000 → "1.2M" */
export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 1,
  }).format(value);
}

/** Milliseconds to human latency: 1234 → "1.23s", 234 → "234ms" */
export function formatLatency(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
  return `${Math.round(ms)}ms`;
}

/* ── Status Helpers ──────────────────────────────────────────────────────────*/

/** Maps case state strings to semantic color tokens */
export function getCaseStateColor(state: string): {
  bg: string;
  text: string;
  border: string;
  dot: string;
} {
  const s = state.toUpperCase();

  if (s === "CLOSED" || s === "RECOVERED") {
    return {
      bg: "bg-[var(--status-success-subtle)]",
      text: "text-[var(--status-success-text)]",
      border: "border-[var(--status-success-border)]",
      dot: "bg-[var(--status-success)]",
    };
  }
  if (
    s === "RECOVERY_WINDOW_EXPIRED" ||
    s === "FAILED" ||
    s.includes("FAIL")
  ) {
    return {
      bg: "bg-[var(--status-danger-subtle)]",
      text: "text-[var(--status-danger-text)]",
      border: "border-[var(--status-danger-border)]",
      dot: "bg-[var(--status-danger)]",
    };
  }
  if (s === "POLICY_CHECK" || s === "PLANNED" || s === "PREDICTED") {
    return {
      bg: "bg-[var(--status-warning-subtle)]",
      text: "text-[var(--status-warning-text)]",
      border: "border-[var(--status-warning-border)]",
      dot: "bg-[var(--status-warning)]",
    };
  }
  if (s === "DETECTING" || s === "ANALYZING" || s === "RECOVERING") {
    return {
      bg: "bg-[var(--status-info-subtle)]",
      text: "text-[var(--status-info-text)]",
      border: "border-[var(--status-info-border)]",
      dot: "bg-[var(--status-info)]",
    };
  }
  // Default: neutral/pending
  return {
    bg: "bg-[var(--status-neutral-subtle)]",
    text: "text-[var(--status-neutral-text)]",
    border: "border-[var(--status-neutral-border)]",
    dot: "bg-[var(--status-neutral)]",
  };
}

/** Maps transaction status strings to semantic color tokens */
export function getTransactionStatusColor(status: string): {
  bg: string;
  text: string;
  border: string;
} {
  switch (status.toLowerCase()) {
    case "success":
    case "succeeded":
      return {
        bg: "bg-[var(--status-success-subtle)]",
        text: "text-[var(--status-success-text)]",
        border: "border-[var(--status-success-border)]",
      };
    case "failed":
    case "failure":
      return {
        bg: "bg-[var(--status-danger-subtle)]",
        text: "text-[var(--status-danger-text)]",
        border: "border-[var(--status-danger-border)]",
      };
    case "pending":
    case "processing":
      return {
        bg: "bg-[var(--status-warning-subtle)]",
        text: "text-[var(--status-warning-text)]",
        border: "border-[var(--status-warning-border)]",
      };
    default:
      return {
        bg: "bg-[var(--status-neutral-subtle)]",
        text: "text-[var(--status-neutral-text)]",
        border: "border-[var(--status-neutral-border)]",
      };
  }
}

/** Format raw event_type strings for display: "PredictionCreated" → "Prediction Created" */
export function formatEventType(eventType: string): string {
  return eventType.replace(/([A-Z])/g, " $1").trim();
}

/** Format state enum for display: "RECOVERY_WINDOW_EXPIRED" → "Recovery Window Expired" */
export function formatStateLabel(state: string): string {
  return state
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/** Recovery confidence level thresholds */
export function getConfidenceLevel(confidence: number | undefined): {
  label: string;
  color: string;
} {
  if (confidence === undefined || confidence === null)
    return { label: "No Data", color: "text-[var(--fg-tertiary)]" };
  if (confidence >= 0.8)
    return { label: "High", color: "text-[var(--status-success-text)]" };
  if (confidence >= 0.5)
    return { label: "Medium", color: "text-[var(--status-warning-text)]" };
  return { label: "Low", color: "text-[var(--status-danger-text)]" };
}

/** Format technical field names for readability: "provider_reference" → "Provider reference", "recovery_attempt_id" → "Recovery attempt ID" */
export function formatTechnicalLabel(key: string): string {
  const overrides: Record<string, string> = {
    provider_reference: "Provider reference",
    recovery_attempt_id: "Recovery attempt ID",
    recovery_action_id: "Recovery action ID",
    recovery_case_id: "Recovery case ID",
    transaction_id: "Transaction ID",
    customer_id: "Customer ID",
    correlation_id: "Correlation ID",
    idempotency_key: "Idempotency key",
    provider_code: "Provider code",
    failure_category: "Failure category",
    failure_reason: "Failure reason",
    error_code: "Error code",
    reason_code: "Reason code",
    risk_score: "Risk score",
    risk_level: "Risk level",
    recovery_probability: "Recovery probability",
    execution_mode: "Execution mode",
    previous_state: "Previous state",
    new_state: "New state",
    detected_window_minutes: "Window (minutes)",
    is_recoverable: "Is recoverable",
    requires_human_review: "Requires human review",
    allows_execution: "Allows execution",
  };
  if (overrides[key]) return overrides[key];

  return key
    .replace(/_id$/i, " ID")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c, i) => (i === 0 ? c.toUpperCase() : c.toLowerCase()));
}

/** Detailed timestamp for audit events: "07 Sep, 10:38:20 AM" */
export function formatEventExactTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }).format(d);
  } catch {
    return iso;
  }
}
