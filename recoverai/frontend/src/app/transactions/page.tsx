"use client";

import React, { Suspense, useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMerchant } from "@/context/MerchantContext";
import { useToast } from "@/context/ToastContext";
import { getTransactions, getTransaction, getAudit, getDashboard } from "@/lib/api-services";
import { TransactionOut, AuditEventOut, DashboardResponse, PaginatedResponse } from "@/types/api";
import { LoadingSpinner, ErrorState, EmptyState, SkeletonTable } from "@/components/ui-custom/FeedbackStates";
import { StatusBadge } from "@/components/ui-custom/StatusBadge";
import { TransactionFilters, TransactionFiltersState } from "@/components/transactions/TransactionFilters";
import { TransactionDetailDrawer } from "@/components/transactions/TransactionDetailDrawer";
import { AnimatedNumber } from "@/components/ui-custom/AnimatedNumber";
import { formatCurrency, formatDateTime, formatRelativeTime, truncateId, cn } from "@/lib/utils";
import {
  CreditCard, Search, SlidersHorizontal, RefreshCw,
  Building2, ArrowRight, X, Eye, Copy, CheckCheck,
  ShieldCheck, AlertTriangle, CheckCircle2, XCircle,
  TrendingUp, Sparkles, Filter, Percent, Zap
} from "lucide-react";
import {
  motion, AnimatePresence, useMotionValue,
  useSpring as useMotionSpring, Variants
} from "framer-motion";

/* ─────────────────────────────────────────────────────────────────────────────
   TransactionsPage — RecoverAI Financial Transactions Ledger (/transactions)
   High-density fintech ledger with sticky headers, multi-factor filtering,
   and visual integration with the autonomous recovery lifecycle.
   ──────────────────────────────────────────────────────────────────────────── */

const SPRING_EASE = [0.16, 1, 0.3, 1] as const;

function TransactionsContent() {
  const searchParams = useSearchParams();
  const urlTxId = searchParams.get("transactionId") || searchParams.get("txId");
  const urlStatus = searchParams.get("status");

  const { merchantId, isReady } = useMerchant();
  const { toast } = useToast();

  // Data states
  const [data, setData] = useState<PaginatedResponse<TransactionOut> | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [invalidTxId, setInvalidTxId] = useState<string | null>(null);

  // Pagination & Filtering state
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<TransactionFiltersState>({
    searchQuery: "",
    statusFilter: urlStatus || "ALL",
    failureCodeFilter: "ALL",
    dateRange: "all",
    recoveryStatus: "ALL",
  });

  // Inspection Drawer
  const [selectedTx, setSelectedTx] = useState<TransactionOut | null>(null);
  const [auditEvents, setAuditEvents] = useState<AuditEventOut[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Synchronize URL parameters with drawer selection
  const handleSelectTx = useCallback((tx: TransactionOut) => {
    setSelectedTx(tx);
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      params.set("transactionId", tx.id);
      window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
    }
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setSelectedTx(null);
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      params.delete("transactionId");
      params.delete("txId");
      const newUrl = params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname;
      window.history.replaceState(null, "", newUrl);
    }
  }, []);

  // Synchronize urlTxId to open drawer or show invalid alert
  useEffect(() => {
    if (!urlTxId || !merchantId) return;

    if (data?.items && data.items.length > 0) {
      const match = data.items.find((t) => t.id === urlTxId);
      if (match) {
        setSelectedTx(match);
        setInvalidTxId(null);
        return;
      }
    }

    getTransaction(merchantId, urlTxId)
      .then((tx) => {
        if (tx && tx.id) {
          setSelectedTx(tx);
          setInvalidTxId(null);
        } else {
          setInvalidTxId(urlTxId);
        }
      })
      .catch(() => {
        setInvalidTxId(urlTxId);
      });
  }, [urlTxId, data, merchantId]);

  const fetchTransactions = async (isManual = false) => {
    if (!merchantId) return;
    if (isManual) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const [txRes, dashRes] = await Promise.all([
        getTransactions(merchantId, page, 50),
        getDashboard(merchantId).catch(() => null),
      ]);

      setData(txRes);
      if (dashRes) setDashboardData(dashRes);

      if (isManual) {
        toast.success("Ledger Synchronised", "Latest transaction records loaded.");
      }
    } catch (err) {
      console.error("Failed to load transactions", err);
      setError(err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!isReady || !merchantId) return;
    fetchTransactions();
  }, [merchantId, isReady, page]);

  // Load audit trace for inspected transaction
  useEffect(() => {
    if (!selectedTx || !merchantId) return;

    const fetchAudit = async () => {
      setIsLoadingAudit(true);
      try {
        const result = await getAudit(merchantId, {
          transaction_id: selectedTx.id,
          size: 50,
        });
        const sorted = (result.items || []).sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        setAuditEvents(sorted);
      } catch (err) {
        console.error("Failed to fetch transaction audit trace", err);
        setAuditEvents([]);
      } finally {
        setIsLoadingAudit(false);
      }
    };

    fetchAudit();
  }, [selectedTx, merchantId]);

  const handleCopy = (e: React.MouseEvent, text: string, label: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    toast.success("Copied to clipboard", `${label}: ${truncateId(text, 12)}`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleFilterChange = (key: keyof TransactionFiltersState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    setFilters({
      searchQuery: "",
      statusFilter: "ALL",
      failureCodeFilter: "ALL",
      dateRange: "all",
      recoveryStatus: "ALL",
    });
  };

  if (!merchantId) {
    return (
      <EmptyState
        title="Select a Merchant Workspace"
        description="Please select an active merchant workspace from the top header to view the Transactions Ledger."
      />
    );
  }

  // Client-side multi-factor filtering
  const filteredItems = (data?.items || []).filter((tx) => {
    const matchesSearch =
      filters.searchQuery === "" ||
      tx.id.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
      (tx.customer_id && tx.customer_id.toLowerCase().includes(filters.searchQuery.toLowerCase())) ||
      (tx.error_code && tx.error_code.toLowerCase().includes(filters.searchQuery.toLowerCase())) ||
      String(tx.amount).includes(filters.searchQuery);

    const matchesStatus =
      filters.statusFilter === "ALL" ||
      tx.status.toLowerCase() === filters.statusFilter.toLowerCase();

    const matchesFailure =
      filters.failureCodeFilter === "ALL" ||
      (tx.error_code && tx.error_code.toUpperCase() === filters.failureCodeFilter.toUpperCase());

    return matchesSearch && matchesStatus && matchesFailure;
  });

  const totalCount = data?.total || filteredItems.length;
  const recoveredAmount = dashboardData?.financial?.total_recovered_amount || 0;
  const atRiskAmount = dashboardData?.financial?.revenue_at_risk || 0;
  const recoveryRate = dashboardData?.recovery?.recovery_rate || 0;

  return (
    <div className="space-y-10 pb-20">
      {/* ──────────────────────────────────────────────────────────────────────────
          1. EXECUTIVE HEADER
          ────────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[var(--border-subtle)]">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-xs)] text-[10px] font-mono font-bold tracking-[0.09em] uppercase"
              style={{
                background: "var(--brand-primary-muted)",
                border: "1px solid var(--brand-primary-ring)",
                color: "var(--brand-primary-light)",
              }}
            >
              <CreditCard className="w-3.5 h-3.5" />
              FINANCIAL INGESTION LEDGER
            </span>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-[var(--radius-xs)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] font-mono text-[11px] text-[var(--fg-secondary)]">
              <Building2 className="w-3 h-3 text-[var(--brand-primary)]" />
              <span>{truncateId(merchantId, 10)}</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-[var(--radius-xs)] bg-[var(--status-success-subtle)] border border-[var(--status-success-border)] text-[10px] font-mono text-[var(--status-success-text)] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-success)] animate-pulse" />
              RAZORPAY LIVE STREAM
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--fg-primary)] mt-2">
            Transactions & Ingestion Ledger
          </h1>
          <p className="text-sm text-[var(--fg-secondary)] mt-1 max-w-2xl">
            Complete financial ledger of all ingested, failed, retried, and recovered merchant payments with HMAC verification.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchTransactions(true)}
            disabled={isRefreshing}
            className="flex items-center gap-2 h-9 px-4 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-raised)] text-xs font-semibold text-[var(--fg-primary)] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin text-[var(--brand-primary)]")} />
            <span>{isRefreshing ? "Synchronising…" : "Sync Transactions"}</span>
          </button>
          <Link
            href="/recovery"
            className="flex items-center gap-1.5 h-9 px-4 rounded-[var(--radius-md)] text-xs font-bold text-white transition-all"
            style={{ background: "var(--brand-primary)", boxShadow: "var(--glow-brand)" }}
          >
            Recovery Center
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────
          2. LEDGER KPI SUMMARY (TiltCard + AnimatedNumber in INR)
          ────────────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: "Total Transactions",
            value: totalCount,
            formatType: "integer" as const,
            icon: CreditCard,
            color: "var(--brand-primary)",
            borderColor: "var(--brand-primary-ring)",
            desc: "Ingested via Razorpay webhooks",
          },
          {
            title: "Revenue at Risk",
            value: atRiskAmount,
            formatType: "currency" as const,
            icon: AlertTriangle,
            color: "var(--status-danger)",
            borderColor: "var(--status-danger-border)",
            desc: "Failed transactions currently unrecovered",
          },
          {
            title: "Recovered Capital",
            value: recoveredAmount,
            formatType: "currency" as const,
            icon: CheckCircle2,
            color: "var(--status-success)",
            borderColor: "var(--status-success-border)",
            desc: "Successfully recovered to merchant ledger",
          },
          {
            title: "Recovery Rate",
            value: recoveryRate,
            formatType: "percent" as const,
            icon: Percent,
            color: "var(--status-info)",
            borderColor: "var(--status-info-border)",
            desc: "Success conversion on recovery interventions",
          },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.title}
              className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 sm:p-5 flex flex-col justify-between transition-colors hover:border-[var(--border-strong)]"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div
                    className="w-7 h-7 rounded-[var(--radius-sm)] flex items-center justify-center"
                    style={{
                      background: `color-mix(in srgb, ${kpi.color} 14%, transparent)`,
                      border: `1px solid color-mix(in srgb, ${kpi.color} 24%, transparent)`,
                    }}
                  >
                    <Icon className="w-3.5 h-3.5" style={{ color: kpi.color }} />
                  </div>
                  <span className="text-[10px] font-mono font-semibold text-[var(--status-success-text)] bg-[var(--status-success-subtle)] px-1.5 py-0.2 rounded">LIVE</span>
                </div>
                <div className="text-2xl font-bold font-mono text-[var(--fg-primary)] tabular-nums">
                  <AnimatedNumber value={kpi.value} formatType={kpi.formatType} currency="INR" />
                </div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--fg-tertiary)] mt-1">
                  {kpi.title}
                </div>
              </div>
              <p className="text-[11px] text-[var(--fg-secondary)] mt-2 pt-2 border-t border-[var(--border-subtle)] leading-relaxed">{kpi.desc}</p>
            </div>
          );
        })}
      </div>

      {/* Invalid Transaction ID Error Banner */}
      {invalidTxId && (
        <div className="p-4 rounded-[var(--radius-lg)] bg-[var(--status-danger-subtle)] border border-[var(--status-danger-border)] text-[var(--status-danger-text)] text-xs flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-[var(--status-danger)] shrink-0" />
            <span>
              Transaction Not Found: No transaction record matches ID <strong className="font-mono">{invalidTxId}</strong> for this merchant workspace.
            </span>
          </div>
          <button
            onClick={() => setInvalidTxId(null)}
            className="text-xs font-bold underline ml-4 hover:opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          3. ADVANCED FILTER & SEARCH PANEL
          ────────────────────────────────────────────────────────────────────────── */}
      <TransactionFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
        totalFiltered={filteredItems.length}
        totalTotal={totalCount}
      />

      {/* ──────────────────────────────────────────────────────────────────────────
          4. HIGH-POLISHED FINANCIAL LEDGER TABLE (with horizontal scroll safety)
          ────────────────────────────────────────────────────────────────────────── */}
      {isLoading && !data ? (
        <SkeletonTable rows={10} cols={8} />
      ) : error ? (
        <ErrorState error={error} retry={() => fetchTransactions()} />
      ) : filteredItems.length === 0 ? (
        <EmptyState
          title="No transactions found"
          description="No transactions matched your search or status filter criteria."
          action={
            <div className="flex items-center gap-2">
              <button
                onClick={handleResetFilters}
                className="px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--bg-raised)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--fg-secondary)] hover:text-[var(--fg-primary)] transition-colors"
              >
                Reset Filters
              </button>
              <Link
                href="/simulator"
                className="px-3.5 py-1.5 rounded-[var(--radius-md)] text-xs font-bold text-white transition-all shadow-sm flex items-center gap-1.5"
                style={{ background: "var(--brand-primary)", boxShadow: "var(--glow-brand)" }}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Simulate Ingestion →</span>
              </Link>
            </div>
          }
        />
      ) : (
        <div className="rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-[var(--shadow-sm)] overflow-hidden">
          <div className="overflow-x-auto no-scrollbar max-h-[640px] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[820px]">
              <thead className="sticky top-0 bg-[var(--bg-surface-alt)] z-10 shadow-[var(--shadow-xs)]">
                <tr className="border-b border-[var(--border-subtle)] text-[11px] font-semibold uppercase tracking-wider text-[var(--fg-tertiary)]">
                  <th className="py-3 px-4 first:pl-5">Timestamp</th>
                  <th className="py-3 px-4">Transaction ID</th>
                  <th className="py-3 px-4">Customer Ref</th>
                  <th className="py-3 px-4">Channel</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Failure Code</th>
                  <th className="py-3 px-4 text-right">Amount (₹)</th>
                  <th className="py-3 px-4 text-right last:pr-5">Inspect</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[var(--border-subtle)]">
                {filteredItems.map((tx) => {
                  const isSelected = selectedTx?.id === tx.id;
                  return (
                    <tr
                      key={tx.id}
                      onClick={() => handleSelectTx(tx)}
                      className={cn(
                        "hover:bg-[var(--bg-raised)] transition-colors duration-150 cursor-pointer group",
                        isSelected && "bg-[var(--brand-primary-muted)]/50"
                      )}
                    >
                      {/* Timestamp */}
                      <td className="py-3 px-4 font-mono text-[11px] text-[var(--fg-tertiary)] whitespace-nowrap first:pl-5">
                        {formatDateTime(tx.created_at)}
                      </td>

                      {/* Transaction ID */}
                      <td className="py-3 px-4 font-mono font-semibold text-[var(--fg-primary)] whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="group-hover:text-[var(--brand-primary)] transition-colors">
                            {truncateId(tx.id, 14)}
                          </span>
                          <button
                            onClick={(e) => handleCopy(e, tx.id, "Tx UUID")}
                            className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-[var(--fg-tertiary)] hover:text-[var(--fg-primary)] transition-opacity"
                            title="Copy UUID"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="py-3 px-4 font-mono text-[11px] text-[var(--fg-secondary)] truncate max-w-[140px]">
                        {tx.customer_id ? truncateId(tx.customer_id, 12) : "cust_direct"}
                      </td>

                      {/* Channel / Method */}
                      <td className="py-3 px-4 font-mono text-[11px] text-[var(--fg-tertiary)] whitespace-nowrap">
                        {tx.payment_method || "UPI Intent"}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <StatusBadge label={tx.status || "UNKNOWN"} size="xs" dot />
                      </td>

                      {/* Failure / Status Detail */}
                      <td className="py-3 px-4 font-mono text-[11px] truncate max-w-[180px]">
                        {tx.status?.toLowerCase() === "failed" ? (
                          <span className="px-1.5 py-0.5 rounded bg-[var(--status-danger-subtle)] text-[var(--status-danger-text)] font-semibold border border-[var(--status-danger-border)] text-[10px]">
                            GATEWAY_DECLINE
                          </span>
                        ) : tx.status?.toLowerCase() === "captured" || tx.status?.toLowerCase() === "success" ? (
                          <span className="text-[var(--status-success-text)] font-semibold text-[11px]">Settled</span>
                        ) : (
                          <span className="text-[var(--fg-quaternary)]">—</span>
                        )}
                      </td>

                      {/* Amount in INR */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-xs text-[var(--fg-primary)]">
                        {formatCurrency(tx.amount, tx.currency || "INR")}
                      </td>

                      {/* Inspect */}
                      <td className="py-3 px-4 text-right last:pr-5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectTx(tx);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[var(--radius-xs)] bg-[var(--bg-surface-alt)] hover:bg-[var(--bg-raised)] text-[11px] font-semibold text-[var(--brand-primary)] border border-[var(--border-subtle)] transition-colors"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          5. TRANSACTION DETAIL DRAWER
          ────────────────────────────────────────────────────────────────────────── */}
      {selectedTx && (
        <TransactionDetailDrawer
          transaction={selectedTx}
          onClose={handleCloseDrawer}
          auditEvents={auditEvents}
          isLoadingAudit={isLoadingAudit}
        />
      )}
    </div>
  );
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={<LoadingSpinner message="Calibrating Transactions Ledger…" />}>
      <TransactionsContent />
    </Suspense>
  );
}
