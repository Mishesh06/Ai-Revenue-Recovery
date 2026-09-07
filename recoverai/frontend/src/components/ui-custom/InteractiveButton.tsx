"use client";

import React, { useState } from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { Loader2, Check, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────────
   InteractiveButton — RecoverAI Design System
   Micro-interaction enabled fintech button with hover elevation, press damping,
   loading spinner state, and success checkmark confirmation.
   ──────────────────────────────────────────────────────────────────────────── */

export type ButtonVariant = "primary" | "secondary" | "outline" | "danger" | "success" | "ghost";
export type ButtonSize = "xs" | "sm" | "md" | "lg";

export interface InteractiveButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  isSuccess?: boolean;
  loadingText?: string;
  successText?: string;
  icon?: React.ComponentType<{ className?: string }>;
  iconPosition?: "left" | "right";
  children?: React.ReactNode;
  className?: string;
}

const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white shadow-[var(--shadow-xs)] hover:shadow-[var(--glow-brand)] border border-transparent",
  secondary:
    "bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-alt)] text-[var(--fg-primary)] border border-[var(--border-default)] shadow-[var(--shadow-xs)]",
  outline:
    "bg-transparent hover:bg-[var(--bg-surface-alt)] text-[var(--fg-secondary)] hover:text-[var(--fg-primary)] border border-[var(--border-subtle)] hover:border-[var(--border-default)]",
  danger:
    "bg-[var(--status-danger-subtle)] hover:bg-[var(--status-danger)] text-[var(--status-danger-text)] hover:text-white border border-[var(--status-danger-border)]",
  success:
    "bg-[var(--status-success)] hover:bg-[#15803D] text-white shadow-[var(--shadow-xs)] border border-transparent",
  ghost:
    "bg-transparent hover:bg-[var(--bg-surface-alt)] text-[var(--fg-secondary)] hover:text-[var(--fg-primary)] border-transparent",
};

const SIZE_STYLES: Record<ButtonSize, string> = {
  xs: "h-7 px-2.5 text-[11px] font-semibold rounded-[var(--radius-xs)] gap-1",
  sm: "h-8 px-3 text-xs font-semibold rounded-[var(--radius-md)] gap-1.5",
  md: "h-9 px-4 text-xs font-bold rounded-[var(--radius-md)] gap-2",
  lg: "h-11 px-6 text-sm font-bold rounded-[var(--radius-lg)] gap-2.5",
};

export function InteractiveButton({
  variant = "primary",
  size = "md",
  isLoading = false,
  isSuccess = false,
  loadingText,
  successText,
  icon: Icon,
  iconPosition = "left",
  children,
  disabled,
  className,
  ...props
}: InteractiveButtonProps) {
  const isDisabled = disabled || isLoading;

  return (
    <motion.button
      whileTap={!isDisabled ? { scale: 0.98, y: 0.5 } : undefined}
      transition={{ duration: 0.08, ease: "easeOut" }}
      disabled={isDisabled}
      className={cn(
        "relative inline-flex items-center justify-center font-sans tracking-tight select-none cursor-pointer",
        "transition-colors duration-[var(--duration-fast)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-2",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
        VARIANT_STYLES[variant],
        SIZE_STYLES[size],
        className
      )}
      {...props}
    >
      {/* Loading Spinner */}
      {isLoading ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
          <span>{loadingText || "Processing…"}</span>
        </>
      ) : isSuccess ? (
        <>
          <Check className="w-3.5 h-3.5 stroke-[3] text-current flex-shrink-0" />
          <span>{successText || "Completed"}</span>
        </>
      ) : (
        <>
          {Icon && iconPosition === "left" && (
            <Icon className="w-3.5 h-3.5 flex-shrink-0" />
          )}
          <span>{children}</span>
          {Icon && iconPosition === "right" && (
            <Icon className="w-3.5 h-3.5 flex-shrink-0" />
          )}
        </>
      )}
    </motion.button>
  );
}
