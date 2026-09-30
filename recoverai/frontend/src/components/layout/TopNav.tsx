"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, ShieldAlert, CreditCard, Terminal,
  PlayCircle, PieChart, LineChart, Users, History,
  Activity, Menu, X, Command, TrendingUp, ChevronDown,
  User, LogOut, CheckCircle2, Zap, HelpCircle
} from "lucide-react";
import { MerchantSwitcher } from "@/components/ui-custom/MerchantSwitcher";
import { useAuth, PRESET_USERS } from "@/context/AuthContext";
import { fetchApi } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { QuickDemoModal } from "@/components/overview/QuickDemoModal";
import { HowItWorksModal } from "@/components/overview/HowItWorksModal";

interface PrimaryNavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const PRIMARY_NAV: PrimaryNavItem[] = [
  { name: "Overview",     href: "/",               icon: LayoutDashboard },
  { name: "Recovery",     href: "/recovery",       icon: ShieldAlert, badge: "LIVE" },
  { name: "Transactions", href: "/transactions",   icon: CreditCard },
  { name: "AI Engine",    href: "/command-center", icon: Terminal },
  { name: "Simulator",    href: "/simulator",      icon: PlayCircle },
];

const MORE_TOOLS = [
  { name: "Analytics & Trends",    href: "/analytics",    icon: PieChart,   desc: "Recovery rates & cohort charts" },
  { name: "Revenue Intelligence",  href: "/intelligence", icon: LineChart,  desc: "Leakage detection & recovery score" },
  { name: "Human Review Queue",    href: "/review",       icon: Users,      desc: "Manual review & HITL approvals" },
  { name: "Audit Trail",           href: "/audit",        icon: History,    desc: "Immutable ledger & compliance log" },
  { name: "System Health",         href: "/system",       icon: Activity,   desc: "Multi-tenant engine & latency status" },
];

interface TopNavProps {
  onOpenCommandPalette?: () => void;
}

export function TopNav({ onOpenCommandPalette }: TopNavProps) {
  const pathname = usePathname();
  const { user, logout, switchPersona, isAuthenticated } = useAuth();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [systemOk, setSystemOk] = useState<boolean | null>(null);
  const [quickDemoOpen, setQuickDemoOpen] = useState(false);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);

  const toolsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close menus on route change
  useEffect(() => {
    setMobileOpen(false);
    setToolsOpen(false);
    setUserMenuOpen(false);
  }, [pathname]);

  // Click outside listener for dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (toolsRef.current && !toolsRef.current.contains(event.target as Node)) {
        setToolsOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // System health poll
  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetchApi<Record<string, string>>("/system/health");
        setSystemOk(Object.values(res).every((s) => s === "OK" || s === "connected"));
      } catch {
        setSystemOk(true); // fallback default
      }
    };
    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, []);

  const isPrimaryActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname?.startsWith(href);

  const isToolsActive = MORE_TOOLS.some((t) => pathname?.startsWith(t.href));

  // Role badge color helper
  const getRoleBadgeStyle = (role?: string) => {
    switch (role) {
      case "Admin":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "Finance Ops":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Risk Reviewer":
        return "bg-amber-50 text-amber-700 border-amber-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <>
      <header
        className="sticky top-0 z-50 w-full shrink-0"
        style={{
          background: "#0A2540",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 2px 8px rgba(10,37,64,0.35)",
        }}
      >
        <div className="flex items-center h-14 px-4 sm:px-6 gap-3 lg:gap-4 max-w-screen-2xl mx-auto">
          {/* ── Brand Logo ─────────────────────────────────────────────── */}
          <Link
            href="/"
            className="flex items-center gap-2.5 shrink-0 group mr-2"
            aria-label="PayRecover Home"
          >
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shadow-sm transition-transform group-hover:scale-105"
              style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)" }}
            >
              <TrendingUp className="h-3.5 w-3.5 text-white" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                PayRecover
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded hidden sm:inline-block"
                  style={{ background: "rgba(37,99,235,0.35)", color: "#93C5FD", border: "1px solid rgba(37,99,235,0.4)" }}>
                  Enterprise
                </span>
              </span>
              <span className="text-[9px] font-mono font-medium tracking-wider uppercase mt-0.5" style={{ color: "rgba(148,163,184,0.8)" }}>
                Revenue Engine
              </span>
            </div>
          </Link>

          {/* ── Clean Organized Navigation ─────────────────────────────── */}
          <nav className="hidden lg:flex items-center gap-1 flex-1 overflow-x-auto no-scrollbar">
            {PRIMARY_NAV.map((item) => {
              const active = isPrimaryActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium whitespace-nowrap transition-all duration-150 shrink-0",
                    active
                      ? "text-white font-semibold"
                      : "text-slate-300 hover:text-white hover:bg-white/08"
                  )}
                  style={active ? { background: "rgba(255,255,255,0.14)" } : {}}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{item.name}</span>
                  {item.badge && (
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full"
                      style={{ background: "rgba(16,185,129,0.20)", color: "#6EE7B7", border: "1px solid rgba(16,185,129,0.35)" }}>
                      {item.badge}
                    </span>
                  )}
                  {active && (
                    <motion.div
                      layoutId="nav-active-indicator"
                      className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full"
                      style={{ background: "#38BDF8" }}
                      transition={{ type: "spring", stiffness: 450, damping: 35 }}
                    />
                  )}
                </Link>
              );
            })}

            {/* ── More Tools Dropdown ──────────────────────────────────── */}
            <div className="relative" ref={toolsRef}>
              <button
                onClick={() => setToolsOpen(!toolsOpen)}
                className={cn(
                  "flex items-center gap-1 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-150 shrink-0",
                  isToolsActive
                    ? "text-white font-semibold"
                    : "text-slate-300 hover:text-white"
                )}
                style={isToolsActive ? { background: "rgba(255,255,255,0.14)" } : {}}
              >
                <span>Intelligence & Logs</span>
                <ChevronDown className={cn("w-3 h-3 transition-transform", toolsOpen && "rotate-180")} />
              </button>

              <AnimatePresence>
                {toolsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 mt-1.5 w-64 rounded-xl border border-[var(--border-subtle)] bg-white p-1.5 shadow-xl shadow-slate-200/50 z-50"
                  >
                    <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-[var(--fg-tertiary)] font-semibold">
                      Enterprise Modules
                    </div>
                    {MORE_TOOLS.map((tool) => {
                      const Icon = tool.icon;
                      const active = pathname?.startsWith(tool.href);
                      return (
                        <Link
                          key={tool.name}
                          href={tool.href}
                          onClick={() => setToolsOpen(false)}
                          className={cn(
                            "flex items-start gap-2.5 p-2 rounded-lg text-xs transition-colors",
                            active
                              ? "bg-indigo-50 text-indigo-900 font-semibold"
                              : "text-slate-700 hover:bg-slate-50"
                          )}
                        >
                          <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center shrink-0 mt-0.5 text-indigo-600">
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="font-medium text-slate-800">{tool.name}</div>
                            <div className="text-[11px] text-slate-400 font-normal">{tool.desc}</div>
                          </div>
                        </Link>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </nav>

          {/* ── Right Controls Hub ─────────────────────────────────────── */}
          <div className="flex items-center gap-2 shrink-0 ml-auto">
            {/* 1-Click Interactive Demo Button */}
            <button
              onClick={() => setQuickDemoOpen(true)}
              title="Watch 1-Click AI Recovery Demo"
              className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-semibold text-white transition-all shadow-sm group hover:brightness-110 active:scale-95"
              style={{
                background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
                border: "1px solid rgba(255,255,255,0.25)",
              }}
            >
              <Zap className="w-3.5 h-3.5 fill-current text-sky-200 group-hover:animate-bounce" />
              <span className="hidden sm:inline">1-Click Demo</span>
            </button>

            {/* How It Works Button */}
            <button
              onClick={() => setHowItWorksOpen(true)}
              title="How PayRecover saves revenue"
              className="hidden md:inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-medium transition-colors"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "rgba(255,255,255,0.85)",
              }}
            >
              <HelpCircle className="w-3.5 h-3.5 text-sky-300" />
              <span>How it works</span>
            </button>

            {/* Quick ⌘K Search */}
            <button
              onClick={onOpenCommandPalette}
              title="Search commands (⌘K)"
              className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs transition-colors"
              style={{
                background: "rgba(255,255,255,0.10)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "rgba(255,255,255,0.7)",
              }}
            >
              <div
                className={cn(
                  "w-1.5 h-1.5 rounded-full shrink-0",
                  systemOk === null ? "bg-slate-400 animate-pulse" :
                  systemOk ? "bg-emerald-400" : "bg-amber-400 animate-pulse"
                )}
                title={systemOk ? "All Systems Operational" : "Degraded"}
              />
              <Command className="w-3 h-3" style={{ color: "rgba(148,163,184,0.8)" }} />
              <span className="font-mono text-[11px] hidden sm:inline" style={{ color: "rgba(148,163,184,0.8)" }}>⌘K</span>
            </button>

            {/* Merchant Switcher (Tenants) */}
            <MerchantSwitcher />

            {/* User Account / Multi-User Dropdown */}
            {isAuthenticated && user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 h-8 pl-1.5 pr-2.5 rounded-lg transition-colors"
                  style={{
                    background: "rgba(255,255,255,0.10)",
                    border: "1px solid rgba(255,255,255,0.18)",
                  }}
                >
                  <div className="w-6 h-6 rounded-md text-white font-semibold text-[11px] flex items-center justify-center"
                    style={{ background: "#2563EB" }}>
                    {user.name.charAt(0)}
                  </div>
                  <div className="flex flex-col text-left leading-none hidden sm:flex">
                    <span className="text-[12px] font-semibold text-white truncate max-w-[90px]">
                      {user.name.split(" ")[0]}
                    </span>
                    <span className="text-[9px] font-mono" style={{ color: "rgba(148,163,184,0.8)" }}>
                      {user.role}
                    </span>
                  </div>
                  <ChevronDown className="w-3 h-3" style={{ color: "rgba(148,163,184,0.8)" }} />
                </button>

                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 6 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 4 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-1.5 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-300/40 z-50 text-slate-800"
                    >
                      {/* Active Profile Info */}
                      <div className="p-2 border-b border-slate-100">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
                            {user.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-xs text-slate-900 truncate">{user.name}</div>
                            <div className="text-[11px] text-slate-400 truncate">{user.email}</div>
                          </div>
                        </div>
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <span className={cn("text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border", getRoleBadgeStyle(user.role))}>
                            {user.role}
                          </span>
                          <span className="text-[10px] text-emerald-600 flex items-center gap-1 ml-auto">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Active
                          </span>
                        </div>
                      </div>

                      {/* 1-Click Role Switcher */}
                      <div className="py-2 border-b border-slate-100">
                        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-2 mb-1.5">
                          Switch Demo Persona
                        </div>
                        <div className="space-y-0.5">
                          {PRESET_USERS.map((preset) => {
                            const isCurrent = user.email === preset.email;
                            return (
                              <button
                                key={preset.id}
                                onClick={() => {
                                  switchPersona(preset.role);
                                  setUserMenuOpen(false);
                                }}
                                className={cn(
                                  "w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition-colors text-left",
                                  isCurrent
                                    ? "bg-indigo-50 text-indigo-700 font-semibold"
                                    : "text-slate-600 hover:bg-slate-50"
                                )}
                              >
                                <span>{preset.name} ({preset.role})</span>
                                {isCurrent && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Navigation & Logout */}
                      <div className="pt-1">
                        <Link
                          href="/login"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>Switch Account / Sign In</span>
                        </Link>
                        <button
                          onClick={() => {
                            setUserMenuOpen(false);
                            logout();
                          }}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs transition-colors shadow-sm shadow-indigo-500/20"
              >
                <User className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </Link>
            )}

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="p-1.5 rounded-lg text-[var(--fg-secondary)] hover:text-[var(--fg-primary)] hover:bg-[var(--bg-surface-alt)] transition-colors lg:hidden"
              aria-label="Open navigation"
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* ── Mobile Drawer ────────────────────────────────────────────── */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t border-[var(--border-subtle)] lg:hidden bg-white"
            >
              <nav className="p-3 space-y-1 max-w-screen-2xl mx-auto">
                <div className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1">Core Workflows</div>
                {PRIMARY_NAV.map((item) => {
                  const active = isPrimaryActive(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                        active
                          ? "bg-indigo-50 text-indigo-700 font-semibold"
                          : "text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0 text-slate-400" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}

                <div className="text-[10px] uppercase font-bold text-slate-400 px-2 pt-3 pb-1">Intelligence & Logs</div>
                {MORE_TOOLS.map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <Link
                      key={tool.name}
                      href={tool.href}
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      <Icon className="h-4 w-4 shrink-0 text-slate-400" />
                      <span>{tool.name}</span>
                    </Link>
                  );
                })}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Global Quick Demo & How It Works Modals */}
      <QuickDemoModal
        isOpen={quickDemoOpen}
        onClose={() => setQuickDemoOpen(false)}
      />

      <HowItWorksModal
        isOpen={howItWorksOpen}
        onClose={() => setHowItWorksOpen(false)}
        onOpenQuickDemo={() => {
          setHowItWorksOpen(false);
          setQuickDemoOpen(true);
        }}
      />
    </>
  );
}
