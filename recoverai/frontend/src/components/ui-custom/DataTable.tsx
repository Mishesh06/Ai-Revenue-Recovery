"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────────
   DataTable — PayRecover Design System
   Canonical table wrapper with pagination controls.
   Replaces duplicated Table+pagination patterns in recovery, transactions, audit.
   ──────────────────────────────────────────────────────────────────────────── */

interface DataTableProps {
  children: React.ReactNode;  // Expects <table> or shadcn Table internals
  className?: string;
}

export function DataTable({ children, className }: DataTableProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border border-[var(--border-subtle)] overflow-hidden shadow-[var(--shadow-sm)]",
        className
      )}
      style={{ background: "var(--bg-surface)" }}
    >
      <div className="overflow-x-auto">
        {children}
      </div>
    </div>
  );
}

/* ── Table Header Cell ───────────────────────────────────────────────────────*/
interface TableColProps {
  children: React.ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
}

export function TableCol({ children, className, align = "left" }: TableColProps) {
  return (
    <th
      className={cn(
        "px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.05em] border-b border-[var(--border-subtle)] first:pl-5 last:pr-5",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className
      )}
      style={{
        color: "var(--fg-tertiary)",
        background: "var(--bg-surface-alt)",
      }}
    >
      {children}
    </th>
  );
}

/* ── Table Row ───────────────────────────────────────────────────────────────*/
interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  isClickable?: boolean;
  isSelected?: boolean;
}

export function DataRow({
  children,
  isClickable,
  isSelected,
  className,
  ...props
}: TableRowProps) {
  return (
    <tr
      className={cn(
        "border-b border-[var(--border-subtle)] last:border-0",
        "transition-colors duration-[var(--duration-fast)]",
        isClickable && "cursor-pointer hover:bg-[var(--bg-surface-alt)]",
        isSelected && "bg-[var(--brand-primary-muted)]",
        className
      )}
      {...props}
    >
      {children}
    </tr>
  );
}

/* ── Table Cell ──────────────────────────────────────────────────────────────*/
export function DataCell({
  children,
  className,
  align,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement> & { align?: "left" | "right" | "center" }) {
  return (
    <td
      className={cn(
        "px-4 py-3 text-sm first:pl-5 last:pr-5",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className
      )}
      style={{ color: "var(--fg-secondary)" }}
      {...props}
    >
      {children}
    </td>
  );
}

/* ── Pagination ──────────────────────────────────────────────────────────────*/
interface PaginationProps {
  page: number;
  pages: number;
  total: number;
  showing: number;
  onPrev: () => void;
  onNext: () => void;
  isLoading?: boolean;
}

export function TablePagination({
  page,
  pages,
  total,
  showing,
  onPrev,
  onNext,
  isLoading,
}: PaginationProps) {
  return (
    <div
      className="flex items-center justify-between px-5 py-3 border-t border-[var(--border-subtle)]"
      style={{
        background: "var(--bg-surface-alt)",
      }}
    >
      {/* Count */}
      <span className="text-xs" style={{ color: "var(--fg-tertiary)" }}>
        Showing{" "}
        <span style={{ color: "var(--fg-secondary)", fontWeight: 500 }}>
          {showing}
        </span>{" "}
        of{" "}
        <span style={{ color: "var(--fg-secondary)", fontWeight: 500 }}>
          {total.toLocaleString()}
        </span>
      </span>

      {/* Controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={onPrev}
          disabled={page <= 1 || isLoading}
          className={cn(
            "inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[var(--radius-sm)] text-xs font-medium",
            "border border-[var(--border-subtle)] transition-colors duration-[var(--duration-fast)]",
            "disabled:opacity-40 disabled:cursor-not-allowed",
            "hover:not-disabled:bg-[var(--bg-raised)]"
          )}
          style={{
            background: "var(--bg-surface)",
            color: "var(--fg-secondary)",
          }}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Prev
        </button>

        <span
          className="px-3 py-1.5 text-xs font-medium font-mono"
          style={{ color: "var(--fg-secondary)" }}
        >
          {page} / {pages}
        </span>

        <button
          onClick={onNext}
          disabled={page >= pages || isLoading}
          className={cn(
            "inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[var(--radius-sm)] text-xs font-medium",
            "border border-[var(--border-subtle)] transition-colors duration-[var(--duration-fast)]",
            "disabled:opacity-40 disabled:cursor-not-allowed",
            "hover:not-disabled:bg-[var(--bg-raised)]"
          )}
          style={{
            background: "var(--bg-surface)",
            color: "var(--fg-secondary)",
          }}
        >
          Next
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
