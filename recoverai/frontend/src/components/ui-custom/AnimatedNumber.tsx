"use client";

import React, { useEffect, useState, useRef } from "react";
import { useSpring } from "framer-motion";
import { formatCurrency, formatCurrencyCompact, formatPercent, cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────────
   AnimatedNumber — RecoverAI High-Precision Tabular Number Transitions
   Zero layout shift. Performs crisp, calibrated number transitions with spring physics.
   ──────────────────────────────────────────────────────────────────────────── */

export interface AnimatedNumberProps {
  value: number;
  formatType?: "currency" | "compactCurrency" | "percent" | "number" | "integer";
  currency?: string;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export function AnimatedNumber({
  value,
  formatType = "number",
  currency = "INR",
  decimals = 0,
  prefix,
  suffix,
  className,
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValue = useRef(value);

  const spring = useSpring(value, {
    stiffness: 300,
    damping: 28,
    mass: 0.7,
  });

  useEffect(() => {
    spring.set(value);
    prevValue.current = value;
  }, [value, spring]);

  useEffect(() => {
    return spring.on("change", (latest) => {
      setDisplayValue(latest);
    });
  }, [spring]);

  let formatted = "";
  if (formatType === "currency") {
    formatted = formatCurrency(Math.round(displayValue), currency);
  } else if (formatType === "compactCurrency") {
    formatted = formatCurrencyCompact(displayValue, currency);
  } else if (formatType === "percent") {
    formatted = formatPercent(displayValue, decimals || 1);
  } else if (formatType === "integer") {
    formatted = Math.round(displayValue).toLocaleString();
  } else {
    formatted = displayValue.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }

  return (
    <span className={cn("tabular-nums inline-block font-mono", className)}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
