"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, LineChart, ShieldAlert, CreditCard,
  Terminal, Users, PlayCircle, PieChart, History,
  Activity, ShieldCheck, Menu, X, Command,
  Sparkles, Zap, Bell, Settings, ChevronRight
} from "lucide-react";
import { MerchantSwitcher } from "@/components/ui-custom/MerchantSwitcher";
import { useToast } from "@/context/ToastContext";
import { fetchApi } from "@/lib/api-client";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────────
   TopNav — RecoverAI Premium Horizontal Navigation
   Sticky horizontal nav bar with animated active indicator, mobile drawer,
   merchant switcher, system status, and command palette trigger.
   ──────────────────────────────────────────────────────────────────────────── */

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  shortLabel?: string;
}

const NAV_ITEMS: NavItem[] = [
  { name: "Overview",            href: "/",              icon: LayoutDashboard, shortLabel: "Overview" },
  { name: "Revenue Intelligence",href: "/intelligence",  icon: LineChart,        shortLabel: "Revenue" },
  { name: "Recovery Center",     href: "/recovery",      icon: ShieldAlert,      shortLabel: "Recovery", badge: "LIVE" },
  { name: "Transactions",        href: "/transactions",  icon: CreditCard,       shortLabel: "Ledger" },
  { name: "AI Command Center",   href: "/command-center",icon: Terminal,         shortLabel: "AI Cmd" },
  { name: "Human Review",        href: "/review",        icon: Users,            shortLabel: "Review" },
  { name: "Simulator",           href: "/simulator",     icon: PlayCircle,       shortLabel: "Sim" },
  { name: "Analytics",           href: "/analytics",     icon: PieChart,         shortLabel: "Analytics" },
  { name: "Audit Trail",         href: "/audit",         icon: History,          shortLabel: "Audit" },
  { name: "System Health",       href: "/system",        icon: Activity,         shortLabel: "System" },
];

interface TopNavProps {
  onOpenCommandPalette?: () => void;
}

export function TopNav({ onOpenCommandPalette }: TopNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [systemOk, setSystemOk] = useState<boolean | null>(null);
  const [unreadCount, setUnreadCount] = useState(2);
  const [showNotifications, setShowNotifications] = useState(false);
  const { toast } = useToast();
  const notifRef = useRef<HTMLDivElement>(null);

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // Close notifications on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // System health poll
  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetchApi<Record<string, string>>("/system/health");
        setSystemOk(Object.values(res).every(s => s === "OK" || s === "connected"));
      } catch { setSystemOk(false); }
    };
    check();
    const id = setInterval(check, 45_000);
    return () => clearInterval(id);
  }, []);

  const isActive = (item: NavItem) =>
    item.href === "/" ? pathname === "/" : pathname?.startsWith(item.href);

  return (
    <>
      {/* ── Main Nav Bar ─────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-50 w-full shrink-0"
        style={{
          background: "var(--bg-nav)",
          borderBottom: "1px solid var(--border-nav)",
        }}
      >
        {/* Top-of-bar subtle hairline highlight */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[var(--brand-primary)]/20 to-transparent" />

        <div className="flex items-center h-14 px-4 sm:px-6 gap-4 lg:gap-6">
          {/* ── Logo ───────────────────────────────────────────────────── */}
          <Link
            href="/"
            className="flex items-center gap-2.5 shrink-0 group mr-2"
            aria-label="RecoverAI Home"
          >
            <div
              className="w-7 h-7 rounded-[var(--radius-sm)] flex items-center justify-center transition-transform group-hover:scale-105"
              style={{ background: "var(--brand-primary)" }}
            >
              <ShieldCheck className="h-4 w-4 text-white" />
            </div>
            <div className="hidden sm:flex flex-col leading-none">
              <span className="text-sm font-bold tracking-tight text-[var(--fg-primary)] group-hover:text-[var(--brand-primary-light)] transition-colors">
                RecoverAI
              </span>
              <span className="text-[9px] font-mono font-semibold text-[var(--fg-tertiary)] tracking-wider uppercase mt-0.5">
                v3.2
              </span>
            </div>
          </Link>

          {/* ── Desktop Nav Items (hidden on mobile) ─────────────────── */}
          <nav className="hidden lg:flex items-center gap-0.5 flex-1 overflow-x-auto no-scrollbar">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item);
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--radius-md)] text-xs font-medium whitespace-nowrap transition-colors duration-150 shrink-0",
                    active
                      ? "text-[var(--fg-primary)]"
                      : "text-[var(--fg-tertiary)] hover:text-[var(--fg-secondary)] hover:bg-[var(--bg-nav-item-hover)]"
                  )}
                >
                  {active && (
                    <motion.div
                      layoutId="nav-active-bg"
                      className="absolute inset-0 rounded-[var(--radius-md)]"
                      style={{ background: "var(--bg-nav-item-active)" }}
                      transition={{ type: "spring", stiffness: 400, damping: 35 }}
                    />
                  )}
                  <Icon
                    className={cn(
                      "w-3.5 h-3.5 relative z-10 shrink-0 transition-colors",
                      active ? "text-[var(--brand-primary-light)]" : "text-current"
                    )}
                  />
                  <span className="relative z-10">{item.name}</span>
                  {item.badge && (
                    <span className="relative z-10 text-[9px] font-mono font-bold px-1 py-0.5 rounded bg-[var(--status-success-subtle)] text-[var(--status-success-text)] border border-[var(--status-success-border)]">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* ── Medium screen — condensed icon nav ───────────────────── */}
          <nav className="hidden md:flex lg:hidden items-center gap-0.5 flex-1 overflow-x-auto no-scrollbar">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item);
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  title={item.name}
                  className={cn(
                    "relative flex items-center gap-1 px-2 py-1.5 rounded-[var(--radius-md)] text-[11px] font-medium whitespace-nowrap transition-colors duration-150 shrink-0",
                    active
                      ? "text-[var(--fg-primary)]"
                      : "text-[var(--fg-tertiary)] hover:text-[var(--fg-secondary)] hover:bg-[var(--bg-nav-item-hover)]"
                  )}
                >
                  {active && (
                    <motion.div
                      layoutId="nav-active-bg-md"
                      className="absolute inset-0 rounded-[var(--radius-md)]"
                      style={{ background: "var(--bg-nav-item-active)" }}
                      transition={{ type: "spring", stiffness: 400, damping: 35 }}
                    />
                  )}
                  <Icon className={cn("w-3.5 h-3.5 relative z-10 shrink-0", active ? "text-[var(--brand-primary-light)]" : "text-current")} />
                  <span className="relative z-10">{item.shortLabel ?? item.name.split(" ")[0]}</span>
                </Link>
              );
            })}
          </nav>

          {/* ── Right Controls ────────────────────────────────────────── */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto lg:ml-0">
            {/* ⌘K Trigger */}
            <button
              onClick={onOpenCommandPalette}
              className={cn(
                "hidden md:inline-flex items-center gap-1.5 h-7 px-2.5 rounded-[var(--radius-md)] text-xs text-[var(--fg-tertiary)]",
                "border border-[var(--border-subtle)] bg-[var(--bg-surface-alt)] hover:bg-[var(--bg-raised)] hover:text-[var(--fg-secondary)]",
                "transition-colors duration-150"
              )}
            >
              <Command className="w-3 h-3" />
              <span className="font-mono">K</span>
            </button>

            {/* System health */}
            <Link
              href="/system"
              title={systemOk === null ? "Checking systems…" : systemOk ? "All systems operational (Click to inspect)" : "Degraded (Click to inspect)"}
              className="hidden md:flex items-center gap-1.5 h-7 px-2.5 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface-alt)] hover:bg-[var(--bg-raised)] text-[11px] text-[var(--fg-secondary)] hover:text-[var(--fg-primary)] transition-colors"
            >
              <div className={cn(
                "w-1.5 h-1.5 rounded-full",
                systemOk === null ? "bg-[var(--status-neutral)] animate-pulse" :
                systemOk ? "bg-[var(--status-success)]" :
                "bg-[var(--status-warning)] animate-pulse"
              )} />
              <span className="font-mono font-medium hidden lg:inline">
                {systemOk === null ? "Checking" : systemOk ? "Operational" : "Degraded"}
              </span>
            </Link>

            {/* Merchant Switcher */}
            <MerchantSwitcher />

            {/* Notifications */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => { setShowNotifications(v => !v); if (!showNotifications) setUnreadCount(0); }}
                className="p-1.5 rounded-[var(--radius-md)] text-[var(--fg-tertiary)] hover:text-[var(--fg-primary)] hover:bg-[var(--bg-raised)] transition-colors relative"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[var(--brand-primary)] ring-2 ring-[var(--bg-canvas)] animate-pulse" />
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    transition={{ duration: 0.14 }}
                    className="absolute right-0 top-full mt-2 w-80 rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-overlay)] p-3 shadow-[var(--shadow-xl)] z-50"
                  >
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--border-subtle)]">
                      <span className="text-xs font-bold text-[var(--fg-primary)]">Operations Stream</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--status-success-subtle)] text-[var(--status-success-text)] border border-[var(--status-success-border)] font-semibold">
                        LIVE
                      </span>
                    </div>
                    <div className="py-3 text-center text-xs text-[var(--fg-tertiary)] space-y-1.5">
                      <Activity className="w-6 h-6 mx-auto opacity-30 mb-1" />
                      <p className="font-medium text-[var(--fg-secondary)]">No recent events</p>
                      <p className="text-[10px] leading-relaxed opacity-70">
                        Live notification webhook not yet connected.<br />
                        Check the <span className="font-mono">Audit Trail</span> for real-time logs.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setShowNotifications(false);
                        router.push("/simulator");
                        toast.info("Simulator Launched", "Configure or run autonomous pipeline simulations.");
                      }}
                      className="w-full text-center text-[11px] font-bold text-[var(--brand-primary)] hover:text-[var(--brand-primary-light)] transition-colors pt-2"
                    >
                      Simulate Live Telemetry →
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Settings */}
            <Link
              href="/system"
              title="System Telemetry & Architecture Settings"
              className="p-1.5 rounded-[var(--radius-md)] text-[var(--fg-tertiary)] hover:text-[var(--fg-primary)] hover:bg-[var(--bg-raised)] transition-colors hidden sm:inline-flex items-center justify-center"
            >
              <Settings className="h-4 w-4" />
            </Link>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(v => !v)}
              className="p-1.5 rounded-[var(--radius-md)] text-[var(--fg-tertiary)] hover:text-[var(--fg-primary)] hover:bg-[var(--bg-raised)] transition-colors md:hidden"
              aria-label="Open navigation"
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* ── Mobile Dropdown Menu ─────────────────────────────────────── */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden border-t border-[var(--border-subtle)] md:hidden"
              style={{ background: "var(--bg-nav)" }}
            >
              <nav className="p-3 space-y-0.5">
                {NAV_ITEMS.map((item) => {
                  const active = isActive(item);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2.5 rounded-[var(--radius-md)] text-sm font-medium transition-colors",
                        active
                          ? "bg-[var(--bg-nav-item-active)] text-[var(--fg-primary)] border border-[var(--border-nav-active)]"
                          : "text-[var(--fg-tertiary)] hover:text-[var(--fg-primary)] hover:bg-[var(--bg-raised)]"
                      )}
                    >
                      <Icon className={cn("h-4 w-4 shrink-0", active ? "text-[var(--brand-primary-light)]" : "text-current")} />
                      <span>{item.name}</span>
                      {item.badge && (
                        <span className="ml-auto text-[9px] font-mono font-bold px-1.5 rounded bg-[var(--status-success-subtle)] text-[var(--status-success-text)] border border-[var(--status-success-border)]">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </>
  );
}
