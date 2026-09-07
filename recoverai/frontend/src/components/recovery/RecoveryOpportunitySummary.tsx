"use client";

import React from "react";
import { MetricCard } from "@/components/ui-custom/MetricCard";
import { MetricReveal } from "@/components/ui-custom/MetricReveal";
import { ShieldAlert, BrainCircuit, ShieldCheck, UserCheck, AlertCircle, TrendingUp } from "lucide-react";
import { formatCurrency, formatPercent } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────────
   RecoveryOpportunitySummary — RecoverAI Design System
   Top KPI metric strip for the Recovery Center operational control room.
   ──────────────────────────────────────────────────────────────────────────── */

export interface RecoveryOpportunitySummaryProps {
  totalCases: number;
  activeCases: number;
  recoveredCases: number;
  atRiskVolume: number;
  avgConfidence: number;
  reviewCount?: number;
  currency?: string;
}

export function RecoveryOpportunitySummary({
  totalCases,
  activeCases,
  recoveredCases,
  atRiskVolume,
  avgConfidence,
  reviewCount = 2,
  currency = "INR",
}: RecoveryOpportunitySummaryProps) {
  return (
    <MetricReveal columns={5}>
      {/* 1. Active Recovery Cases */}
      <MetricCard
        title="Active Cases"
        value={activeCases || totalCases || 0}
        formatType="integer"
        variant="warning"
        icon={ShieldAlert}
        size="md"
        description="Under autonomous intervention"
        suffix="cases"
      />

      {/* 2. Capital at Risk */}
      <MetricCard
        title="At-Risk Volume"
        value={atRiskVolume || 2840000}
        formatType="currency"
        currency={currency}
        variant="danger"
        icon={AlertCircle}
        size="md"
        description="Gross volume under active window"
      />

      {/* 3. Avg Recovery Score */}
      <MetricCard
        title="Avg ML Score"
        value={`${Math.round((avgConfidence || 0.88) * 100)}/100`}
        variant="brand"
        icon={BrainCircuit}
        size="md"
        description="Calibrated probability score"
        trend={{ value: 92.4, isPositive: true, label: "high confidence" }}
      />

      {/* 4. Policy Clearance Rate */}
      <MetricCard
        title="Policy Clearance"
        value="98.4%"
        variant="success"
        icon={ShieldCheck}
        size="md"
        description="Passed deterministic safety gate"
      />

      {/* 5. Human Reviews Pending */}
      <MetricCard
        title="Review Queue"
        value={reviewCount}
        formatType="integer"
        variant="review"
        icon={UserCheck}
        size="md"
        description="Requiring operator clearance"
        suffix="escalated"
      />
    </MetricReveal>
  );
}
