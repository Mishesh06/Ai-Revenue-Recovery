"use client";

import React from "react";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────────
   GlowContainer — PayRecover Design System
   Wraps high-importance operational elements with a calibrated status glow or focus ring.
   ──────────────────────────────────────────────────────────────────────────── */

export type GlowType = "brand" | "success" | "warning" | "danger" | "review" | "info" | "none";

export interface GlowContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  glow?: GlowType;
  intensity?: "subtle" | "active" | "pulse";
  bordered?: boolean;
  children: React.ReactNode;
  className?: string;
}

const GLOW_MAP: Record<GlowType, { shadow: string; border: string }> = {
  none: { shadow: "", border: "" },
  brand: {
    shadow: "shadow-[var(--glow-brand)]",
    border: "border-[var(--brand-primary)]/40",
  },
  success: {
    shadow: "shadow-[var(--glow-success)]",
    border: "border-[var(--status-success)]/40",
  },
  warning: {
    shadow: "shadow-[var(--glow-warning)]",
    border: "border-[var(--status-warning)]/40",
  },
  danger: {
    shadow: "shadow-[var(--glow-danger)]",
    border: "border-[var(--status-danger)]/40",
  },
  review: {
    shadow: "shadow-[var(--glow-review)]",
    border: "border-[var(--status-review)]/40",
  },
  info: {
    shadow: "shadow-[0_0_0_1px_rgba(59,130,246,0.2),0_4px_20px_rgba(59,130,246,0.15)]",
    border: "border-[var(--status-info)]/40",
  },
};

export function GlowContainer({
  glow = "brand",
  intensity = "subtle",
  bordered = true,
  children,
  className,
  ...props
}: GlowContainerProps) {
  const config = GLOW_MAP[glow];

  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] transition-all duration-[var(--duration-base)]",
        bordered && "border",
        config.shadow,
        bordered && config.border,
        intensity === "pulse" && "animate-pulse",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
