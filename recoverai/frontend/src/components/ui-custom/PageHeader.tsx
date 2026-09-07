import React from "react";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────────
   PageHeader — RecoverAI Design System
   Standard page title with optional description, badge, and actions.
   Replaces the repeated `div.flex + h2` pattern across all pages.
   ──────────────────────────────────────────────────────────────────────────── */

interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: React.ReactNode;    // E.g. merchant ID chip
  actions?: React.ReactNode;  // E.g. filter dropdowns, export buttons
  className?: string;
}

export function PageHeader({
  title,
  description,
  badge,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4 mb-6", className)}>
      <div className="min-w-0">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1
            className="text-xl font-semibold tracking-tight leading-snug"
            style={{ color: "var(--fg-primary)" }}
          >
            {title}
          </h1>
          {badge}
        </div>
        {description && (
          <p
            className="text-sm mt-0.5"
            style={{ color: "var(--fg-tertiary)" }}
          >
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}

/* ── IDChip — small monospace identifier badge ────────────────────────────────*/
export function IDChip({ id, label }: { id: string; label?: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[var(--radius-sm)] font-mono text-[10px] font-medium"
      style={{
        background: "var(--bg-raised)",
        color: "var(--fg-secondary)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      {label && (
        <span style={{ color: "var(--fg-tertiary)" }}>{label}</span>
      )}
      {id.slice(0, 8)}…
    </span>
  );
}

/* ── SectionDivider — horizontal rule with optional label ────────────────────*/
export function SectionDivider({ label }: { label?: string }) {
  if (!label) {
    return (
      <div
        className="my-6 h-px"
        style={{ background: "var(--border-subtle)" }}
      />
    );
  }
  return (
    <div className="flex items-center gap-3 my-6">
      <div className="flex-1 h-px" style={{ background: "var(--border-subtle)" }} />
      <span
        className="text-[10px] font-semibold uppercase tracking-[0.06em]"
        style={{ color: "var(--fg-tertiary)" }}
      >
        {label}
      </span>
      <div className="flex-1 h-px" style={{ background: "var(--border-subtle)" }} />
    </div>
  );
}
