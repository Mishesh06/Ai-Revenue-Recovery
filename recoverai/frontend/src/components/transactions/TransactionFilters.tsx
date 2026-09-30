"use client";

import React from "react";
import { Search, X, SlidersHorizontal, RotateCcw, Calendar, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────────
   TransactionFilters — PayRecover Design System
   Comprehensive filtering panel for the Financial Transactions Ledger.
   ──────────────────────────────────────────────────────────────────────────── */

export interface TransactionFiltersState {
  searchQuery: string;
  statusFilter: string;
  failureCodeFilter: string;
  dateRange: "24h" | "7d" | "30d" | "all";
  recoveryStatus: string;
}

interface TransactionFiltersProps {
  filters: TransactionFiltersState;
  onFilterChange: (key: keyof TransactionFiltersState, value: string) => void;
  onReset: () => void;
  totalFiltered: number;
  totalTotal: number;
}

export function TransactionFilters({
  filters,
  onFilterChange,
  onReset,
  totalFiltered,
  totalTotal,
}: TransactionFiltersProps) {
  const isFiltered =
    filters.searchQuery !== "" ||
    filters.statusFilter !== "ALL" ||
    filters.failureCodeFilter !== "ALL" ||
    filters.dateRange !== "all" ||
    filters.recoveryStatus !== "ALL";

  return (
    <div className="p-4 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-[var(--shadow-sm)] space-y-3.5">
      {/* Top Row: Search Input + Status Filter + Date Range */}
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--fg-tertiary)] pointer-events-none" />
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) => onFilterChange("searchQuery", e.target.value)}
            placeholder="Search by Transaction ID, customer reference, or error code..."
            className="w-full h-8 pl-9 pr-8 text-xs font-mono rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-surface-alt)] focus:bg-[var(--bg-surface)] focus:border-[var(--brand-primary)] outline-none text-[var(--fg-primary)] placeholder:text-[var(--fg-tertiary)]"
          />
          {filters.searchQuery && (
            <button
              onClick={() => onFilterChange("searchQuery", "")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--fg-tertiary)] hover:text-[var(--fg-primary)]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Date Window Segments */}
        <div className="flex items-center gap-1 bg-[var(--bg-surface-alt)] p-0.5 rounded-[var(--radius-md)] border border-[var(--border-subtle)] self-start lg:self-auto">
          <Calendar className="w-3.5 h-3.5 text-[var(--fg-tertiary)] ml-2 mr-1" />
          {(
            [
              { id: "24h", label: "24H" },
              { id: "7d", label: "7D" },
              { id: "30d", label: "30D" },
              { id: "all", label: "All Time" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => onFilterChange("dateRange", t.id)}
              className={cn(
                "px-2.5 py-1 rounded-[var(--radius-xs)] text-[11px] font-semibold transition-colors",
                filters.dateRange === t.id
                  ? "bg-[var(--brand-primary)] text-white shadow-[var(--shadow-xs)]"
                  : "text-[var(--fg-tertiary)] hover:text-[var(--fg-primary)]"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-[var(--border-subtle)] text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--fg-tertiary)] mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" />
            FILTERS:
          </span>

          {/* Payment Status Dropdown */}
          <select
            value={filters.statusFilter}
            onChange={(e) => onFilterChange("statusFilter", e.target.value)}
            className="h-7 px-2 text-[11px] rounded-[var(--radius-xs)] border border-[var(--border-subtle)] bg-[var(--bg-surface-alt)] text-[var(--fg-primary)] font-medium outline-none focus:border-[var(--brand-primary)]"
          >
            <option value="ALL">Status: All</option>
            <option value="FAILED">FAILED</option>
            <option value="RECOVERED">RECOVERED</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="PENDING">PENDING</option>
          </select>

          {/* Failure Code Dropdown */}
          <select
            value={filters.failureCodeFilter}
            onChange={(e) => onFilterChange("failureCodeFilter", e.target.value)}
            className="h-7 px-2 text-[11px] rounded-[var(--radius-xs)] border border-[var(--border-subtle)] bg-[var(--bg-surface-alt)] text-[var(--fg-primary)] font-medium outline-none focus:border-[var(--brand-primary)]"
          >
            <option value="ALL">Error Code: All</option>
            <option value="GATEWAY_TIMEOUT">GATEWAY_TIMEOUT</option>
            <option value="UPI_INTENT_EXPIRED">UPI_INTENT_EXPIRED</option>
            <option value="INSUFFICIENT_FUNDS">INSUFFICIENT_FUNDS</option>
            <option value="CARD_EXPIRED">CARD_EXPIRED</option>
            <option value="NETWORK_ERROR">NETWORK_ERROR</option>
          </select>

          {/* Recovery Lifecycle Dropdown */}
          <select
            value={filters.recoveryStatus}
            onChange={(e) => onFilterChange("recoveryStatus", e.target.value)}
            className="h-7 px-2 text-[11px] rounded-[var(--radius-xs)] border border-[var(--border-subtle)] bg-[var(--bg-surface-alt)] text-[var(--fg-primary)] font-medium outline-none focus:border-[var(--brand-primary)]"
          >
            <option value="ALL">Recovery: All</option>
            <option value="RECOVERABLE">High Recoverability (≥75%)</option>
            <option value="IN_RECOVERY">Active In Recovery</option>
            <option value="RESOLVED">Settled Recoveries</option>
            <option value="EXPIRED">Window Expired</option>
          </select>

          {/* Reset Button if filtered */}
          {isFiltered && (
            <button
              onClick={onReset}
              className="inline-flex items-center gap-1 h-7 px-2 text-[11px] font-semibold text-[var(--status-danger-text)] bg-[var(--status-danger-subtle)] hover:bg-[var(--status-danger)]/15 rounded-[var(--radius-xs)] border border-[var(--status-danger-border)] transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Reset Filters
            </button>
          )}
        </div>

        <span className="text-[11px] font-mono text-[var(--fg-tertiary)] ml-auto">
          Showing <strong>{totalFiltered}</strong> of <strong>{totalTotal}</strong> transactions
        </span>
      </div>
    </div>
  );
}
