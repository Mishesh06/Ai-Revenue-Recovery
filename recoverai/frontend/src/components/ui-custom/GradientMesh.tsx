"use client";

import React from "react";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────────
   GradientMesh — PayRecover Design System
   Cinematic ambient background mesh with subtle atmospheric gradients.
   Maintains deep neutral sophistication without random or childish colors.
   ──────────────────────────────────────────────────────────────────────────── */

export interface GradientMeshProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "subtle" | "brand" | "dark" | "hero";
  intensity?: "low" | "medium" | "high";
  children?: React.ReactNode;
  className?: string;
}

export function GradientMesh({
  variant = "subtle",
  intensity = "low",
  children,
  className,
  ...props
}: GradientMeshProps) {
  const isDark = variant === "dark";

  return (
    <div
      className={cn(
        "relative overflow-hidden",
        isDark ? "bg-[var(--neutral-charcoal-dark)] text-white" : "bg-[var(--bg-canvas)]",
        className
      )}
      {...props}
    >
      {/* Background Ambient Orbs (Non-distracting, calibrated) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        {variant === "subtle" && (
          <>
            <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[var(--brand-primary)]/5 blur-[120px]" />
            <div className="absolute top-1/2 -right-32 w-96 h-96 rounded-full bg-[var(--status-info)]/4 blur-[140px]" />
          </>
        )}

        {variant === "brand" && (
          <>
            <div className="absolute -top-24 left-1/4 w-[500px] h-72 rounded-full bg-[var(--brand-primary)]/8 blur-[100px]" />
            <div className="absolute bottom-0 right-1/4 w-80 h-64 rounded-full bg-[var(--status-info)]/6 blur-[120px]" />
          </>
        )}

        {variant === "hero" && (
          <>
            <div className="absolute -top-40 -left-20 w-[600px] h-[400px] rounded-full bg-[var(--brand-primary)]/10 blur-[130px]" />
            <div className="absolute top-1/3 -right-20 w-[500px] h-[350px] rounded-full bg-[var(--status-success)]/5 blur-[140px]" />
            <div className="absolute -bottom-20 left-1/3 w-[450px] h-[300px] rounded-full bg-[var(--brand-primary-light)]/6 blur-[120px]" />
          </>
        )}

        {variant === "dark" && (
          <>
            <div className="absolute -top-32 left-1/3 w-[600px] h-[400px] rounded-full bg-[var(--brand-primary)]/12 blur-[140px]" />
            <div className="absolute bottom-0 right-10 w-96 h-72 rounded-full bg-[var(--status-review)]/8 blur-[120px]" />
          </>
        )}
      </div>

      {/* Content wrapper */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
