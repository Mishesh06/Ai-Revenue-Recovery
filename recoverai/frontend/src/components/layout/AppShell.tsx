"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { TopNav } from "./TopNav";
import { CommandPalette } from "./CommandPalette";
import { motion, AnimatePresence } from "framer-motion";
import { pageVariants } from "@/lib/motion";

/* ─────────────────────────────────────────────────────────────────────────────
   AppShell — RecoverAI Global Operating System Shell
   Horizontal-nav layout with sticky TopNav, full-height scrollable viewport,
   ambient lighting mesh, and fluid page transitions.
   ──────────────────────────────────────────────────────────────────────────── */

export function AppShell({ children }: { children: React.ReactNode }) {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const pathname = usePathname();

  // Global ⌘K and / shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
      if (
        e.key === "/" &&
        !isCommandPaletteOpen &&
        !(
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement ||
          (e.target as HTMLElement)?.isContentEditable
        )
      ) {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCommandPaletteOpen]);

  return (
    <div
      className="flex flex-col min-h-screen overflow-x-clip antialiased select-auto relative"
      style={{ background: "var(--bg-canvas)", color: "var(--fg-primary)" }}
    >
      {/* Subtle atmospheric ambient mesh — restrained on dark bg */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
        <div className="absolute -top-40 left-1/3 w-[800px] h-[400px] rounded-full bg-[var(--brand-primary)]/[0.04] blur-[160px]" />
        <div className="absolute top-2/3 -right-32 w-[600px] h-[500px] rounded-full bg-[var(--status-info)]/[0.03] blur-[180px]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[400px] rounded-full bg-[var(--status-success)]/[0.025] blur-[180px]" />
      </div>

      {/* Horizontal Top Navigation */}
      <TopNav onOpenCommandPalette={() => setIsCommandPaletteOpen(true)} />

      {/* Scrollable Viewport */}
      <main className="flex-1 relative z-10">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={pathname}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Global ⌘K Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onToggleSidebar={() => {}}
      />
    </div>
  );
}
