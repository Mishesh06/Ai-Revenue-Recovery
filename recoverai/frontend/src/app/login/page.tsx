"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail, Lock, User, Eye, EyeOff,
  ShieldCheck, KeyRound, Building2, ArrowRight, TrendingUp,
} from "lucide-react";
import { Login3DCanvas } from "@/components/3d/Login3DCanvas";
import { useAuth, PRESET_USERS, AuthUser } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

const EASE = [0.16, 1, 0.3, 1] as const;

// Live stats for the left panel
const STATS = [
  { label: "Revenue Recovered", value: "$48.3M", delta: "+12.4%", color: "#10B981" },
  { label: "Recovery Rate", value: "74.8%", delta: "+3.2%", color: "#2563EB" },
  { label: "Transactions Saved", value: "318K", delta: "+8.9%", color: "#059669" },
];

const TRUST_BADGES = [
  { icon: ShieldCheck, label: "PCI-DSS Level 1", color: "#10B981" },
  { icon: KeyRound, label: "SOC2 Type II", color: "#2563EB" },
  { icon: Building2, label: "Multi-Tenant Isolation", color: "#0284C7" },
];

export default function LoginPage() {
  const router = useRouter();
  const { login, register, user } = useAuth();
  const { toast } = useToast();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("admin@payrecover.io");
  const [password, setPassword] = useState("password123");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    if (mode === "login") {
      const res = await login(email, password);
      setIsLoading(false);
      if (res.success) {
        toast.success("Welcome back!", `Logged in as ${email}`);
        router.push("/");
      } else {
        setErrorMsg(res.error || "Login failed. Please check your credentials.");
      }
    } else {
      if (!name.trim()) {
        setErrorMsg("Please enter your full name.");
        setIsLoading(false);
        return;
      }
      const res = await register(name, email, password);
      setIsLoading(false);
      if (res.success) {
        toast.success("Account Created!", "Welcome to PayRecover. Your workspace is ready.");
        router.push("/");
      } else {
        setErrorMsg(res.error || "Registration failed.");
      }
    }
  };

  const handleQuickDemoLogin = async (preset: AuthUser) => {
    setIsLoading(true);
    setEmail(preset.email);
    setPassword("password123");
    const res = await login(preset.email, "password123");
    setIsLoading(false);
    if (res.success) {
      toast.success(`Signed in as ${preset.name}`, `Active role: ${preset.role}`);
      router.push("/");
    }
  };

  return (
    /* Full-screen split layout — no top nav shown on login */
    <div className="min-h-screen flex overflow-hidden" style={{ fontFamily: "var(--font-sans)" }}>

      {/* ══ LEFT PANEL — Deep Navy Brand + 3D Animation ══════════════════════ */}
      <div
        className="hidden lg:flex lg:w-[52%] relative flex-col justify-between p-12 overflow-hidden"
        style={{ background: "linear-gradient(145deg, #0A2540 0%, #0F2F57 55%, #0A2540 100%)" }}
      >
        {/* 3D Canvas Background */}
        <div className="absolute inset-0">
          <Login3DCanvas />
        </div>

        {/* Subtle overlay gradient to keep text legible */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "linear-gradient(to bottom, rgba(10,37,64,0.55) 0%, rgba(10,37,64,0.25) 50%, rgba(10,37,64,0.65) 100%)",
          }}
        />

        {/* Top — Wordmark */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.18)" }}
            >
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <span className="text-white text-xl font-bold tracking-tight">PayRecover</span>
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-md"
              style={{ background: "rgba(37,99,235,0.35)", color: "#93C5FD", border: "1px solid rgba(37,99,235,0.4)" }}
            >
              Enterprise
            </span>
          </div>
        </div>

        {/* Middle — Headline & live stats */}
        <div className="relative z-10 space-y-8">
          <div>
            <div
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-5"
              style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", color: "#6EE7B7" }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
              Autonomous Recovery Engine Active
            </div>

            <h2 className="text-4xl font-extrabold text-white leading-tight tracking-tight">
              Recover Revenue.<br />
              <span style={{ color: "#60A5FA" }}>Autonomously.</span>
            </h2>
            <p className="mt-4 text-base leading-relaxed" style={{ color: "#93C5FD" }}>
              AI-powered payment recovery that intercepts failed transactions, predicts recovery probability in under 450ms, and routes through smart gateway cascades.
            </p>
          </div>

          {/* Live Stats Grid */}
          <div className="grid grid-cols-3 gap-3">
            {STATS.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.1, ease: EASE }}
                className="rounded-xl p-4"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  backdropFilter: "blur(12px)",
                }}
              >
                <div className="text-2xl font-bold text-white font-mono tracking-tight">{stat.value}</div>
                <div className="text-xs mt-0.5" style={{ color: "#94A3B8" }}>{stat.label}</div>
                <div className="text-xs font-semibold mt-1.5" style={{ color: stat.color }}>{stat.delta}</div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Bottom — Trust Badges */}
        <div className="relative z-10">
          <div className="flex flex-col gap-3">
            {TRUST_BADGES.map((badge) => (
              <div key={badge.label} className="flex items-center gap-2.5">
                <badge.icon className="w-4 h-4 shrink-0" style={{ color: badge.color }} />
                <span className="text-xs font-medium" style={{ color: "#CBD5E1" }}>{badge.label}</span>
              </div>
            ))}
          </div>
          <p className="text-xs mt-5" style={{ color: "#475569" }}>
            © 2026 PayRecover, Inc. · Enterprise Revenue Recovery Platform
          </p>
        </div>
      </div>

      {/* ══ RIGHT PANEL — Clean White Authentication Card ════════════════════ */}
      <div
        className="flex-1 flex items-center justify-center p-8 sm:p-12"
        style={{ background: "#F8FAFC" }}
      >
        <div className="w-full max-w-[400px]">

          {/* Mobile wordmark */}
          <div className="flex lg:hidden items-center gap-2 mb-8">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "#0A2540" }}
            >
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold" style={{ color: "#0A2540" }}>PayRecover</span>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: EASE }}
          >
            <h1 className="text-2xl font-bold mb-1" style={{ color: "#0A2540" }}>
              {mode === "login" ? "Sign in to your account" : "Create your account"}
            </h1>
            <p className="text-sm mb-8" style={{ color: "#64748B" }}>
              {mode === "login"
                ? "Access your payment recovery command center"
                : "Get started with PayRecover Enterprise"}
            </p>

            {/* Mode Toggle */}
            <div
              className="flex p-1 rounded-xl mb-6"
              style={{ background: "#E2E8F0", gap: "2px" }}
            >
              {(["login", "register"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setMode(m); setErrorMsg(null); }}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all duration-150"
                  style={{
                    background: mode === m ? "#FFFFFF" : "transparent",
                    color: mode === m ? "#0A2540" : "#64748B",
                    boxShadow: mode === m ? "0 1px 3px rgba(0,0,0,0.10)" : "none",
                  }}
                >
                  {m === "login" ? "Sign In" : "Create Account"}
                </button>
              ))}
            </div>

            {/* Error */}
            <AnimatePresence>
              {errorMsg && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4 p-3 rounded-lg text-xs flex items-start gap-2"
                  style={{
                    background: "rgba(239,68,68,0.06)",
                    border: "1px solid rgba(239,68,68,0.25)",
                    color: "#DC2626",
                  }}
                >
                  <span className="font-semibold shrink-0">Error:</span>
                  <span>{errorMsg}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "#334155" }}>
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#94A3B8" }} />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jane Smith"
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm transition-all"
                      style={{
                        background: "#FFFFFF",
                        border: "1px solid #E2E8F0",
                        color: "#0A2540",
                        outline: "none",
                      }}
                      onFocus={(e) => { e.target.style.borderColor = "#0A2540"; e.target.style.boxShadow = "0 0 0 3px rgba(10,37,64,0.10)"; }}
                      onBlur={(e) => { e.target.style.borderColor = "#E2E8F0"; e.target.style.boxShadow = "none"; }}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "#334155" }}>
                  Work Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#94A3B8" }} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm transition-all"
                    style={{
                      background: "#FFFFFF",
                      border: "1px solid #E2E8F0",
                      color: "#0A2540",
                      outline: "none",
                    }}
                    onFocus={(e) => { e.target.style.borderColor = "#0A2540"; e.target.style.boxShadow = "0 0 0 3px rgba(10,37,64,0.10)"; }}
                    onBlur={(e) => { e.target.style.borderColor = "#E2E8F0"; e.target.style.boxShadow = "none"; }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold" style={{ color: "#334155" }}>
                    Password
                  </label>
                  {mode === "login" && (
                    <span className="text-xs font-medium cursor-pointer" style={{ color: "#2563EB" }}>
                      Forgot password?
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#94A3B8" }} />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••"
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl text-sm transition-all"
                    style={{
                      background: "#FFFFFF",
                      border: "1px solid #E2E8F0",
                      color: "#0A2540",
                      outline: "none",
                    }}
                    onFocus={(e) => { e.target.style.borderColor = "#0A2540"; e.target.style.boxShadow = "0 0 0 3px rgba(10,37,64,0.10)"; }}
                    onBlur={(e) => { e.target.style.borderColor = "#E2E8F0"; e.target.style.boxShadow = "none"; }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: "#94A3B8" }}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Primary CTA */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 transition-all duration-150"
                style={{
                  background: isLoading ? "#334155" : "#0A2540",
                  boxShadow: "0 2px 8px rgba(10,37,64,0.25)",
                }}
                onMouseEnter={(e) => { if (!isLoading) (e.target as HTMLButtonElement).style.background = "#0F2F57"; }}
                onMouseLeave={(e) => { if (!isLoading) (e.target as HTMLButtonElement).style.background = "#0A2540"; }}
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{mode === "login" ? "Sign In to Dashboard" : "Create Account"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* 1-Click Demo Roles */}
            <div className="mt-8 pt-6" style={{ borderTop: "1px solid #E2E8F0" }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#94A3B8" }}>
                  1-Click Demo Access
                </span>
                <span className="text-xs px-2 py-0.5 rounded-md font-semibold"
                  style={{ background: "#ECFDF5", color: "#059669", border: "1px solid #BBF7D0" }}>
                  Ready to test
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {PRESET_USERS.map((preset) => {
                  const isCurrent = user?.email === preset.email;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleQuickDemoLogin(preset)}
                      className="p-3 rounded-xl text-left transition-all duration-150 flex flex-col gap-0.5"
                      style={{
                        background: isCurrent ? "#EFF6FF" : "#FFFFFF",
                        border: `1px solid ${isCurrent ? "#BFDBFE" : "#E2E8F0"}`,
                        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                      }}
                      onMouseEnter={(e) => {
                        const el = e.currentTarget;
                        el.style.borderColor = "#0A2540";
                        el.style.background = "#F0F6FF";
                      }}
                      onMouseLeave={(e) => {
                        const el = e.currentTarget;
                        el.style.borderColor = isCurrent ? "#BFDBFE" : "#E2E8F0";
                        el.style.background = isCurrent ? "#EFF6FF" : "#FFFFFF";
                      }}
                    >
                      <span className="text-xs font-bold truncate" style={{ color: "#0A2540" }}>
                        {preset.role.split(" ")[0]}
                      </span>
                      <span className="text-[10px] truncate" style={{ color: "#64748B" }}>
                        {preset.name.split(" ")[0]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer Trust Row */}
            <div className="mt-8 flex items-center justify-center gap-5">
              {TRUST_BADGES.map((badge) => (
                <div key={badge.label} className="flex items-center gap-1.5">
                  <badge.icon className="w-3.5 h-3.5" style={{ color: badge.color }} />
                  <span className="text-[11px]" style={{ color: "#94A3B8" }}>{badge.label.split(" ")[0]}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
