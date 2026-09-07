"use client";

import React from "react";
import { motion } from "framer-motion";
import { staggerContainer, blurRevealVariants } from "@/lib/motion";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────────
   MetricReveal — RecoverAI Design System
   Staggered animated container that orchestrates cinematic blur-in reveals
   for financial metric cards and KPI strips.
   ──────────────────────────────────────────────────────────────────────────── */

interface MetricRevealProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4 | 5 | 6;
  className?: string;
  delayChildren?: number;
  staggerDelay?: number;
}

const GRID_COLS_MAP = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  5: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-5",
  6: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6",
};

export function MetricReveal({
  children,
  columns = 5,
  className,
  delayChildren = 0.04,
  staggerDelay = 0.05,
}: MetricRevealProps) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren,
      },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn("grid gap-3.5 sm:gap-4", GRID_COLS_MAP[columns], className)}
    >
      {React.Children.map(children, (child, index) => {
        if (!React.isValidElement(child)) return child;
        return (
          <motion.div key={index} custom={index} variants={blurRevealVariants}>
            {child}
          </motion.div>
        );
      })}
    </motion.div>
  );
}
