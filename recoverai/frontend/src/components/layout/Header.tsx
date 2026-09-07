"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  Menu, Settings, Bell, Activity, Shield, Sparkles,
  Command, CheckCircle2, ChevronRight, Sliders, ExternalLink,
  Search, ShieldCheck, User, Users, Zap
} from "lucide-react";
import { MerchantSwitcher } from "@/components/ui-custom/MerchantSwitcher";
import { useToast } from "@/context/ToastContext";
import { fetchApi } from "@/lib/api-client";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────────
   Header — RecoverAI Global System Header
   Top operating system bar with animated breadcrumbs, instant ⌘K command trigger,
   live telemetry heartbeat, multi-tenant merchant switcher, and notification stream.
   ──────────────────────────────────────────────────────────────────────────── */

const ROUTE_NAME_MAP: Record<string, { label: string; group: string }> = {
  "/":               { label: "Overview",             group: "Operations"     },
  "/recovery":       { label: "Recovery Center",      group: "Operations"     },
  "/transactions":   { label: "Transactions",         group: "Operations"     },
  "/simulator":      { label: "Simulator",            group: "Operations"     },
  "/intelligence":   { label: "Revenue Intelligence", group: "AI Intelligence" },
  "/command-center": { label: "AI Command Center",    group: "AI Intelligence" },
  "/review":         { label: "Human Review",         group: "AI Intelligence" },
  "/analytics":      { label: "Analytics & ROI",      group: "Governance"     },
  "/audit":          { label: "Audit Trail",          group: "Governance"     },
};

interface HeaderProps {
  onMenuClick: () => void;
  onOpenCommandPalette?: () => void;
}

export function Header({ onMenuClick, onOpenCommandPalette }: HeaderProps) {
  const pathname = usePathname();
  const { toast } = useToast();
  const [systemOk, setSystemOk] = useState<boolean | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(2);

  const currentRoute = ROUTE_NAME_MAP[pathname] || {
    label: pathname.replace("/", "").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    group: "Operations",
  };

  useEffect(() => {
    const fetchHealthQuick = async () => {
      try {
        const res = await fetchApi<Record<string, string>>("/system/health");
        const allOk = Object.values(res).every((s) => s === "OK" || s === "connected");
        setSystemOk(allOk);
      } catch {
        setSystemOk(false);
      }
    };
    fetchHealthQuick();
    const interval = setInterval(fetchHealthQuick, 45000);
    return () => clearInterval(interval);
  }, []);

  const handleTestNotification = () => {
    setShowNotifications(false);
    toast.info("Telemetry Event", "Autonomous pipeline evaluated transaction recovery windows.");
  };

  return (
    <header className="h-14 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/90 backdrop-blur-md flex items-center justify-between px-3 sm:px-5 shrink-0 sticky top-0 z-30 shadow-[var(--shadow-xs)]">
      {/* Left: Mobile trigger & Animated Breadcrumbs */}
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          onClick={onMenuClick}
          aria-label="Open navigation menu"
          className="p-1.5 -ml-1 rounded-[var(--radius-md)] text-[var(--fg-tertiary)] hover:bg-[var(--bg-raised)] hover:text-[var(--fg-primary)] md:hidden focus:outline-none"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Dynamic Animated Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs font-medium min-w-0">
          <span className="text-[var(--fg-tertiary)] hidden sm:inline-block truncate">
            {currentRoute.group}
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-[var(--border-strong)] hidden sm:inline-block flex-shrink-0" />
          <motion.span
            key={pathname}
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.15 }}
            className="font-bold text-[var(--fg-primary)] tracking-tight truncate"
          >
            {currentRoute.label}
          </motion.span>
        </div>
      </div>

      {/* Center: Command Palette Trigger */}
      <div className="hidden md:flex items-center justify-center flex-1 max-w-sm mx-4">
        <button
          onClick={onOpenCommandPalette}
          className={cn(
            "w-full h-8 px-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)]",
            "bg-[var(--bg-surface-alt)] hover:bg-[var(--bg-surface)] hover:border-[var(--border-strong)]",
            "flex items-center justify-between text-xs text-[var(--fg-tertiary)] shadow-[var(--shadow-xs)]",
            "transition-all duration-[var(--duration-fast)] cursor-pointer group"
          )}
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-[var(--fg-quaternary)] group-hover:text-[var(--brand-primary)] transition-colors" />
            <span className="truncate">Search commands, pages, workspaces...</span>
          </div>

          <kbd className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[var(--bg-raised)] border border-[var(--border-subtle)] font-mono text-[10px] text-[var(--fg-tertiary)]">
            <Command className="w-2.5 h-2.5" />
            <span>K</span>
          </kbd>
        </button>
      </div>

      {/* Right: Environment, System Health, Merchant Switcher, Notifications */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Environment Badge */}
        <div className="hidden xl:flex items-center gap-1.5 px-2 py-0.5 rounded-[var(--radius-xs)] bg-[var(--status-success-subtle)] border border-[var(--status-success-border)] text-[10px] font-mono font-semibold text-[var(--status-success-text)]">
          <span className="status-dot ok" />
          <span>RAZORPAY LIVE v3.2</span>
        </div>

        {/* System Health Heartbeat Indicator */}
        <div
          title={systemOk ? "All AI Pipeline Engines Operational" : "System Engine Check..."}
          className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface-alt)] text-xs text-[var(--fg-secondary)]"
        >
          <div
            className={cn(
              "w-2 h-2 rounded-full",
              systemOk === null ? "bg-[var(--status-neutral)] animate-pulse" :
              systemOk ? "bg-[var(--status-success)] shadow-[var(--glow-success)]" :
              "bg-[var(--status-warning)] shadow-[var(--glow-danger)] animate-pulse"
            )}
          />
          <span className="text-[10px] font-mono font-medium">
            {systemOk === null ? "Checking..." : systemOk ? "Systems Operational" : "Degraded"}
          </span>
        </div>

        {/* Merchant Workspace Switcher */}
        <MerchantSwitcher />

        {/* Action Controls */}
        <div className="flex items-center gap-1 pl-1 sm:pl-2 border-l border-[var(--border-subtle)]">
          {/* Notifications / Live Stream Trigger */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                if (!showNotifications) setUnreadCount(0);
              }}
              className="p-1.5 text-[var(--fg-tertiary)] hover:text-[var(--fg-primary)] rounded-[var(--radius-md)] hover:bg-[var(--bg-raised)] transition-colors relative"
              title="Notifications & Activity Stream"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[var(--brand-primary)] ring-2 ring-[var(--bg-surface)] animate-pulse" />
              )}
            </button>

            {/* Notifications Popover */}
            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={{ duration: 0.14 }}
                  className="absolute right-0 mt-1.5 w-76 sm:w-80 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-overlay)] p-3 shadow-[var(--shadow-xl)] z-50"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
                    <span className="text-xs font-bold text-[var(--fg-primary)]">
                      Operations Stream
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[var(--status-success-subtle)] text-[var(--status-success-text)] font-semibold">
                      TELEMETRY LIVE
                    </span>
                  </div>

                  <div className="py-3 text-center text-xs text-[var(--fg-tertiary)] space-y-1.5">
                    <Activity className="w-6 h-6 mx-auto opacity-30 mb-1" />
                    <p className="font-medium text-[var(--fg-secondary)]">No recent events</p>
                    <p className="text-[10px] leading-relaxed opacity-70">
                      A live notification webhook endpoint is not yet wired to this build.<br />
                      Visit the <span className="font-mono">Audit Trail</span> for real-time event logs.
                    </p>
                  </div>

                  <button
                    onClick={handleTestNotification}
                    className="w-full text-center text-[11px] font-bold text-[var(--brand-primary)] hover:underline pt-1"
                  >
                    Simulate Live Telemetry Event
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Quick Settings */}
          <button
            onClick={() => {
              toast.info("Operating System Settings", "RecoverAI Architecture v3.2 configuration active.");
            }}
            className="p-1.5 text-[var(--fg-tertiary)] hover:text-[var(--fg-primary)] rounded-[var(--radius-md)] hover:bg-[var(--bg-raised)] transition-colors"
            title="System Configuration"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
