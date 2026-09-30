"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Play, CheckCircle2, AlertTriangle, ShieldCheck,
  ArrowRight, RefreshCw, Zap, Clock, CreditCard, Sparkles
} from "lucide-react";
import Link from "next/link";

interface QuickDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type DemoStep = "IDLE" | "DECLINED" | "DIAGNOSING" | "GUARDRAIL" | "RETRYING" | "RECOVERED";

export function QuickDemoModal({ isOpen, onClose }: QuickDemoModalProps) {
  const [step, setStep] = useState<DemoStep>("IDLE");
  const [progress, setProgress] = useState(0);

  // Auto-advance through demo stages when started
  useEffect(() => {
    if (!isOpen) {
      setStep("IDLE");
      setProgress(0);
      return;
    }

    if (step === "IDLE") {
      setStep("DECLINED");
      setProgress(15);
    }
  }, [isOpen]);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (step === "DECLINED") {
      timer = setTimeout(() => {
        setStep("DIAGNOSING");
        setProgress(40);
      }, 1800);
    } else if (step === "DIAGNOSING") {
      timer = setTimeout(() => {
        setStep("GUARDRAIL");
        setProgress(70);
      }, 2000);
    } else if (step === "GUARDRAIL") {
      timer = setTimeout(() => {
        setStep("RETRYING");
        setProgress(90);
      }, 1800);
    } else if (step === "RETRYING") {
      timer = setTimeout(() => {
        setStep("RECOVERED");
        setProgress(100);
      }, 1800);
    }

    return () => clearTimeout(timer);
  }, [step]);

  const restartDemo = () => {
    setStep("DECLINED");
    setProgress(15);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-10"
        >
          {/* Header */}
          <div className="px-6 py-4 bg-[#0A2540] text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-300">
                <Zap className="w-4 h-4 fill-current text-sky-400" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  Interactive AI Recovery Demo
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    LIVE SIMULATION
                  </span>
                </h3>
                <p className="text-xs text-slate-300">
                  Watch PayRecover detect, diagnose, and rescue a failed customer payment in real time.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-100 h-1.5 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>

          {/* Body Content */}
          <div className="p-6 space-y-6">
            {/* Step Indicators */}
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                { label: "1. Decline", active: step !== "IDLE", done: ["DIAGNOSING", "GUARDRAIL", "RETRYING", "RECOVERED"].includes(step) },
                { label: "2. AI Diagnosis", active: ["DIAGNOSING", "GUARDRAIL", "RETRYING", "RECOVERED"].includes(step), done: ["GUARDRAIL", "RETRYING", "RECOVERED"].includes(step) },
                { label: "3. Safety Check", active: ["GUARDRAIL", "RETRYING", "RECOVERED"].includes(step), done: ["RETRYING", "RECOVERED"].includes(step) },
                { label: "4. Recovered", active: step === "RECOVERED", done: step === "RECOVERED" },
              ].map((s, idx) => (
                <div key={idx} className="flex flex-col items-center">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold mb-1 transition-all ${
                      s.done
                        ? "bg-emerald-500 text-white"
                        : s.active
                        ? "bg-blue-600 text-white ring-4 ring-blue-100"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {s.done ? "✓" : idx + 1}
                  </div>
                  <span className={`text-[11px] font-medium ${s.active ? "text-slate-900" : "text-slate-400"}`}>
                    {s.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Dynamic Stage Card */}
            <div className="min-h-[220px] rounded-xl border border-slate-200 bg-slate-50/70 p-5 flex flex-col justify-between">
              {step === "DECLINED" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-rose-600 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4" /> Step 1: Initial Payment Failed
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">Decline Code: 504_TIMEOUT</span>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-slate-900">Sarah Jenkins — Annual Enterprise Plan</div>
                      <div className="text-xs text-slate-500">Visa ending in •••• 4242 (Acquiring Bank Network Timeout)</div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-bold font-mono text-slate-900">$340.00</div>
                      <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                        Failed at Gateway
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    ⚠️ <strong>Without PayRecover:</strong> The checkout drops, the merchant loses $340, and the customer may abandon their subscription forever.
                  </p>
                </div>
              )}

              {step === "DIAGNOSING" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 animate-spin" /> Step 2: AI Evaluates Decline Telemetry
                    </span>
                    <span className="text-[11px] font-mono text-blue-600">Model Inference: 380ms</span>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-blue-200 shadow-sm space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">Decline Classification:</span>
                      <strong className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Soft Decline (Temporary Bank Hiccup)
                      </strong>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">Predicted Recovery Likelihood:</span>
                      <strong className="text-blue-700 font-bold font-mono text-sm">94.2% (High Confidence)</strong>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-blue-600 h-full rounded-full" style={{ width: "94.2%" }} />
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    🤖 <strong>AI Decision:</strong> The customer has sufficient funds. The failure was caused by the primary bank gateway dropping the connection. Recommend immediate smart reroute.
                  </p>
                </div>
              )}

              {step === "GUARDRAIL" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4" /> Step 3: Safety Guardrails & Compliance Check
                    </span>
                    <span className="text-[11px] font-mono text-indigo-600">Policy: Passed</span>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-indigo-200 shadow-sm space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span>Card verified active (Not reported lost or stolen)</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span>Retry count check: Attempt 1 of 3 (Within banking limits)</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span>Idempotency lock engaged (Guarantees zero double-charging)</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    🛡️ <strong>Safety Guarantee:</strong> PayRecover strictly blocks risky retries to protect customer trust and prevent merchant chargeback fines.
                  </p>
                </div>
              )}

              {step === "RETRYING" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 flex items-center gap-1.5">
                      <RefreshCw className="w-4 h-4 animate-spin" /> Step 4: Cascade Failover Execution
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">Route: Gateway B</span>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-amber-200 shadow-sm text-center space-y-2">
                    <div className="text-xs text-slate-500">Switching from primary degraded processor to backup banking rails...</div>
                    <div className="font-mono text-xs font-bold text-slate-800 bg-amber-50 py-1.5 px-3 rounded inline-block">
                      Rerouting via Secondary Payment Rails • Authorizing $340.00
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    ⚡ <strong>Automated Failover:</strong> Seamlessly retries payment across independent banking networks without asking the customer to re-enter their card.
                  </p>
                </div>
              )}

              {step === "RECOVERED" && (
                <div className="space-y-3 text-center py-1">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="text-base font-extrabold text-slate-900">
                      🎉 Payment Successfully Recovered!
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Transaction settled and deposited into merchant account in <strong>3.2 seconds</strong>.
                    </p>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 max-w-sm mx-auto flex items-center justify-between">
                    <span className="text-xs font-medium text-emerald-800">Net Revenue Recaptured:</span>
                    <strong className="text-sm font-bold font-mono text-emerald-900">+$340.00 USD</strong>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <div className="text-xs text-slate-500">
                {step === "RECOVERED" ? (
                  <span>✅ Complete end-to-end recovery simulation finished.</span>
                ) : (
                  <span>Processing autonomous recovery steps...</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {step === "RECOVERED" && (
                  <button
                    onClick={restartDemo}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Run Again</span>
                  </button>
                )}

                <Link
                  href="/simulator"
                  onClick={onClose}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#0A2540] hover:bg-[#0F2F57] shadow-sm transition-all"
                >
                  <span>Open Full Sandbox</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
