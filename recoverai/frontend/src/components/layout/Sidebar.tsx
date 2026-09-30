"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, LineChart, ShieldAlert, CreditCard,
  Terminal, Users, PlayCircle, PieChart, History,
  Activity, ShieldCheck, X, ChevronRight, PanelLeftClose,
  PanelLeftOpen, Sparkles, Command, Cpu, Building2
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useMerchant } from "@/context/MerchantContext";
import { cn, truncateId } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────────
   Sidebar — PayRecover Operating System Navigation
   Collapsible, responsive sidebar with smooth width transitions, active route
   indicators, tooltips in collapsed mode, and system status heartbeats.
   ──────────────────────────────────────────────────────────────────────────── */

export interface NavSectionItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  kicker?: string;
  badge?: string;
}

const PRIMARY_SECTIONS: { title: string; items: NavSectionItem[] }[] = [
  {
    title: "OPERATIONS",
    items: [
      { name: "Overview", href: "/", icon: LayoutDashboard },
      { name: "Recovery Center", href: "/recovery", icon: ShieldAlert, badge: "LIVE" },
      { name: "Transactions", href: "/transactions", icon: CreditCard },
      { name: "Simulator", href: "/simulator", icon: PlayCircle },
    ],
  },
  {
    title: "AI INTELLIGENCE",
    items: [
      { name: "Revenue Intelligence", href: "/intelligence", icon: LineChart },
      { name: "AI Command Center", href: "/command-center", icon: Terminal },
      { name: "Human Review", href: "/review", icon: Users },
    ],
  },
  {
    title: "GOVERNANCE",
    items: [
      { name: "Analytics", href: "/analytics", icon: PieChart },
      { name: "Audit Trail", href: "/audit", icon: History },
    ],
  },
];

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  onOpenCommandPalette?: () => void;
}

export function Sidebar({
  isOpen,
  setIsOpen,
  isCollapsed,
  setIsCollapsed,
  onOpenCommandPalette,
}: SidebarProps) {
  const pathname = usePathname();
  const { merchantId } = useMerchant();

  // Keyboard shortcut listener: ⌘B to toggle collapse
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "b") {
        e.preventDefault();
        setIsCollapsed(!isCollapsed);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCollapsed, setIsCollapsed]);

  return (
    <TooltipProvider delay={100}>
      {/* Mobile Drawer Backdrop */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col justify-between border-r select-none",
          "transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] md:relative",
          isCollapsed ? "w-[68px]" : "w-64",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
        style={{
          background: "var(--bg-sidebar)",
          borderColor: "var(--border-sidebar)",
        }}
      >
        {/* Top: Logo & Collapse Toggle */}
        <div className="flex flex-col flex-1 min-h-0">
          {/* Logo Header */}
          <div
            className={cn(
              "flex items-center h-14 px-3.5 border-b shrink-0 transition-all duration-300",
              isCollapsed ? "justify-center" : "justify-between"
            )}
            style={{
              background: "var(--bg-sidebar-header)",
              borderColor: "var(--border-sidebar)",
            }}
          >
            <Link
              href="/"
              onClick={() => setIsOpen(false)}
              className={cn("flex items-center gap-2.5 group min-w-0", isCollapsed && "justify-center")}
            >
              <div className="w-7 h-7 rounded-[var(--radius-sm)] bg-[var(--brand-primary)] flex items-center justify-center shadow-[var(--glow-brand)] flex-shrink-0 transition-transform group-hover:scale-105">
                <ShieldCheck className="h-4 w-4 text-white" />
              </div>

              {!isCollapsed && (
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-white tracking-tight leading-none group-hover:text-[var(--brand-primary-light)] transition-colors truncate">
                      PayRecover
                    </span>
                    <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-white/10 text-[var(--neutral-cloud)] font-semibold">
                      v3.2
                    </span>
                  </div>
                  <span className="text-[9px] font-mono font-medium text-[var(--fg-sidebar-muted)] tracking-wider mt-0.5 uppercase truncate">
                    AI Revenue Recovery OS
                  </span>
                </div>
              )}
            </Link>

            {/* Desktop Collapse Button */}
            {!isCollapsed && (
              <button
                onClick={() => setIsCollapsed(true)}
                title="Collapse Sidebar (⌘B)"
                className="hidden md:flex p-1 text-[var(--fg-sidebar-default)] hover:text-white rounded hover:bg-white/5 transition-colors"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            )}

            {/* Mobile Close Button */}
            <button
              aria-label="Close navigation"
              className="md:hidden p-1 text-[var(--fg-sidebar-default)] hover:text-white rounded"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Quick Command Bar Trigger in Collapsed Mode */}
          {isCollapsed && (
            <div className="px-2.5 py-2 border-b border-[var(--border-sidebar)] flex justify-center">
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      onClick={onOpenCommandPalette}
                      className="w-9 h-9 rounded-[var(--radius-md)] bg-white/5 hover:bg-white/10 text-[var(--fg-sidebar-default)] hover:text-white flex items-center justify-center transition-colors"
                    >
                      <Command className="w-4 h-4" />
                    </button>
                  }
                />
                <TooltipContent side="right" className="font-mono text-xs">
                  Command Palette (⌘K)
                </TooltipContent>
              </Tooltip>
            </div>
          )}

          {/* Navigation Scrollable Body */}
          <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-5">
            {PRIMARY_SECTIONS.map((section, sIdx) => (
              <div key={sIdx} className="space-y-0.5">
                {!isCollapsed && (
                  <h3 className="px-2.5 mb-1.5 sidebar-section-label text-[10px] tracking-wider text-[var(--fg-sidebar-muted)]">
                    {section.title}
                  </h3>
                )}

                <nav className="space-y-0.5">
                  {section.items.map((item) => {
                    const isActive =
                      pathname === item.href ||
                      (item.href !== "/" && pathname?.startsWith(item.href));

                    return (
                      <NavItem
                        key={item.name}
                        item={item}
                        isActive={isActive}
                        isCollapsed={isCollapsed}
                        onSelect={() => setIsOpen(false)}
                      />
                    );
                  })}
                </nav>
              </div>
            ))}

            {/* System Health Quick Section */}
            <div className="pt-2 border-t border-[var(--border-sidebar)]">
              {!isCollapsed ? (
                <div className="px-2.5 py-2 rounded-[var(--radius-md)] bg-white/[0.02] border border-[var(--border-sidebar)]">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <div className="flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-[var(--brand-primary-light)]" />
                      <span className="font-semibold text-white text-[11px]">System Health</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="status-dot ok" />
                      <span className="text-[10px] font-mono text-[var(--status-success-light)] font-bold">
                        100%
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] text-[var(--fg-sidebar-default)] font-mono leading-tight">
                    7 orchestrator microservices operational
                  </p>
                </div>
              ) : (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <div className="w-full flex justify-center py-2">
                        <div className="w-8 h-8 rounded-[var(--radius-md)] bg-white/5 flex items-center justify-center">
                          <span className="status-dot ok" />
                        </div>
                      </div>
                    }
                  />
                  <TooltipContent side="right" className="font-mono text-xs">
                    System Health: 100% Operational
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
        </div>

        {/* Footer: User Workspace / Expand Trigger */}
        <div
          className="p-2.5 border-t shrink-0 transition-all duration-300"
          style={{
            background: "var(--bg-sidebar-header)",
            borderColor: "var(--border-sidebar)",
          }}
        >
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-2">
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      onClick={() => setIsCollapsed(false)}
                      className="w-8 h-8 rounded-[var(--radius-sm)] bg-white/5 hover:bg-white/10 text-[var(--fg-sidebar-default)] hover:text-white flex items-center justify-center transition-colors"
                    >
                      <PanelLeftOpen className="h-4 w-4" />
                    </button>
                  }
                />
                <TooltipContent side="right" className="font-mono text-xs">
                  Expand Sidebar (⌘B)
                </TooltipContent>
              </Tooltip>

              <div className="w-7 h-7 rounded-full bg-[var(--brand-primary)]/20 border border-[var(--brand-primary)]/40 flex items-center justify-center text-white text-[10px] font-bold">
                MP
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between p-1.5 rounded-[var(--radius-md)] hover:bg-white/[0.04] transition-colors cursor-pointer group">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-full bg-[var(--brand-primary)]/20 border border-[var(--brand-primary)]/40 flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">
                  MP
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold text-white truncate leading-none group-hover:text-[var(--brand-primary-light)] transition-colors">
                    Mishesh Patel
                  </span>
                  <span className="text-[10px] text-[var(--fg-sidebar-default)] font-mono truncate mt-0.5">
                    {merchantId ? `Org: ${truncateId(merchantId, 8)}` : "Operations Lead"}
                  </span>
                </div>
              </div>

              <div className="w-2 h-2 rounded-full bg-[var(--status-success)] shadow-[var(--glow-success)] flex-shrink-0" />
            </div>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}

function NavItem({
  item,
  isActive,
  isCollapsed,
  onSelect,
}: {
  item: NavSectionItem;
  isActive: boolean;
  isCollapsed: boolean;
  onSelect: () => void;
}) {
  const Icon = item.icon;

  const content = (
    <Link
      href={item.href}
      onClick={onSelect}
      className={cn(
        "relative flex items-center text-xs font-medium rounded-[var(--radius-md)] group",
        "transition-colors duration-150",
        isCollapsed ? "justify-center p-2.5" : "px-2.5 py-1.5",
        isActive
          ? "text-white"
          : "text-[var(--fg-sidebar-default)] hover:text-white hover:bg-white/[0.04]"
      )}
    >
      {/* Sliding Active Background Indicator with Framer Motion */}
      {isActive && (
        <motion.div
          layoutId="sidebar-active-indicator"
          transition={{ type: "spring", stiffness: 400, damping: 35 }}
          className="absolute inset-0 rounded-[var(--radius-md)] bg-[var(--bg-sidebar-item-active)] border border-[var(--border-sidebar-active)] shadow-[var(--glow-brand)]"
        />
      )}

      <span className="relative z-10 flex items-center gap-2.5 min-w-0">
        <Icon
          className={cn(
            "h-4 w-4 flex-shrink-0 transition-colors",
            isActive ? "text-[var(--brand-primary-light)]" : "text-[var(--fg-sidebar-default)] group-hover:text-white"
          )}
        />
        {!isCollapsed && <span className="truncate">{item.name}</span>}
      </span>

      {!isCollapsed && item.badge && (
        <span
          className={cn(
            "relative z-10 ml-auto text-[9px] font-mono font-bold px-1.5 py-0.2 rounded",
            item.badge === "LIVE"
              ? "bg-[var(--status-success-subtle)] text-[var(--status-success-text)]"
              : "bg-[var(--brand-primary)] text-white"
          )}
        >
          {item.badge}
        </span>
      )}

      {isCollapsed && isActive && (
        <motion.div
          layoutId="sidebar-active-dot"
          className="absolute right-1 w-1 h-1 rounded-full bg-[var(--brand-primary-light)] shadow-[var(--glow-brand)]"
        />
      )}
    </Link>
  );

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger render={content} />
        <TooltipContent side="right" className="font-sans text-xs">
          <div className="font-semibold">{item.name}</div>
          {item.badge && <div className="text-[10px] font-mono text-[var(--brand-primary)]">Status: {item.badge}</div>}
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
}
