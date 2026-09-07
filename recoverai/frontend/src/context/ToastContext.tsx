"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────────
   Toast & Notification System — RecoverAI Design System
   Lightweight, accessible toast notifications with crisp Framer Motion entrance.
   ──────────────────────────────────────────────────────────────────────────── */

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
  toast: {
    success: (title: string, description?: string) => void;
    error: (title: string, description?: string) => void;
    info: (title: string, description?: string) => void;
    warning: (title: string, description?: string) => void;
  };
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({ type, title, description, duration = 4000 }: Omit<Toast, "id">) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: Toast = { id, type, title, description, duration };
      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const toast = {
    success: (title: string, description?: string) =>
      addToast({ type: "success", title, description }),
    error: (title: string, description?: string) =>
      addToast({ type: "error", title, description }),
    info: (title: string, description?: string) =>
      addToast({ type: "info", title, description }),
    warning: (title: string, description?: string) =>
      addToast({ type: "warning", title, description }),
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, toast }}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <ToastItem key={t.id} toast={t} onClose={() => removeToast(t.id)} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const icons = {
    success: <CheckCircle2 className="w-4 h-4 text-[var(--status-success)] flex-shrink-0 mt-0.5" />,
    error: <AlertCircle className="w-4 h-4 text-[var(--status-danger)] flex-shrink-0 mt-0.5" />,
    warning: <AlertTriangle className="w-4 h-4 text-[var(--status-warning)] flex-shrink-0 mt-0.5" />,
    info: <Info className="w-4 h-4 text-[var(--brand-primary)] flex-shrink-0 mt-0.5" />,
  };

  const borders = {
    success: "border-[var(--status-success-border)]",
    error: "border-[var(--status-danger-border)]",
    warning: "border-[var(--status-warning-border)]",
    info: "border-[var(--brand-primary-ring)]",
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
      transition={{ type: "spring", stiffness: 450, damping: 30 }}
      className={cn(
        "pointer-events-auto flex items-start gap-3 p-3.5 rounded-[var(--radius-lg)]",
        "border bg-[var(--bg-surface)] shadow-[var(--shadow-lg)]",
        borders[toast.type]
      )}
    >
      {icons[toast.type]}
      <div className="flex-1 min-w-0">
        <h5 className="text-xs font-semibold text-[var(--fg-primary)] leading-snug">
          {toast.title}
        </h5>
        {toast.description && (
          <p className="text-[11px] text-[var(--fg-secondary)] mt-0.5 leading-relaxed">
            {toast.description}
          </p>
        )}
      </div>
      <button
        onClick={onClose}
        className="text-[var(--fg-tertiary)] hover:text-[var(--fg-primary)] p-0.5 rounded-[var(--radius-xs)] transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
