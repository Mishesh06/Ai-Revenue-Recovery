"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { TopNav } from "./TopNav";
import { CommandPalette } from "./CommandPalette";
import { motion, AnimatePresence } from "framer-motion";
import { pageVariants } from "@/lib/motion";

/* ─────────────────────────────────────────────────────────────────────────────
   AppShell — PayRecover Global Layout Shell
   Light-mode layout with sticky TopNav, dot-grid ambient bg, and fluid
   page transitions via framer-motion.
   ──────────────────────────────────────────────────────────────────────────── */

export function AppShell({ children }: { children: React.ReactNode }) {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  // Global ⌘K and / shortcut
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
      className="flex flex-col min-h-screen overflow-x-clip antialiased select-auto relative dot-grid-bg"
    >
      {/* Subtle ambient gradient overlays on dot grid */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
        <div className="absolute -top-24 left-1/4 w-[500px] h-[320px] rounded-full blur-[100px]"
          style={{ background: "radial-gradient(circle, rgba(37,99,235,0.06) 0%, transparent 70%)" }} />
        <div className="absolute top-1/2 right-0 w-[350px] h-[350px] rounded-full blur-[80px]"
          style={{ background: "radial-gradient(circle, rgba(10,37,64,0.05) 0%, transparent 70%)" }} />
      </div>

      {/* Horizontal Top Navigation — hidden on /login */}
      {!isLoginPage && <TopNav onOpenCommandPalette={() => setIsCommandPaletteOpen(true)} />}

      {/* Scrollable Viewport */}
      <main className="flex-1 relative z-10">
        {isLoginPage ? (
          /* Login page renders full-screen with no padding */
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={pathname} variants={pageVariants} initial="initial" animate="animate" exit="exit">
              {children}
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={pathname} variants={pageVariants} initial="initial" animate="animate" exit="exit">
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        )}
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
