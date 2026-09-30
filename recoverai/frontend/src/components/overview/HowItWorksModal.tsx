"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, HelpCircle, ShieldCheck, Zap, RefreshCw, AlertCircle,
  CreditCard, ChevronRight, Lock, TrendingUp, CheckCircle2
} from "lucide-react";
import Link from "next/link";

interface HowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenQuickDemo?: () => void;
}

export function HowItWorksModal({ isOpen, onClose, onOpenQuickDemo }: HowItWorksModalProps) {
  const [activeTab, setActiveTab] = useState<"pipeline" | "safety" | "faq">("pipeline");

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

        {/* Modal Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 16 }}
          transition={{ duration: 0.25 }}
          className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-10 flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="px-6 py-5 bg-[#0A2540] text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-sky-400">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">
                  How PayRecover Works (Quick Guide)
                </h3>
                <p className="text-xs text-slate-300">
                  Plain-English explanation of our AI revenue recovery platform
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

          {/* Sub Navigation Tabs */}
          <div className="flex border-b border-slate-200 bg-slate-50 px-6 shrink-0">
            {[
              { id: "pipeline", label: "1. The 4-Step Pipeline" },
              { id: "safety", label: "2. Safety & Zero Double-Charges" },
              { id: "faq", label: "3. Common Questions (FAQ)" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-[#0A2540] text-[#0A2540]"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Scrollable Content Body */}
          <div className="p-6 overflow-y-auto space-y-6">
            {activeTab === "pipeline" && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900 mb-1">
                    The Problem We Solve
                  </h4>
                  <p className="text-xs text-blue-800 leading-relaxed">
                    When a customer buys on your website, <strong>5% to 15% of transactions fail</strong> due to bank server timeouts, temporary card limits, or gateway glitches. PayRecover automatically rescues these transactions without bothering your customer.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2">
                  <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">1</div>
                      <span className="font-bold text-xs text-slate-900">Instant Detection</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Whenever a payment fails on Stripe, Razorpay, or your gateway, our webhook captures the exact bank failure code in under 50ms.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center">2</div>
                      <span className="font-bold text-xs text-slate-900">AI Diagnosis</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Our ML model predicts the recovery probability. If it’s a "Soft Decline" (network blip), recovery odds are 85%+. If stolen or closed, it halts.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center">3</div>
                      <span className="font-bold text-xs text-slate-900">Deterministic Safety Lock</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Strict financial rules ensure we never exceed 3 retries, never charge expired cards, and enforce zero double-billing via idempotency.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 font-bold text-xs flex items-center justify-center">4</div>
                      <span className="font-bold text-xs text-slate-900">Smart Gateway Cascade</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      The transaction is retried through an optimal secondary banking rail. Once approved, the funds are deposited directly into your account.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "safety" && (
              <div className="space-y-4">
                <div className="border border-emerald-200 bg-emerald-50/60 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs uppercase tracking-wider mb-1">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" /> Banking-Grade Safety Rules
                  </div>
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    Automated retries can be risky if done carelessly. PayRecover uses financial-grade safety protocols that banks and payment processors require.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1">
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      Zero Double-Charging (Idempotency Guarantee)
                    </div>
                    <p className="text-xs text-slate-600">
                      Every retry carries a cryptographically unique idempotency key. Even if a network packet arrives twice, your customer will <strong>only ever be charged once</strong>.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1">
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      Anti-Fraud & Stolen Card Exclusions
                    </div>
                    <p className="text-xs text-slate-600">
                      If a bank reports a card as <code>stolen_card</code>, <code>lost_card</code>, or <code>suspected_fraud</code>, our safety engine immediately blocks all automated retries.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1">
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      Human Review Escalation
                    </div>
                    <p className="text-xs text-slate-600">
                      High-value transactions (over $1,000) or transactions with ambiguous bank codes are automatically routed to your team's <strong>Review Queue</strong> for manual sign-off.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "faq" && (
              <div className="space-y-3">
                {[
                  {
                    q: "Do I need to replace my existing payment gateway (Stripe/Razorpay)?",
                    a: "No! PayRecover sits on top of your existing payment setup. It listens to failure webhooks and orchestrates smart retries without changing your checkout code."
                  },
                  {
                    q: "How much extra revenue can my business recover?",
                    a: "Most online businesses lose 8%–12% of gross revenue to preventable payment declines. PayRecover typically recovers 15% to 35% of those failed payments within 24 hours."
                  },
                  {
                    q: "Does the customer need to re-enter their card information?",
                    a: "No. For soft declines and gateway timeouts, the retry uses tokenized payment credentials already stored securely in PCI-compliant vaults."
                  },
                  {
                    q: "How can I verify every action the system takes?",
                    a: "Go to the 'Audit Trail' tab in the top menu. Every single automated decision, timestamp, reason, and bank reference is logged in an immutable, tamper-proof ledger."
                  }
                ].map((item, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl border border-slate-200 bg-white">
                    <h5 className="text-xs font-bold text-slate-900 mb-1 flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-700 text-[10px] flex items-center justify-center font-bold">Q</span>
                      {item.q}
                    </h5>
                    <p className="text-xs text-slate-600 pl-6 leading-relaxed">
                      {item.a}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
            <button
              onClick={() => {
                onClose();
                if (onOpenQuickDemo) onOpenQuickDemo();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-700 hover:text-blue-800 transition-colors"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Watch 1-Click Interactive Demo</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#0A2540] hover:bg-[#0F2F57] transition-all"
            >
              Got it, close guide
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
