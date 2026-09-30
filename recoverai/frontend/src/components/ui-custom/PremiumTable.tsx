"use client";

import React from "react";
import { ChevronLeft, ChevronRight, ArrowUpDown, Search, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────────
   PremiumTable — PayRecover Design System
   High-density fintech data table with sticky headers, subtle row hover elevation,
   sort indicators, and unified pagination controls.
   ──────────────────────────────────────────────────────────────────────────── */

export interface TableColumn<T> {
  key: string;
  header: React.ReactNode;
  align?: "left" | "right" | "center";
  width?: string;
  render?: (item: T, index: number) => React.ReactNode;
  sortable?: boolean;
}

export interface PremiumTableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  keyExtractor: (item: T, index: number) => string;
  onRowClick?: (item: T) => void;
  selectedId?: string;
  isLoading?: boolean;
  emptyState?: React.ReactNode;
  page?: number;
  pages?: number;
  total?: number;
  showing?: number;
  onPrevPage?: () => void;
  onNextPage?: () => void;
  title?: string;
  headerAction?: React.ReactNode;
  dense?: boolean;
  className?: string;
}

export function PremiumTable<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  selectedId,
  isLoading = false,
  emptyState,
  page,
  pages,
  total,
  showing,
  onPrevPage,
  onNextPage,
  title,
  headerAction,
  dense = false,
  className,
}: PremiumTableProps<T>) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden shadow-[var(--shadow-sm)]",
        className
      )}
    >
      {/* Optional Table Header Bar */}
      {(title || headerAction) && (
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border-subtle)] bg-[var(--bg-surface-alt)]/50">
          {title && (
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--fg-primary)]">
              {title}
            </h3>
          )}
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}

      {/* Table Body */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface-alt)]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{ width: col.width }}
                  className={cn(
                    "px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--fg-tertiary)]",
                    col.align === "right" && "text-right",
                    col.align === "center" && "text-center",
                    "first:pl-5 last:pr-5"
                  )}
                >
                  <div
                    className={cn(
                      "inline-flex items-center gap-1.5",
                      col.align === "right" && "justify-end w-full",
                      col.align === "center" && "justify-center w-full"
                    )}
                  >
                    <span>{col.header}</span>
                    {col.sortable && (
                      <ArrowUpDown className="w-3 h-3 text-[var(--fg-quaternary)] opacity-60" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-[var(--border-subtle)]">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, rIdx) => (
                <tr key={rIdx} className="border-b border-[var(--border-subtle)]">
                  {columns.map((col, cIdx) => (
                    <td key={cIdx} className="px-4 py-3.5 first:pl-5 last:pr-5">
                      <div
                        className={cn(
                          "skeleton-shimmer h-3.5 rounded",
                          cIdx === 0 ? "w-24" : cIdx === columns.length - 1 ? "w-16" : "w-32"
                        )}
                      />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-8 text-center">
                  {emptyState || (
                    <span className="text-xs text-[var(--fg-tertiary)]">No records found</span>
                  )}
                </td>
              </tr>
            ) : (
              data.map((item, index) => {
                const key = keyExtractor(item, index);
                const isSelected = selectedId === key;

                return (
                  <tr
                    key={key}
                    onClick={() => onRowClick?.(item)}
                    className={cn(
                      "group transition-colors duration-[var(--duration-fast)]",
                      onRowClick && "cursor-pointer hover:bg-[var(--bg-surface-alt)]",
                      isSelected && "bg-[var(--brand-primary-muted)]/50",
                      dense ? "py-2" : "py-3"
                    )}
                  >
                    {columns.map((col) => {
                      const content = col.render
                        ? col.render(item, index)
                        : (item as Record<string, unknown>)[col.key] as React.ReactNode;

                      return (
                        <td
                          key={col.key}
                          className={cn(
                            "px-4 text-xs first:pl-5 last:pr-5",
                            dense ? "py-2" : "py-3.5",
                            col.align === "right" && "text-right",
                            col.align === "center" && "text-center",
                            "text-[var(--fg-secondary)]"
                          )}
                        >
                          {content}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Pagination */}
      {page !== undefined && pages !== undefined && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--border-subtle)] bg-[var(--bg-surface-alt)]/60 text-xs">
          <span className="text-[11px] text-[var(--fg-tertiary)] font-mono">
            Showing <strong className="text-[var(--fg-primary)] font-semibold">{showing ?? data.length}</strong> of{" "}
            <strong className="text-[var(--fg-primary)] font-semibold">{(total ?? data.length).toLocaleString()}</strong>
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onPrevPage}
              disabled={page <= 1 || isLoading}
              className={cn(
                "inline-flex items-center gap-1 h-7 px-2.5 rounded-[var(--radius-xs)] border border-[var(--border-subtle)] bg-[var(--bg-surface)]",
                "text-xs font-semibold text-[var(--fg-secondary)] hover:bg-[var(--bg-raised)] disabled:opacity-40 disabled:cursor-not-allowed",
                "transition-colors shadow-[var(--shadow-xs)]"
              )}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Prev</span>
            </button>

            <span className="px-2 font-mono text-[11px] font-semibold text-[var(--fg-tertiary)]">
              {page} / {pages || 1}
            </span>

            <button
              onClick={onNextPage}
              disabled={page >= (pages || 1) || isLoading}
              className={cn(
                "inline-flex items-center gap-1 h-7 px-2.5 rounded-[var(--radius-xs)] border border-[var(--border-subtle)] bg-[var(--bg-surface)]",
                "text-xs font-semibold text-[var(--fg-secondary)] hover:bg-[var(--bg-raised)] disabled:opacity-40 disabled:cursor-not-allowed",
                "transition-colors shadow-[var(--shadow-xs)]"
              )}
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
