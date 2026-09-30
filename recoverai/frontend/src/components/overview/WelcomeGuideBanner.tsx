"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Zap, Play, HelpCircle, X, ChevronRight,
  ShieldCheck, CheckCircle2, ArrowRight
} from "lucide-react";
import Link from "next/link";

interface WelcomeGuideBannerProps {
  onOpenQuickDemo: () => void;
  onOpenHowItWorks: () => void;
}

export function WelcomeGuideBanner({ onOpenQuickDemo, onOpenHowItWorks }: WelcomeGuideBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const isDismissed = localStorage.getItem("payrecover_guide_dismissed") === "true";
    setDismissed(isDismissed);
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("payrecover_guide_dismissed", "true");
  };

  const handleRestore = () => {
    setDismissed(false);
    localStorage.removeItem("payrecover_guide_dismissed");
  };

  if (!mounted) return null;

  if (dismissed) {
    return (
      <div className="flex justify-end">
        <button
          onClick={handleRestore}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm transition-colors"
        >
          <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
          <span>Show New User Guide</span>
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3 }}
      className="relative rounded-2xl bg-gradient-to-r from-blue-50/90 via-slate-50 to-indigo-50/70 border border-blue-200/80 p-5 shadow-sm overflow-hidden"
    >
      {/* Decorative accent */}
      <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-blue-100/50 to-transparent pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Introduction */}
        <div className="space-y-1 max-w-xl">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-blue-800">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Welcome to PayRecover • Quick Start Guide</span>
          </div>
          <h3 className="text-base font-extrabold text-slate-900">
            Recover lost revenue automatically in 3 simple steps
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            When customer credit cards decline or bank servers timeout, our AI automatically intercepts and recovers the lost funds without losing the customer.
          </p>
        </div>

        {/* Right: Quick Action Cards */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onOpenQuickDemo}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all"
          >
            <Zap className="w-3.5 h-3.5 fill-current text-sky-200" />
            <span>1-Click Test Demo</span>
          </button>

          <Link
            href="/simulator"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-sm transition-colors"
          >
            <Play className="w-3.5 h-3.5 text-slate-700" />
            <span>Open AI Simulator</span>
          </Link>

          <button
            onClick={onOpenHowItWorks}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>How it works</span>
          </button>

          <button
            onClick={handleDismiss}
            title="Dismiss guide"
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 flex items-center justify-center transition-colors ml-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
