"use client";

import React, { useState, useRef, useEffect } from "react";
import { useMerchant } from "@/context/MerchantContext";
import { useToast } from "@/context/ToastContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2, ChevronDown, Check, Copy, CheckCheck,
  Search, Plus, Sparkles, ShieldCheck
} from "lucide-react";
import { cn, truncateId } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────────
   MerchantSwitcher — PayRecover Design System
   Enterprise multi-tenant merchant workspace switcher with search,
   custom merchant ID entry, and Framer Motion animation.
   ──────────────────────────────────────────────────────────────────────────── */

export interface MerchantOrg {
  id: string;
  name: string;
  tier: "Enterprise Tier" | "Growth Tier" | "Starter Tier" | "Custom";
  currency: string;
  environment: "LIVE" | "SIMULATION";
}

export const PRESET_MERCHANTS: MerchantOrg[] = [
  {
    id: "aaaaaaaa-0000-4000-8000-aaaaaaaaaaaa",
    name: "Acme Payments Pvt Ltd",
    tier: "Enterprise Tier",
    currency: "INR (₹)",
    environment: "LIVE",
  },
  {
    id: "e44d9f64-42cb-4bc1-90c7-024dc6c39f04",
    name: "PayRecover Enterprise A",
    tier: "Enterprise Tier",
    currency: "INR (₹)",
    environment: "LIVE",
  },
  {
    id: "8f7e2dfa-1c39-4d65-8b9a-4c28f6d2e8b0",
    name: "PayRecover Digital B",
    tier: "Growth Tier",
    currency: "INR (₹)",
    environment: "LIVE",
  },
];

export function MerchantSwitcher() {
  const { merchantId, setMerchantId, isReady } = useMerchant();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [customIdInput, setCustomIdInput] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const activeMerchant =
    PRESET_MERCHANTS.find((m) => m.id === merchantId) || {
      id: merchantId || "",
      name: merchantId ? `Workspace (${truncateId(merchantId, 8)})` : "Select Merchant",
      tier: "Custom",
      currency: "INR",
      environment: "LIVE",
      monthlyRecovery: "—",
    };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowCustomInput(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        setShowCustomInput(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleCopyId = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    toast.success("Merchant ID copied", id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSelectMerchant = (m: MerchantOrg) => {
    setMerchantId(m.id);
    setIsOpen(false);
    toast.info("Switched workspace", `Now managing ${m.name}`);
  };

  const handleApplyCustomId = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = customIdInput.trim();
    if (!cleanId) return;
    setMerchantId(cleanId);
    setCustomIdInput("");
    setShowCustomInput(false);
    setIsOpen(false);
    toast.success("Custom merchant connected", cleanId);
  };

  const filteredMerchants = PRESET_MERCHANTS.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isReady) {
    return (
      <div className="h-8 w-44 rounded-[var(--radius-md)] skeleton-shimmer" />
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className={cn(
          "h-8 px-2.5 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)]",
          "hover:bg-[var(--bg-surface-alt)] hover:border-[var(--border-default)]",
          "flex items-center gap-2 text-xs font-medium text-[var(--fg-primary)] transition-all duration-[var(--duration-fast)]",
          "shadow-[var(--shadow-xs)] focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]",
          isOpen && "border-[var(--brand-primary)] ring-1 ring-[var(--brand-primary)]"
        )}
      >
        <div className="w-4 h-4 rounded-[var(--radius-xs)] bg-[var(--brand-primary-muted)] flex items-center justify-center flex-shrink-0">
          <Building2 className="w-2.5 h-2.5 text-[var(--brand-primary)]" />
        </div>
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="truncate max-w-[130px] font-semibold text-[var(--fg-primary)]">
            {activeMerchant.name}
          </span>
          <span className="text-[9px] font-mono font-medium px-1 py-0.2 rounded bg-[var(--bg-raised)] text-[var(--fg-tertiary)] hidden sm:inline-block">
            {activeMerchant.currency.split(" ")[0]}
          </span>
        </div>
        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 text-[var(--fg-tertiary)] transition-transform duration-200",
            isOpen && "rotate-180 text-[var(--brand-primary)]"
          )}
        />
      </button>

      {/* Popover Dropdown with Framer Motion */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -4 }}
            transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "absolute right-0 mt-1.5 w-80 rounded-[var(--radius-lg)] border border-[var(--border-subtle)]",
              "bg-[var(--bg-overlay)] p-2 shadow-[var(--shadow-xl)] z-50 overflow-hidden"
            )}
          >
            {/* Header & Search */}
            <div className="mb-2">
              <div className="flex items-center justify-between px-1.5 py-1 mb-1.5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--fg-tertiary)] flex items-center gap-1.5">
                  <ShieldCheck className="w-3 h-3 text-[var(--brand-primary)]" />
                  PayRecover Workspaces
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[var(--status-success-subtle)] text-[var(--status-success-text)] font-semibold">
                  MULTI-TENANT
                </span>
              </div>

              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--fg-tertiary)] pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search workspace or ID..."
                  className={cn(
                    "w-full h-7 pl-8 pr-2.5 text-xs rounded-[var(--radius-sm)] border border-[var(--border-subtle)]",
                    "bg-[var(--bg-surface-alt)] text-[var(--fg-primary)] placeholder:text-[var(--fg-tertiary)]",
                    "focus:outline-none focus:border-[var(--brand-primary)] focus:bg-[var(--bg-surface)] font-mono"
                  )}
                />
              </div>
            </div>

            {/* Merchant List */}
            <div className="space-y-1 max-h-56 overflow-y-auto">
              {filteredMerchants.map((m) => {
                const isSelected = m.id === merchantId;
                return (
                  <div
                    key={m.id}
                    onClick={() => handleSelectMerchant(m)}
                    className={cn(
                      "group flex items-start justify-between p-2.5 rounded-[var(--radius-md)] cursor-pointer transition-colors border",
                      isSelected
                        ? "bg-[var(--brand-primary-muted)] border-[var(--brand-primary-ring)] text-[var(--brand-primary-hover)]"
                        : "hover:bg-[var(--bg-raised)] border-transparent text-[var(--fg-primary)]"
                    )}
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-xs truncate">
                          {m.name}
                        </span>
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-[var(--brand-primary)] flex-shrink-0" />
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-0.5 text-[10px]">
                        <span className="font-mono text-[var(--fg-tertiary)] truncate">
                          {truncateId(m.id, 12)}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={(e) => handleCopyId(e, m.id)}
                      title="Copy Merchant ID"
                      className={cn(
                        "p-1 rounded-[var(--radius-xs)] opacity-60 group-hover:opacity-100 hover:bg-black/5 transition-opacity",
                        copiedId === m.id && "text-[var(--status-success)] opacity-100"
                      )}
                    >
                      {copiedId === m.id ? (
                        <CheckCheck className="w-3.5 h-3.5 text-[var(--status-success)]" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                );
              })}

              {filteredMerchants.length === 0 && (
                <div className="py-4 text-center text-xs text-[var(--fg-tertiary)] font-mono">
                  No matching merchants found
                </div>
              )}
            </div>

            {/* Custom Merchant Option */}
            <div className="mt-2 pt-2 border-t border-[var(--border-subtle)]">
              {!showCustomInput ? (
                <button
                  onClick={() => setShowCustomInput(true)}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-[var(--brand-primary)] hover:bg-[var(--brand-primary-muted)] rounded-[var(--radius-sm)] transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Connect Custom Merchant UUID
                </button>
              ) : (
                <form onSubmit={handleApplyCustomId} className="space-y-1.5">
                  <input
                    type="text"
                    value={customIdInput}
                    onChange={(e) => setCustomIdInput(e.target.value)}
                    placeholder="Enter 36-char Merchant UUID..."
                    className="w-full h-7 px-2 text-xs font-mono rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-surface)] focus:border-[var(--brand-primary)] outline-none"
                    autoFocus
                  />
                  <div className="flex gap-1.5">
                    <button
                      type="submit"
                      disabled={!customIdInput.trim()}
                      className="flex-1 h-6 bg-[var(--brand-primary)] text-white text-[11px] font-semibold rounded-[var(--radius-xs)] hover:bg-[var(--brand-primary-hover)] disabled:opacity-50"
                    >
                      Connect
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCustomInput(false)}
                      className="px-2 h-6 text-[11px] text-[var(--fg-tertiary)] hover:text-[var(--fg-primary)]"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
