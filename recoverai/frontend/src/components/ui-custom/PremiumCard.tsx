"use client";

import React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { hoverElevationVariants } from "@/lib/motion";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────────
   PremiumCard — RecoverAI Design System
   Sophisticated fintech card with subtle border sheen, optional glass finish,
   hover micro-elevation, and asymmetric accent headers.
   ──────────────────────────────────────────────────────────────────────────── */

export type CardVariant = "default" | "glass" | "dark" | "flat" | "elevated";

export interface PremiumCardProps extends Omit<HTMLMotionProps<"div">, "children"> {
  variant?: CardVariant;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  badge?: React.ReactNode;
  title?: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  interactive?: boolean;
  glow?: "brand" | "success" | "warning" | "danger" | "review" | "none";
  className?: string;
  contentClassName?: string;
  children?: React.ReactNode;
}

const GLOW_CLASSES: Record<NonNullable<PremiumCardProps["glow"]>, string> = {
  none: "",
  brand: "hover:border-[var(--brand-primary)]/30 transition-colors",
  success: "hover:border-[var(--status-success)]/30 transition-colors",
  warning: "hover:border-[var(--status-warning)]/30 transition-colors",
  danger: "hover:border-[var(--status-danger)]/30 transition-colors",
  review: "hover:border-[var(--status-review)]/30 transition-colors",
};

const VARIANT_CLASSES: Record<CardVariant, string> = {
  default: "bg-[var(--bg-surface)] border-[var(--border-subtle)] shadow-[var(--shadow-xs)]",
  glass: "glass-panel shadow-[var(--shadow-xs)]",
  dark: "bg-[var(--neutral-charcoal)] border-[var(--border-subtle)] text-[var(--fg-primary)] shadow-[var(--shadow-xs)]",
  flat: "bg-[var(--bg-surface-alt)] border-[var(--border-subtle)] shadow-none",
  elevated: "bg-[var(--bg-surface)] border-[var(--border-default)] shadow-[var(--shadow-sm)]",
};

export function PremiumCard({
  variant = "default",
  header,
  footer,
  badge,
  title,
  subtitle,
  icon: Icon,
  interactive = false,
  glow = "none",
  className,
  contentClassName,
  children,
  ...props
}: PremiumCardProps) {
  const isDark = variant === "dark";

  return (
    <motion.div
      variants={interactive ? hoverElevationVariants : undefined}
      initial={interactive ? "rest" : undefined}
      whileHover={interactive ? "hover" : undefined}
      whileTap={interactive ? "tap" : undefined}
      className={cn(
        "relative rounded-[var(--radius-lg)] border overflow-hidden",
        "transition-colors duration-[var(--duration-fast)]",
        VARIANT_CLASSES[variant],
        interactive && "cursor-pointer",
        GLOW_CLASSES[glow],
        className
      )}
      {...props}
    >
      {/* Optional Top Sheen Highlight for high-end look */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />

      {/* Header section if provided via props */}
      {(header || title || Icon || badge) && (
        <div
          className={cn(
            "flex items-center justify-between px-5 py-4 border-b",
            isDark
              ? "border-[var(--neutral-graphite)] bg-[var(--neutral-charcoal-dark)]/40"
              : "border-[var(--border-subtle)] bg-[var(--bg-surface-alt)]/40"
          )}
        >
          {header ? (
            header
          ) : (
            <div className="flex items-center justify-between w-full gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                {Icon && (
                  <div
                    className={cn(
                      "w-7 h-7 rounded-[var(--radius-sm)] flex items-center justify-center flex-shrink-0",
                      isDark
                        ? "bg-[var(--neutral-graphite)] text-[var(--brand-primary-light)]"
                        : "bg-[var(--brand-primary-muted)] text-[var(--brand-primary)]"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                )}
                <div className="flex flex-col min-w-0">
                  {title && (
                    <h3
                      className={cn(
                        "text-sm font-semibold tracking-tight leading-none truncate",
                        isDark ? "text-white" : "text-[var(--fg-primary)]"
                      )}
                    >
                      {title}
                    </h3>
                  )}
                  {subtitle && (
                    <p
                      className={cn(
                        "text-[11px] mt-1 truncate",
                        isDark ? "text-[var(--neutral-silver)]" : "text-[var(--fg-tertiary)]"
                      )}
                    >
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>

              {badge && <div className="flex-shrink-0">{badge}</div>}
            </div>
          )}
        </div>
      )}

      {/* Main Card Content */}
      <div className={cn("p-5", contentClassName)}>
        {children}
      </div>

      {/* Optional Card Footer */}
      {footer && (
        <div
          className={cn(
            "px-5 py-3 border-t text-xs",
            isDark
              ? "border-[var(--neutral-graphite)] bg-[var(--neutral-charcoal-dark)]/30 text-[var(--neutral-silver)]"
              : "border-[var(--border-subtle)] bg-[var(--bg-surface-alt)]/30 text-[var(--fg-tertiary)]"
          )}
        >
          {footer}
        </div>
      )}
    </motion.div>
  );
}
