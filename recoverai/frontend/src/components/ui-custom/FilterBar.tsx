"use client";

import React from "react";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────────
   FilterBar — RecoverAI Design System
   Reusable filter form component for paginated data pages.
   Used in: Audit Trail (and future: Recovery Center, Transactions).
   ──────────────────────────────────────────────────────────────────────────── */

/* ── Individual filter field ─────────────────────────────────────────────────*/
interface FilterFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "select";
  options?: { value: string; label: string }[];
  className?: string;
}

export function FilterField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  options,
  className,
}: FilterFieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5 min-w-0", className)}>
      <label
        className="text-[11px] font-semibold uppercase tracking-[0.05em]"
        style={{ color: "var(--fg-tertiary)" }}
      >
        {label}
      </label>

      {type === "select" && options ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 px-2.5 pr-8 rounded-[var(--radius-md)] text-sm border font-medium appearance-none"
          style={{
            background: "var(--bg-surface)",
            color: "var(--fg-primary)",
            borderColor: "var(--border-default)",
          }}
        >
          <option value="">All</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : (
        <div className="relative">
          <Search
            className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none"
            style={{ color: "var(--fg-tertiary)" }}
          />
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="h-8 w-full pl-8 pr-3 rounded-[var(--radius-md)] text-sm border outline-none font-mono"
            style={{
              background: "var(--bg-surface)",
              color: "var(--fg-primary)",
              borderColor: "var(--border-default)",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "var(--border-focus)";
              e.currentTarget.style.boxShadow = "var(--glow-brand)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "var(--border-default)";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
          {value && (
            <button
              onClick={() => onChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2"
            >
              <X className="h-3 w-3" style={{ color: "var(--fg-tertiary)" }} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Filter Bar container ────────────────────────────────────────────────────*/
interface FilterBarProps {
  children: React.ReactNode;
  onApply: () => void;
  onReset?: () => void;
  isLoading?: boolean;
  activeFilterCount?: number;
}

export function FilterBar({
  children,
  onApply,
  onReset,
  isLoading,
  activeFilterCount = 0,
}: FilterBarProps) {
  return (
    <div
      className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] p-4 shadow-[var(--shadow-sm)]"
      style={{ background: "var(--bg-surface)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal
            className="h-3.5 w-3.5"
            style={{ color: "var(--fg-tertiary)" }}
          />
          <span
            className="text-[11px] font-semibold uppercase tracking-[0.05em]"
            style={{ color: "var(--fg-tertiary)" }}
          >
            Filters
          </span>
          {activeFilterCount > 0 && (
            <span
              className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold"
              style={{
                background: "var(--brand-primary)",
                color: "#fff",
              }}
            >
              {activeFilterCount}
            </span>
          )}
        </div>

        {onReset && activeFilterCount > 0 && (
          <button
            onClick={onReset}
            className="text-[11px] font-medium transition-colors"
            style={{ color: "var(--fg-tertiary)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "var(--status-danger)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "var(--fg-tertiary)";
            }}
          >
            Clear all
          </button>
        )}
      </div>

      {/* Fields + Apply */}
      <div className="flex flex-col sm:flex-row gap-3 items-end">
        <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full">
          {children}
        </div>

        <button
          onClick={onApply}
          disabled={isLoading}
          className={cn(
            "h-8 px-4 rounded-[var(--radius-md)] text-xs font-semibold flex-shrink-0",
            "transition-colors duration-[var(--duration-fast)]",
            "disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
          )}
          style={{
            background: "var(--brand-primary)",
            color: "#fff",
          }}
          onMouseEnter={(e) => {
            if (!(e.currentTarget as HTMLButtonElement).disabled) {
              (e.currentTarget as HTMLButtonElement).style.background = "var(--brand-primary-hover)";
            }
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "var(--brand-primary)";
          }}
        >
          {isLoading ? "Applying…" : "Apply"}
        </button>
      </div>
    </div>
  );
}
