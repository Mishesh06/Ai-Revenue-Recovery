"use client";

import React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────────
   SectionCard — RecoverAI Design System
   Reusable container for sheet drawers, inspection panels, and metadata blocks.
   ──────────────────────────────────────────────────────────────────────────── */

interface SectionCardProps {
  title: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  badge?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

export function SectionCard({
  title,
  icon: Icon,
  action,
  badge,
  children,
  className,
  contentClassName,
}: SectionCardProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden shadow-[var(--shadow-xs)]",
        className
      )}
    >
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-[var(--bg-surface-alt)] border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-3.5 h-3.5 text-[var(--fg-tertiary)]" />}
          <h4 className="text-xs font-semibold text-[var(--fg-primary)] tracking-tight">
            {title}
          </h4>
          {badge}
        </div>
        {action && <div>{action}</div>}
      </div>

      <div className={cn("p-3.5 text-xs text-[var(--fg-secondary)] font-mono", contentClassName)}>
        {children}
      </div>
    </div>
  );
}
