"use client";

import { useState, useEffect } from "react";
import { Variants, Transition } from "framer-motion";

/* ─────────────────────────────────────────────────────────────────────────────
   PayRecover Centralized Motion System
   Visual language: PRECISE · CALM · INTELLIGENT · CINEMATIC · TRUSTWORTHY
   
   Scale:
   - INSTANT:  50ms       (Immediate tactile feedback, micro-toggles)
   - FAST:     100–140ms  (Hovers, buttons, chips, active pills, indicators)
   - NORMAL:   180–240ms  (Cards entering, table rows, drawers, tabs, dropdowns)
   - EMPHASIS: 300–450ms  (Modals, pipeline transitions, policy approvals, celebrations)
   
   Rules:
   - Animations communicate state, hierarchy, and AI processing certainty.
   - Zero layout shifts. Zero gratuitous decoration.
   - Full prefers-reduced-motion compliance.
   ──────────────────────────────────────────────────────────────────────────── */

export const transitions = {
  instant: {
    duration: 0.05,
    ease: "linear",
  } satisfies Transition,

  fast: {
    duration: 0.12,
    ease: [0.16, 1, 0.3, 1], // snappy cubic bezier
  } satisfies Transition,

  normal: {
    duration: 0.2,
    ease: [0.16, 1, 0.3, 1],
  } satisfies Transition,

  emphasis: {
    duration: 0.35,
    ease: [0.16, 1, 0.3, 1],
  } satisfies Transition,

  spring: {
    type: "spring",
    stiffness: 400,
    damping: 30,
  } satisfies Transition,

  smoothSpring: {
    type: "spring",
    stiffness: 280,
    damping: 24,
    mass: 0.8,
  } satisfies Transition,

  blurReveal: {
    duration: 0.3,
    ease: [0.16, 1, 0.3, 1],
  } satisfies Transition,
};

// ── 1. Page & View Transitions ───────────────────────────────────────────────
export const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 4,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.16,
      ease: [0.16, 1, 0.3, 1],
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.08,
      ease: "easeOut",
    },
  },
};

// ── 2. Fade Variants ─────────────────────────────────────────────────────────
export const fadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: transitions.normal },
  exit: { opacity: 0, transition: transitions.fast },
};

// ── 3. Slide Variants ────────────────────────────────────────────────────────
export const slideVariants = {
  up: {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: transitions.normal },
    exit: { opacity: 0, y: -8, transition: transitions.fast },
  } satisfies Variants,
  down: {
    hidden: { opacity: 0, y: -12 },
    visible: { opacity: 1, y: 0, transition: transitions.normal },
    exit: { opacity: 0, y: 8, transition: transitions.fast },
  } satisfies Variants,
  left: {
    hidden: { opacity: 0, x: 12 },
    visible: { opacity: 1, x: 0, transition: transitions.normal },
    exit: { opacity: 0, x: -8, transition: transitions.fast },
  } satisfies Variants,
  right: {
    hidden: { opacity: 0, x: -12 },
    visible: { opacity: 1, x: 0, transition: transitions.normal },
    exit: { opacity: 0, x: 8, transition: transitions.fast },
  } satisfies Variants,
};

// ── 4. Blur Reveal (Cinematic metric entry) ──────────────────────────────────
export const blurRevealVariants: Variants = {
  hidden: {
    opacity: 0,
    filter: "blur(8px)",
    transform: "scale(0.98)",
  },
  visible: (i: number = 0) => ({
    opacity: 1,
    filter: "blur(0px)",
    transform: "scale(1)",
    transition: {
      duration: 0.32,
      delay: i * 0.04,
      ease: [0.16, 1, 0.3, 1],
    },
  }),
};

// ── 5. Card Entrances & Stagger Containers ───────────────────────────────────
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.02,
    },
  },
};

export const cardVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 8,
  },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.22,
      delay: i * 0.03,
      ease: [0.16, 1, 0.3, 1],
    },
  }),
};

export const cardEntranceVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 10,
    scale: 0.99,
  },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.25,
      delay: i * 0.035,
      ease: [0.16, 1, 0.3, 1],
    },
  }),
};

// ── 6. Table Rows & Event Stream Stagger ─────────────────────────────────────
export const rowStaggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.02,
      delayChildren: 0.01,
    },
  },
};

export const rowItemVariants: Variants = {
  hidden: {
    opacity: 0,
    x: -6,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: transitions.fast,
  },
};

// ── 7. Drawers & Modals ──────────────────────────────────────────────────────
export const drawerVariants: Variants = {
  hidden: {
    x: "100%",
    opacity: 0.5,
  },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      duration: 0.25,
      ease: [0.16, 1, 0.3, 1],
    },
  },
  exit: {
    x: "100%",
    opacity: 0,
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 1, 1],
    },
  },
};

export const modalVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.96,
    y: 8,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: transitions.normal,
  },
  exit: {
    opacity: 0,
    scale: 0.97,
    y: 6,
    transition: transitions.fast,
  },
};

export const backdropVariants: Variants = {
  hidden: { opacity: 0, backdropFilter: "blur(0px)" },
  visible: {
    opacity: 1,
    backdropFilter: "blur(8px)",
    transition: transitions.fast,
  },
  exit: {
    opacity: 0,
    backdropFilter: "blur(0px)",
    transition: transitions.fast,
  },
};

// ── 8. Hover Elevation & Magnetic Feel ───────────────────────────────────────
export const hoverElevationVariants: Variants = {
  rest: {
    y: 0,
    boxShadow: "var(--shadow-sm)",
    transition: transitions.fast,
  },
  hover: {
    y: -2,
    boxShadow: "var(--shadow-md)",
    transition: transitions.fast,
  },
  tap: {
    y: 0,
    boxShadow: "var(--shadow-xs)",
    scale: 0.99,
    transition: transitions.instant,
  },
};

// ── 9. State Machine Node Pulse (Active Stage Only) ──────────────────────────
export const activeNodePulse: Variants = {
  idle: {
    scale: 1,
  },
  active: {
    scale: [1, 1.06, 1],
    transition: {
      repeat: Infinity,
      repeatType: "reverse",
      duration: 1.6,
      ease: "easeInOut",
    },
  },
};

export const glowPulseVariants: Variants = {
  idle: { opacity: 0.7 },
  pulse: {
    opacity: [0.6, 1, 0.6],
    transition: {
      repeat: Infinity,
      repeatType: "reverse",
      duration: 2.2,
      ease: "easeInOut",
    },
  },
};

// ── 10. Policy Gate Transitions ──────────────────────────────────────────────
export const policyGateVariants: Variants = {
  pending: {
    scale: 1,
  },
  approved: {
    scale: [1, 1.05, 1],
    transition: transitions.normal,
  },
  blocked: {
    scale: [1, 0.96, 1],
    transition: transitions.normal,
  },
};

// ── 11. Recovery Celebration Badge ───────────────────────────────────────────
export const recoveryCelebrationVariants: Variants = {
  initial: {
    scale: 0.8,
    opacity: 0,
  },
  animate: {
    scale: 1,
    opacity: 1,
    transition: transitions.emphasis,
  },
};

// ── 12. Chart Draw Reveal ────────────────────────────────────────────────────
export const chartDrawVariants: Variants = {
  hidden: { opacity: 0, pathLength: 0 },
  visible: {
    opacity: 1,
    pathLength: 1,
    transition: {
      duration: 0.8,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

// ── 13. Scroll Reveal Variants ───────────────────────────────────────────────
export const scrollRevealVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: transitions.normal,
  },
};

// ── 14. Prefers-Reduced-Motion Helper & Hook ─────────────────────────────────
export function getReducedMotionTransition(prefersReduced: boolean, standard: Transition): Transition {
  if (prefersReduced) {
    return { duration: 0 };
  }
  return standard;
}

export function usePrefersReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const listener = (event: MediaQueryListEvent) => {
      setPrefersReduced(event.matches);
    };

    mediaQuery.addEventListener("change", listener);
    return () => mediaQuery.removeEventListener("change", listener);
  }, []);

  return prefersReduced;
}
