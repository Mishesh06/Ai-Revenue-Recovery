"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { pageVariants, usePrefersReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────────
   PageTransition — RecoverAI Design System
   Fluid page transition container with calibrated blur reveal and upward settle.
   Respects user prefers-reduced-motion preferences.
   ──────────────────────────────────────────────────────────────────────────── */

export interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export function PageTransition({ children, className }: PageTransitionProps) {
  const prefersReduced = usePrefersReducedMotion();

  if (prefersReduced) {
    return <div className={cn("w-full", className)}>{children}</div>;
  }

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={cn("w-full", className)}
    >
      {children}
    </motion.div>
  );
}
