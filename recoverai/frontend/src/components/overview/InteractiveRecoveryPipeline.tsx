"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, BrainCircuit, ShieldCheck, CheckCircle2, Play,
  Sparkles, ArrowRight, Server, RefreshCw
} from "lucide-react";
import { useToast } from "@/context/ToastContext";

interface PipelineStep {
  id: string;
  name: string;
  stage: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  color: string;
}

const PIPELINE_STEPS: PipelineStep[] = [
  {
    id: "ingest",
    name: "Intercept & Ingest",
    stage: "STAGE 1",
    icon: Server,
    description: "Webhook captures payment failure in <35ms; locks idempotency key.",
    color: "#3b82f6", // blue
  },
  {
    id: "diagnosis",
    name: "AI Root-Cause Diagnosis",
    stage: "STAGE 2",
    icon: BrainCircuit,
    description: "ML model classifies decline code & predicts 89.4% recovery rate.",
    color: "#6366f1", // indigo
  },
  {
    id: "policy",
    name: "Safety & Policy Gate",
    stage: "STAGE 3",
    icon: ShieldCheck,
    description: "Enforces max retries, merchant limits, and fraud safety checks.",
    color: "#f59e0b", // amber
  },
  {
    id: "execute",
    name: "Autonomous Action",
    stage: "STAGE 4",
    icon: Zap,
    description: "Executes smart gateway failover and optimal timing retry.",
    color: "#8b5cf6", // purple
  },
  {
    id: "recovered",
    name: "Revenue Settled",
    stage: "STAGE 5",
    icon: CheckCircle2,
    description: "Payment captured successfully; immutable audit proof recorded.",
    color: "#10b981", // emerald
  },
];

export function InteractiveRecoveryPipeline({
  onSimulateRecovery,
}: {
  onSimulateRecovery?: () => void;
}) {
  const { toast } = useToast();
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulatedTxn, setSimulatedTxn] = useState<{
    id: string;
    amount: number;
    recovered: boolean;
  } | null>(null);

  const runLiveSimulation = async () => {
    if (isSimulating) return;
    setIsSimulating(true);
    setSimulatedTxn({
      id: "txn_" + Math.random().toString(36).substring(2, 8).toUpperCase(),
      amount: Math.floor(Math.random() * 4500) + 1200,
      recovered: false,
    });

    for (let i = 0; i < PIPELINE_STEPS.length; i++) {
      setActiveStep(i);
      await new Promise((r) => setTimeout(r, 650));
    }

    setSimulatedTxn((prev) => (prev ? { ...prev, recovered: true } : null));
    setIsSimulating(false);

    toast.success("Autonomous Recovery Simulated!", "Successfully recovered ₹2,850 via AI Gateway Failover.");

    if (onSimulateRecovery) onSimulateRecovery();

    setTimeout(() => {
      setActiveStep(null);
    }, 3500);
  };

  return (
    <div className="relative rounded-2xl border border-slate-200/80 bg-white/90 backdrop-blur-md p-6 shadow-sm overflow-hidden">
      {/* Background soft ambient gradient */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-50/60 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-indigo-600">
              Real-Time Autonomous Pipeline
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            How PayRecover Protects Every Transaction
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            End-to-end autonomous healing with zero manual effort and cryptographic audit logs.
          </p>
        </div>

        <button
          onClick={runLiveSimulation}
          disabled={isSimulating}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-sky-500 hover:from-indigo-700 hover:to-sky-600 text-white font-semibold text-xs shadow-md shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 shrink-0"
        >
          {isSimulating ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Executing AI Flow…</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Simulate Live Recovery</span>
            </>
          )}
        </button>
      </div>

      {/* Live Simulation Ticker Banner if active */}
      <AnimatePresence>
        {simulatedTxn && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-5 p-3 rounded-xl bg-indigo-50/90 border border-indigo-200/80 flex items-center justify-between text-xs font-mono"
          >
            <div className="flex items-center gap-2 text-indigo-900">
              <Sparkles className="w-4 h-4 text-indigo-600 animate-bounce" />
              <span>
                Simulating Transaction <strong className="text-indigo-950">{simulatedTxn.id}</strong> (₹{simulatedTxn.amount.toLocaleString()})
              </span>
            </div>
            <div>
              {simulatedTxn.recovered ? (
                <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" /> RECOVERED & SETTLED
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-indigo-700">
                  <RefreshCw className="w-3 h-3 animate-spin" /> Step {(activeStep ?? 0) + 1} of 5
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5-Step Pipeline Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 relative z-10">
        {PIPELINE_STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isCurrent = activeStep === idx;
          const isPassed = activeStep !== null && activeStep > idx;

          return (
            <motion.div
              key={step.id}
              animate={{
                scale: isCurrent ? 1.03 : 1,
                borderColor: isCurrent ? step.color : isPassed ? "#10b981" : "#e2e8f0",
              }}
              transition={{ duration: 0.25 }}
              className={`relative rounded-xl p-3.5 border transition-all flex flex-col justify-between ${
                isCurrent
                  ? "bg-slate-900 text-white shadow-lg shadow-indigo-500/10"
                  : isPassed
                  ? "bg-emerald-50/40 text-slate-800"
                  : "bg-slate-50/60 text-slate-800 hover:bg-slate-50"
              }`}
            >
              {/* Connector line between steps on desktop */}
              {idx < PIPELINE_STEPS.length - 1 && (
                <div className="hidden md:block absolute -right-2 top-1/2 -translate-y-1/2 z-20 pointer-events-none">
                  <ArrowRight
                    className={`w-3.5 h-3.5 ${
                      isPassed || isCurrent ? "text-indigo-600" : "text-slate-300"
                    }`}
                  />
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      background: isCurrent ? `${step.color}33` : `${step.color}15`,
                      border: `1px solid ${step.color}40`,
                    }}
                  >
                    <span style={{ color: step.color }}><Icon className="w-3.5 h-3.5" /></span>
                  </div>
                  <span
                    className={`text-[9px] font-mono font-bold tracking-wider px-1.5 py-0.5 rounded ${
                      isCurrent
                        ? "bg-white/10 text-indigo-300"
                        : "bg-slate-200/60 text-slate-500"
                    }`}
                  >
                    {step.stage}
                  </span>
                </div>

                <div className={`text-xs font-bold mb-1 ${isCurrent ? "text-white" : "text-slate-900"}`}>
                  {step.name}
                </div>
                <p className={`text-[11px] leading-relaxed ${isCurrent ? "text-slate-300" : "text-slate-500"}`}>
                  {step.description}
                </p>
              </div>

              {/* Status pill at bottom */}
              <div className="mt-3 pt-2 border-t border-slate-200/40 flex items-center justify-between text-[10px] font-mono">
                {isPassed ? (
                  <span className="text-emerald-600 flex items-center gap-1 font-semibold">
                    <CheckCircle2 className="w-3 h-3" /> Complete
                  </span>
                ) : isCurrent ? (
                  <span className="text-indigo-400 flex items-center gap-1 font-semibold animate-pulse">
                    <Zap className="w-3 h-3" /> Active Processing
                  </span>
                ) : (
                  <span className="text-slate-400">Autonomous</span>
                )}
                <span className="text-slate-400">P99 &lt;450ms</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
