"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, LayoutDashboard, LineChart, ShieldAlert, CreditCard,
  Terminal, Users, PlayCircle, PieChart, History, Activity,
  Building2, Sparkles, ArrowRight, CornerDownLeft, Command,
  X, Check, ShieldCheck, Zap, SlidersHorizontal
} from "lucide-react";
import { useMerchant } from "@/context/MerchantContext";
import { PRESET_MERCHANTS } from "@/components/ui-custom/MerchantSwitcher";
import { modalVariants, backdropVariants } from "@/lib/motion";
import { cn, truncateId } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────────
   CommandPalette — PayRecover Global System Command & Search
   Fast ⌘K palette for rapid route navigation, merchant workspace switching,
   and operational recovery shortcuts.
   ──────────────────────────────────────────────────────────────────────────── */

interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  category: "NAVIGATION" | "WORKSPACES" | "QUICK ACTIONS";
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  badge?: string;
  shortcut?: string;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onToggleSidebar?: () => void;
}

export function CommandPalette({ isOpen, onClose, onToggleSidebar }: CommandPaletteProps) {
  const router = useRouter();
  const { merchantId, setMerchantId } = useMerchant();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Define commands
  const allCommands: CommandItem[] = [
    // Navigation
    {
      id: "nav-overview",
      title: "Overview",
      subtitle: "Operations telemetry, revenue leakage map, and top opportunities",
      category: "NAVIGATION",
      icon: LayoutDashboard,
      shortcut: "G O",
      action: () => { router.push("/"); onClose(); },
    },
    {
      id: "nav-intelligence",
      title: "Revenue Intelligence",
      subtitle: "Deep root-cause attribution, failure taxonomy, and issuer matrix",
      category: "NAVIGATION",
      icon: LineChart,
      shortcut: "G I",
      action: () => { router.push("/intelligence"); onClose(); },
    },
    {
      id: "nav-recovery",
      title: "Recovery Center",
      subtitle: "Active intervention pipeline, ML scoring, and case drawer",
      category: "NAVIGATION",
      icon: ShieldAlert,
      shortcut: "G R",
      action: () => { router.push("/recovery"); onClose(); },
    },
    {
      id: "nav-transactions",
      title: "Transactions",
      subtitle: "Payment ledger, error codes, and audit decision traces",
      category: "NAVIGATION",
      icon: CreditCard,
      shortcut: "G T",
      action: () => { router.push("/transactions"); onClose(); },
    },
    {
      id: "nav-command-center",
      title: "AI Command Center",
      subtitle: "ML Recovery Model, Diagnosis Agent, Recovery Planner, and Policy Engine",
      category: "NAVIGATION",
      icon: Terminal,
      shortcut: "G C",
      action: () => { router.push("/command-center"); onClose(); },
    },
    {
      id: "nav-review",
      title: "Human Review",
      subtitle: "High risk exceptions, gateway read timeouts, and operator governance",
      category: "NAVIGATION",
      icon: Users,
      shortcut: "G H",
      action: () => { router.push("/review"); onClose(); },
    },
    {
      id: "nav-simulator",
      title: "AI Pipeline Simulator",
      subtitle: "Test end-to-end recovery pipelines (Scenarios A through E)",
      category: "NAVIGATION",
      icon: PlayCircle,
      shortcut: "G S",
      action: () => { router.push("/simulator"); onClose(); },
    },
    {
      id: "nav-analytics",
      title: "Analytics & ROI",
      subtitle: "Financial recovery yield, fee leakage avoidance, and recovery velocity",
      category: "NAVIGATION",
      icon: PieChart,
      shortcut: "G A",
      action: () => { router.push("/analytics"); onClose(); },
    },
    {
      id: "nav-audit",
      title: "Audit Trail",
      subtitle: "Immutable event ledger tracking all agent actions & policy decisions",
      category: "NAVIGATION",
      icon: History,
      shortcut: "G U",
      action: () => { router.push("/audit"); onClose(); },
    },
    // Workspaces
    ...PRESET_MERCHANTS.map((m) => ({
      id: `merchant-${m.id}`,
      title: m.name,
      subtitle: `Merchant UUID: ${truncateId(m.id, 16)} · ${m.tier}`,
      category: "WORKSPACES" as const,
      icon: Building2,
      badge: m.id === merchantId ? "ACTIVE" : undefined,
      action: () => {
        setMerchantId(m.id);
        onClose();
      },
    })),
    // Quick Actions
    {
      id: "action-sim-timeout",
      title: "Simulate Scenario C (Gateway Timeout & Idempotency)",
      subtitle: "Triggers gateway read timeout to demonstrate blind retry blocking",
      category: "QUICK ACTIONS",
      icon: Zap,
      action: () => { router.push("/simulator"); onClose(); },
    },
    {
      id: "action-toggle-sidebar",
      title: "Toggle Sidebar Collapse",
      subtitle: "Expand or collapse navigation sidebar width",
      category: "QUICK ACTIONS",
      icon: SlidersHorizontal,
      shortcut: "⌘ B",
      action: () => { onToggleSidebar?.(); onClose(); },
    },
  ];

  // Filter commands by search query
  const filteredCommands = allCommands.filter((cmd) => {
    const q = query.toLowerCase();
    return (
      cmd.title.toLowerCase().includes(q) ||
      (cmd.subtitle && cmd.subtitle.toLowerCase().includes(q)) ||
      cmd.category.toLowerCase().includes(q)
    );
  });

  // Handle keyboard navigation inside command palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
      } else if (e.key === "Enter" && filteredCommands[selectedIndex]) {
        e.preventDefault();
        filteredCommands[selectedIndex].action();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4">
          {/* Backdrop */}
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal Dialog */}
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={cn(
              "relative w-full max-w-xl rounded-[var(--radius-xl)] overflow-hidden",
              "border border-[var(--border-sheen)] bg-[var(--bg-surface)] text-[var(--fg-primary)]",
              "shadow-[var(--shadow-xl)] flex flex-col z-10"
            )}
          >
            {/* Search Input Bar */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--border-subtle)] bg-[var(--bg-surface-alt)]/50">
              <Search className="w-4 h-4 text-[var(--brand-primary)] flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                placeholder="Type a command, page name, or search workspace..."
                className="w-full bg-transparent text-sm text-[var(--fg-primary)] placeholder:text-[var(--fg-tertiary)] outline-none font-medium"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="p-1 text-[var(--fg-tertiary)] hover:text-[var(--fg-primary)] rounded"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-raised)] border border-[var(--border-subtle)] font-mono text-[10px] text-[var(--fg-tertiary)]">
                ESC
              </kbd>
            </div>

            {/* Results List */}
            <div className="max-h-80 overflow-y-auto p-2 space-y-1">
              {filteredCommands.length === 0 ? (
                <div className="py-10 text-center text-xs text-[var(--fg-tertiary)] font-mono">
                  No matching commands or routes found for &ldquo;{query}&rdquo;
                </div>
              ) : (
                filteredCommands.map((cmd, idx) => {
                  const isSelected = selectedIndex === idx;
                  const Icon = cmd.icon;

                  return (
                    <div
                      key={cmd.id}
                      onClick={cmd.action}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={cn(
                        "group flex items-center justify-between p-2.5 rounded-[var(--radius-md)] cursor-pointer transition-colors",
                        isSelected
                          ? "bg-[var(--brand-primary-muted)] text-[var(--brand-primary)]"
                          : "hover:bg-[var(--bg-surface-alt)] text-[var(--fg-secondary)]"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        <div
                          className={cn(
                            "w-7 h-7 rounded-[var(--radius-sm)] flex items-center justify-center flex-shrink-0 transition-colors",
                            isSelected
                              ? "bg-[var(--brand-primary)] text-white shadow-[var(--glow-brand)]"
                              : "bg-[var(--bg-raised)] text-[var(--fg-secondary)]"
                          )}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "text-xs font-semibold truncate",
                                isSelected ? "text-[var(--brand-primary)] font-bold" : "text-[var(--fg-primary)]"
                              )}
                            >
                              {cmd.title}
                            </span>
                            {cmd.badge && (
                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[var(--status-success-subtle)] text-[var(--status-success-text)] font-bold">
                                {cmd.badge}
                              </span>
                            )}
                          </div>
                          {cmd.subtitle && (
                            <span className="text-[11px] text-[var(--fg-tertiary)] truncate leading-tight mt-0.5">
                              {cmd.subtitle}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {cmd.shortcut && (
                          <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)] font-mono text-[10px] text-[var(--fg-tertiary)] hidden sm:inline-block">
                            {cmd.shortcut}
                          </kbd>
                        )}
                        {isSelected && (
                          <CornerDownLeft className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Navigation Hints */}
            <div className="px-4 py-2.5 border-t border-[var(--border-subtle)] bg-[var(--bg-surface-alt)]/80 flex items-center justify-between text-[11px] text-[var(--fg-tertiary)]">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="px-1 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)] font-mono text-[9px]">↑</kbd>
                  <kbd className="px-1 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)] font-mono text-[9px]">↓</kbd>
                  Navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)] font-mono text-[9px]">↵</kbd>
                  Execute
                </span>
              </div>
              <span className="font-mono text-[10px]">PayRecover v1.0</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
