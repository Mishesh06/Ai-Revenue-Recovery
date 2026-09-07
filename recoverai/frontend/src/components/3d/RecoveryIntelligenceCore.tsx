"use client";

import React, { useRef, useState, useCallback } from "react";
import { motion, useAnimationFrame } from "framer-motion";
import { formatCurrency, formatPercent, cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────────
   RecoveryIntelligenceCore — Autonomous Financial Intelligence Engine
   Communicates the 4-phase RecoverAI lifecycle:
   Payment Failure → AI Inference → Deterministic Policy → Confirmed Settlement
   Lightweight, 100% reliable SVG & Framer Motion architecture.
   Eliminates WebGL context loss, SSR hydration errors, and canvas resizing bugs.
   ──────────────────────────────────────────────────────────────────────────── */

export interface RecoveryIntelligenceCoreProps {
  recovered?: number;
  rate?: number;
  className?: string;
  interactive?: boolean;
  isLive?: boolean;
}

export function RecoveryIntelligenceCore({
  recovered = 0,
  rate = 0,
  className,
  interactive = true,
  isLive = true,
}: RecoveryIntelligenceCoreProps) {
  // Animated "signal" travelling along paths
  const [tick, setTick] = useState(0);
  const phaseRef = useRef(0);

  useAnimationFrame((_, delta) => {
    phaseRef.current = (phaseRef.current + delta * 0.0004) % 1;
    setTick(phaseRef.current);
  });

  // Nodes: center core + 6 peripheral lifecycle nodes
  const nodes = [
    { id: "center", x: 50, y: 44, r: 24, color: "#6366F1", label: "CORE", glow: "rgba(99,102,241,0.5)", ring: true },
    { id: "fail",   x: 50, y: 10, r: 10, color: "#EF4444", label: "FAIL", glow: "rgba(239,68,68,0.4)",  ring: false },
    { id: "detect", x: 84, y: 25, r: 9.5, color: "#3B82F6", label: "AI",   glow: "rgba(59,130,246,0.4)", ring: false },
    { id: "ml",     x: 84, y: 63, r: 9.5, color: "#6366F1", label: "ML",   glow: "rgba(99,102,241,0.4)", ring: false },
    { id: "plan",   x: 50, y: 76, r: 9.5, color: "#8B5CF6", label: "PLAN", glow: "rgba(139,92,246,0.4)", ring: false },
    { id: "policy", x: 16, y: 63, r: 9.5, color: "#F59E0B", label: "GATE", glow: "rgba(245,158,11,0.4)", ring: false },
    { id: "settled",x: 16, y: 25, r: 9.5, color: "#10B981", label: "₹✓",   glow: "rgba(16,185,129,0.4)", ring: false },
  ];

  // Connections from center to each satellite
  const connections = nodes.slice(1).map((n, i) => ({
    from: nodes[0],
    to: n,
    phase: i / 6,
  }));

  // Calculate signal position along a line at given phase
  const sigPos = (from: { x: number; y: number }, to: { x: number; y: number }, phase: number) => {
    const t = (tick + phase) % 1;
    return {
      x: from.x + (to.x - from.x) * t,
      y: from.y + (to.y - from.y) * t,
    };
  };

  return (
    <div className={cn("relative w-full h-full select-none flex flex-col items-center justify-center", className)}>
      {/* Background ambient radial glow */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at 50% 50%, rgba(99,102,241,0.08) 0%, transparent 70%)",
        }}
      />

      <svg
        viewBox="0 0 100 100"
        className="w-full h-full max-h-[320px]"
        style={{ filter: "drop-shadow(0 0 2px rgba(99,102,241,0.25))" }}
      >
        <defs>
          {/* Radial gradients for each node */}
          {nodes.map((n) => (
            <radialGradient key={`grad-${n.id}`} id={`grad-${n.id}`} cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor={n.color} stopOpacity="0.95" />
              <stop offset="100%" stopColor={n.color} stopOpacity="0.35" />
            </radialGradient>
          ))}
          <filter id="glow-subtle">
            <feGaussianBlur stdDeviation="0.8" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-strong">
            <feGaussianBlur stdDeviation="1.6" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Connection dashed vectors */}
        {connections.map((c, i) => (
          <line
            key={`line-${i}`}
            x1={c.from.x}
            y1={c.from.y}
            x2={c.to.x}
            y2={c.to.y}
            stroke={c.to.color}
            strokeWidth="0.35"
            strokeOpacity="0.3"
            strokeDasharray="1.5 1.5"
          />
        ))}

        {/* Animated signal dots travelling along vectors */}
        {connections.map((c, i) => {
          const pos = sigPos(c.from, c.to, c.phase);
          return (
            <circle
              key={`sig-${i}`}
              cx={pos.x}
              cy={pos.y}
              r="0.9"
              fill={c.to.color}
              opacity="0.9"
              filter="url(#glow-subtle)"
            />
          );
        })}

        {/* Satellite nodes */}
        {nodes.slice(1).map((n) => (
          <g key={n.id} filter="url(#glow-subtle)">
            <circle cx={n.x} cy={n.y} r={n.r + 3} fill={n.color} opacity="0.06" />
            <circle cx={n.x} cy={n.y} r={n.r + 1.5} fill={n.color} opacity="0.10" />
            <circle
              cx={n.x}
              cy={n.y}
              r={n.r}
              fill={`url(#grad-${n.id})`}
              stroke={n.color}
              strokeWidth="0.4"
              strokeOpacity="0.7"
            />
            <text
              x={n.x}
              y={n.y + 0.6}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="2.6"
              fontWeight="700"
              fontFamily="system-ui, -apple-system, sans-serif"
              fill="white"
              opacity="0.95"
            >
              {n.label}
            </text>
          </g>
        ))}

        {/* Center core */}
        <g filter="url(#glow-strong)">
          {/* Outer pulse ring */}
          <motion.circle
            cx={nodes[0].x}
            cy={nodes[0].y}
            r={nodes[0].r + 8}
            fill="none"
            stroke="#6366F1"
            strokeWidth="0.3"
            strokeOpacity="0.35"
            animate={{
              r: [nodes[0].r + 6, nodes[0].r + 12, nodes[0].r + 6],
              opacity: [0.4, 0, 0.4],
            }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          />
          <circle cx={nodes[0].x} cy={nodes[0].y} r={nodes[0].r + 4} fill="#6366F1" opacity="0.08" />
          <circle cx={nodes[0].x} cy={nodes[0].y} r={nodes[0].r + 2} fill="#6366F1" opacity="0.12" />
          <circle
            cx={nodes[0].x}
            cy={nodes[0].y}
            r={nodes[0].r}
            fill="url(#grad-center)"
            stroke="#818CF8"
            strokeWidth="0.5"
            strokeOpacity="0.85"
          />

          {/* Inner text: Live data */}
          <text
            x={nodes[0].x}
            y={nodes[0].y - 3.5}
            textAnchor="middle"
            fontSize="2"
            fontWeight="700"
            fontFamily="system-ui, -apple-system, sans-serif"
            letterSpacing="0.05em"
            fill="#C7D2FE"
            opacity="0.85"
          >
            CORE
          </text>
          <text
            x={nodes[0].x}
            y={nodes[0].y + 0.8}
            textAnchor="middle"
            fontSize="3.4"
            fontWeight="800"
            fontFamily="JetBrains Mono, monospace"
            fill="white"
          >
            {formatPercent(rate || 0)}
          </text>
          <text
            x={nodes[0].x}
            y={nodes[0].y + 5.8}
            textAnchor="middle"
            fontSize="1.8"
            fontWeight="700"
            fontFamily="system-ui, -apple-system, sans-serif"
            letterSpacing="0.05em"
            fill="#6EE7B7"
            opacity="0.9"
          >
            RATE
          </text>
        </g>
      </svg>

      {/* Floating data labels */}
      <div className="flex items-center justify-center gap-4 flex-wrap px-4 mt-2">
        {[
          { label: "Recovered", value: formatCurrency(recovered || 0, "INR"), color: "var(--status-success)" },
          { label: "Net Impact", value: "Active", color: "var(--brand-primary)" },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex flex-col items-center text-center">
            <div
              className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-[var(--radius-xs)] backdrop-blur-sm"
              style={{
                color,
                background: `color-mix(in srgb, ${color} 10%, rgba(7,11,18,0.9))`,
                border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
              }}
            >
              {value}
            </div>
            <div className="text-[9px] font-semibold text-[var(--fg-tertiary)] uppercase tracking-wider mt-0.5">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
