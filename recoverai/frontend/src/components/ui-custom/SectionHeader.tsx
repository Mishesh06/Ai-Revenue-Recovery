"use client";

import React from "react";
import { motion } from "framer-motion";
import { fadeVariants } from "@/lib/motion";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────────
   SectionHeader — PayRecover Design System
   Cinematic section and page header with category kicker, badge, actions,
   and clean fintech visual hierarchy.
   ──────────────────────────────────────────────────────────────────────────── */

export interface SectionHeaderProps {
  kicker?: string;
  title: string;
  description?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "display";
  borderBottom?: boolean;
  className?: string;
}

export function SectionHeader({
  kicker,
  title,
  description,
  badge,
  actions,
  size = "md",
  borderBottom = false,
  className,
}: SectionHeaderProps) {
  const titleClass =
    size === "display"
      ? "text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight"
      : size === "lg"
      ? "text-xl sm:text-2xl font-bold tracking-tight"
      : size === "sm"
      ? "text-base font-semibold tracking-tight"
      : "text-lg sm:text-xl font-bold tracking-tight";

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeVariants}
      className={cn(
        "flex flex-col md:flex-row md:items-center justify-between gap-4",
        borderBottom && "pb-4 border-b border-[var(--border-subtle)]",
        className
      )}
    >
      <div className="min-w-0">
        {kicker && (
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono font-bold tracking-[0.1em] uppercase text-[var(--brand-primary)]">
              {kicker}
            </span>
          </div>
        )}

        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className={cn("text-[var(--fg-primary)] leading-snug", titleClass)}>
            {title}
          </h1>
          {badge && <div className="flex-shrink-0">{badge}</div>}
        </div>

        {description && (
          <p className="text-xs text-[var(--fg-tertiary)] mt-1 max-w-3xl leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap self-start md:self-auto flex-shrink-0">
          {actions}
        </div>
      )}
    </motion.div>
  );
}
