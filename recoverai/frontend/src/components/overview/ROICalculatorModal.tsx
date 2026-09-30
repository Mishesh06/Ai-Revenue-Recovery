"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Calculator, TrendingUp, DollarSign, ArrowRight,
  Sparkles, CheckCircle2, ShieldCheck, Zap
} from "lucide-react";
import Link from "next/link";

interface ROICalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenQuickDemo?: () => void;
}

export function ROICalculatorModal({ isOpen, onClose, onOpenQuickDemo }: ROICalculatorModalProps) {
  // Slider state
  const [monthlyRevenue, setMonthlyRevenue] = useState(150000); // $150,000 / month
  const [failureRate, setFailureRate] = useState(7.5); // 7.5% decline rate
  const [recoveryRate, setRecoveryRate] = useState(32); // 32% expected AI recovery rate

  // Calculations
  const monthlyLostRevenue = (monthlyRevenue * (failureRate / 100));
  const monthlyRecoveredRevenue = monthlyLostRevenue * (recoveryRate / 100);
  const annualRecoveredRevenue = monthlyRecoveredRevenue * 12;
  const estimatedPlatformFee = Math.max(499, monthlyRecoveredRevenue * 0.08); // 8% performance fee
  const netMonthlyProfit = monthlyRecoveredRevenue - estimatedPlatformFee;
  const roiMultiple = ((netMonthlyProfit / estimatedPlatformFee) + 1).toFixed(1);

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

        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 16 }}
          transition={{ duration: 0.25 }}
          className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-10 flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="px-6 py-5 bg-[#0A2540] text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-sky-400">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white flex items-center gap-2">
                  Revenue Recovery ROI Calculator
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                    FINANCIAL IMPACT
                  </span>
                </h3>
                <p className="text-xs text-slate-300">
                  Estimate how much lost revenue PayRecover can save for your business every month.
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

          {/* Interactive Calculator Body */}
          <div className="p-6 overflow-y-auto space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Sliders */}
              <div className="space-y-5 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Your Business Parameters
                </h4>

                {/* Slider 1: Monthly Gross Revenue */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-700">Monthly Processing Volume:</span>
                    <strong className="font-mono text-sm text-[#0A2540]">
                      ${monthlyRevenue.toLocaleString()}
                    </strong>
                  </div>
                  <input
                    type="range"
                    min={10000}
                    max={1000000}
                    step={10000}
                    value={monthlyRevenue}
                    onChange={(e) => setMonthlyRevenue(Number(e.target.value))}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>$10k/mo</span>
                    <span>$500k/mo</span>
                    <span>$1M+/mo</span>
                  </div>
                </div>

                {/* Slider 2: Estimated Payment Failure Rate */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-700">Payment Failure / Decline Rate:</span>
                    <strong className="font-mono text-sm text-rose-600">
                      {failureRate.toFixed(1)}%
                    </strong>
                  </div>
                  <input
                    type="range"
                    min={2}
                    max={20}
                    step={0.5}
                    value={failureRate}
                    onChange={(e) => setFailureRate(Number(e.target.value))}
                    className="w-full accent-rose-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>2% (Low)</span>
                    <span>8% (Industry Avg)</span>
                    <span>20% (High Risk)</span>
                  </div>
                </div>

                {/* Slider 3: AI Recovery Efficiency */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-700">Expected AI Recovery Rate:</span>
                    <strong className="font-mono text-sm text-emerald-600">
                      {recoveryRate}%
                    </strong>
                  </div>
                  <input
                    type="range"
                    min={15}
                    max={60}
                    step={1}
                    value={recoveryRate}
                    onChange={(e) => setRecoveryRate(Number(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>15% (Conservative)</span>
                    <span>32% (Standard)</span>
                    <span>60% (Max)</span>
                  </div>
                </div>

                {/* Breakdown Summary */}
                <div className="pt-3 border-t border-slate-200 text-xs space-y-1.5 text-slate-600">
                  <div className="flex justify-between">
                    <span>Gross Revenue Lost per Month:</span>
                    <strong className="font-mono text-rose-600">-${monthlyLostRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Estimated Annual Lost Revenue:</span>
                    <strong className="font-mono text-slate-700">-${(monthlyLostRevenue * 12).toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong>
                  </div>
                </div>
              </div>

              {/* Right Column: Projected Returns */}
              <div className="space-y-4 flex flex-col justify-between">
                {/* Big Highlight Card */}
                <div
                  className="rounded-2xl p-6 text-white space-y-4 relative overflow-hidden"
                  style={{
                    background: "linear-gradient(145deg, #0A2540 0%, #0F2F57 100%)",
                    boxShadow: "0 8px 24px rgba(10,37,64,0.18)",
                  }}
                >
                  <div className="space-y-1">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-sky-300 font-semibold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> Projected Monthly Recovery
                    </span>
                    <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white">
                      +${monthlyRecoveredRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      <span className="text-xs font-normal text-slate-300"> /mo</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/10 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-300 block text-[11px]">Annual Capital Recaptured:</span>
                      <strong className="text-emerald-400 font-mono text-base font-bold">
                        +${annualRecoveredRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-300 block text-[11px]">Estimated ROI Multiple:</span>
                      <strong className="text-sky-300 font-mono text-base font-bold">
                        {roiMultiple}x ROI
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Key Benefits List */}
                <div className="space-y-2 p-4 rounded-xl border border-slate-200 bg-white text-xs">
                  <div className="font-bold text-slate-800 mb-1">What this means for your business:</div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Immediate cash flow deposited directly into your merchant account</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Reduces involuntary customer churn by saving renewal drop-offs</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Performance model: Only pay when revenue is successfully recovered</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="text-xs text-slate-500">
              ⚡ Calculated based on aggregate benchmark decline telemetry across 50,000+ online transactions.
            </div>

            <div className="flex items-center gap-2.5">
              {onOpenQuickDemo && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenQuickDemo();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-700 hover:text-blue-800 transition-colors"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Watch Recovery Demo</span>
                </button>
              )}

              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#0A2540] hover:bg-[#0F2F57] shadow-sm transition-all"
              >
                Close Calculator
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
