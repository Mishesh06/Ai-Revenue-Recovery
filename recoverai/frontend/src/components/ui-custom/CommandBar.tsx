"use client";

import React, { useRef, useEffect } from "react";
import { Search, X, SlidersHorizontal, Command } from "lucide-react";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────────
   CommandBar — RecoverAI Design System
   High-efficiency command & filter input with ⌘K keyboard shortcut capture,
   quick filter pills, and instant search reactivity.
   ──────────────────────────────────────────────────────────────────────────── */

export interface FilterPill {
  id: string;
  label: string;
  count?: number;
}

export interface CommandBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  filters?: FilterPill[];
  selectedFilter?: string;
  onSelectFilter?: (id: string) => void;
  rightAction?: React.ReactNode;
  showShortcut?: boolean;
  className?: string;
}

export function CommandBar({
  value,
  onChange,
  placeholder = "Search by Transaction UUID, Case ID, or error code... (⌘K)",
  filters,
  selectedFilter,
  onSelectFilter,
  rightAction,
  showShortcut = true,
  className,
}: CommandBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Global ⌘K keyboard listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 shadow-[var(--shadow-sm)]",
        "space-y-2.5",
        className
      )}
    >
      <div className="flex items-center gap-2">
        {/* Search Input with Icon */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--fg-tertiary)] pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={cn(
              "w-full h-8 pl-9 pr-14 text-xs font-mono rounded-[var(--radius-md)]",
              "border border-[var(--border-subtle)] bg-[var(--bg-surface-alt)]",
              "text-[var(--fg-primary)] placeholder:text-[var(--fg-tertiary)]",
              "focus:outline-none focus:border-[var(--brand-primary)] focus:bg-[var(--bg-surface)]",
              "transition-colors"
            )}
          />

          {value ? (
            <button
              onClick={() => onChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-[var(--fg-tertiary)] hover:text-[var(--fg-primary)]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : showShortcut ? (
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[var(--bg-raised)] border border-[var(--border-subtle)] text-[10px] font-mono text-[var(--fg-tertiary)] pointer-events-none">
              <Command className="w-2.5 h-2.5" />
              <span>K</span>
            </div>
          ) : null}
        </div>

        {rightAction}
      </div>

      {/* Filter Segment Pills */}
      {filters && filters.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 border-t border-[var(--border-subtle)]">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--fg-tertiary)] mr-1 flex-shrink-0">
            Filters:
          </span>
          {filters.map((filter) => {
            const isSelected = selectedFilter === filter.id;
            return (
              <button
                key={filter.id}
                onClick={() => onSelectFilter?.(filter.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[var(--radius-xs)] text-[11px] font-semibold transition-colors flex-shrink-0",
                  isSelected
                    ? "bg-[var(--brand-primary)] text-white shadow-[var(--shadow-xs)] font-bold"
                    : "bg-[var(--bg-surface-alt)] text-[var(--fg-secondary)] hover:text-[var(--fg-primary)] hover:bg-[var(--bg-raised)] border border-[var(--border-subtle)]"
                )}
              >
                <span>{filter.label}</span>
                {filter.count !== undefined && (
                  <span
                    className={cn(
                      "text-[9px] font-mono px-1 py-0.2 rounded-full",
                      isSelected ? "bg-white/20 text-white" : "bg-black/5 text-[var(--fg-tertiary)]"
                    )}
                  >
                    {filter.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
