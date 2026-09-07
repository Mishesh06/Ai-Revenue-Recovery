"use client";

import React from "react";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────────
   GlassPanel — RecoverAI Design System
   Sophisticated frosted glass panel with border sheen and calibrated backdrop blur.
   ──────────────────────────────────────────────────────────────────────────── */

export interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "light" | "dark" | "surface";
  blur?: "sm" | "md" | "lg";
  sheen?: boolean;
  children: React.ReactNode;
  className?: string;
}

const BLUR_MAP = {
  sm: "backdrop-blur-xs",
  md: "backdrop-blur-md",
  lg: "backdrop-blur-xl",
};

export function GlassPanel({
  variant = "light",
  blur = "md",
  sheen = true,
  children,
  className,
  ...props
}: GlassPanelProps) {
  const isDark = variant === "dark";

  return (
    <div
      className={cn(
        "relative rounded-[var(--radius-lg)] overflow-hidden transition-all duration-[var(--duration-base)]",
        BLUR_MAP[blur],
        isDark
          ? "bg-[var(--neutral-charcoal)]/80 border border-white/10 text-white shadow-2xl"
          : "bg-white/75 border border-white/70 shadow-[var(--shadow-glass)]",
        className
      )}
      {...props}
    >
      {/* Top Sheen Line */}
      {sheen && (
        <div
          className={cn(
            "absolute inset-x-0 top-0 h-px pointer-events-none",
            isDark
              ? "bg-gradient-to-r from-transparent via-white/20 to-transparent"
              : "bg-gradient-to-r from-transparent via-white/80 to-transparent"
          )}
        />
      )}

      {children}
    </div>
  );
}
