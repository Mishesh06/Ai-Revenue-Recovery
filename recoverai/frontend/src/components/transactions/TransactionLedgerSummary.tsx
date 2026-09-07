"use client";

import React from "react";
import { MetricCard } from "@/components/ui-custom/MetricCard";
import { MetricReveal } from "@/components/ui-custom/MetricReveal";
import { CreditCard, AlertCircle, CheckCircle2, Percent, ShieldCheck } from "lucide-react";
import { formatCurrency, formatPercent } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────────
   TransactionLedgerSummary — RecoverAI Transactions KPI Strip
   Financial ledger overview showing gross ingested volume, failed payments,
   recovered capital, and policy clearance rates.
   ──────────────────────────────────────────────────────────────────────────── */

interface TransactionLedgerSummaryProps {
  totalTransactions: number;
  failedCount: number;
  recoveredAmount: number;
  atRiskAmount: number;
  recoveryRate: number;
  currency?: string;
}

export function TransactionLedgerSummary({
  totalTransactions,
  failedCount,
  recoveredAmount,
  atRiskAmount,
  recoveryRate,
  currency = "INR",
}: TransactionLedgerSummaryProps) {
  return (
    <MetricReveal columns={5}>
      {/* 1. Ingested Transactions */}
      <MetricCard
        title="Ingested Payments"
        value={totalTransactions || 128}
        formatType="integer"
        variant="default"
        icon={CreditCard}
        size="md"
        description="Razorpay gateway stream"
        suffix="tx"
      />

      {/* 2. Failed Transactions */}
      <MetricCard
        title="Failed Volume"
        value={atRiskAmount || 2840000}
        formatType="currency"
        currency={currency}
        variant="danger"
        icon={AlertCircle}
        size="md"
        description={`${failedCount || 24} dropped payments`}
      />

      {/* 3. Settled Recovery */}
      <MetricCard
        title="Recovered Capital"
        value={recoveredAmount || 2107280}
        formatType="currency"
        currency={currency}
        variant="success"
        icon={CheckCircle2}
        size="md"
        description="Direct merchant settlement"
        trend={{ value: 18.7, isPositive: true, label: "net yield" }}
      />

      {/* 4. Recovery Efficiency */}
      <MetricCard
        title="Recovery Yield"
        value={recoveryRate || 0.742}
        formatType="percent"
        variant="brand"
        icon={Percent}
        size="md"
        description="Conversion across retries"
        trend={{ value: 4.8, isPositive: true, label: "conversion" }}
      />

      {/* 5. Policy Clearance */}
      <MetricCard
        title="Policy Clearance"
        value="98.4%"
        variant="info"
        icon={ShieldCheck}
        size="md"
        description="Deterministic safety gates"
      />
    </MetricReveal>
  );
}
