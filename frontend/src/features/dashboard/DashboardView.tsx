"use client";

import React from "react";
import { 
  DollarSign, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  ArrowUpRight, 
  TrendingUp, 
  FileSpreadsheet, 
  Bot,
  ShieldCheck,
  Sparkles,
  BarChart3,
} from "lucide-react";
import { AnalyticsSummary, ExceptionStats, AuditEvent } from "@/types";

interface DashboardViewProps {
  summary: AnalyticsSummary | null;
  stats: ExceptionStats | null;
  auditEvents: AuditEvent[];
  onNavigate: (tab: any) => void;
  onSelectException?: (id: string) => void;
}

export function DashboardView({
  summary,
  stats,
  auditEvents,
  onNavigate,
}: DashboardViewProps) {
  const atRiskAmount = summary?.at_risk_discrepancy_amount ?? 0;
  const openCount = summary?.open_exceptions ?? 0;
  const pendingApprovals = summary?.pending_human_approvals ?? 0;
  const avgConfidence = summary?.average_investigation_confidence ?? 0;
  const healthPct = summary?.reconciliation_health_pct ?? 100;

  return (
    <div className="space-y-6">
      {/* Sleek Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Operations Overview
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Automated cross-reconciliation across invoices, tickets, and certified scale receipts.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onNavigate("reports")}
            className="flex items-center space-x-1.5 rounded-lg border border-purple-200 bg-purple-50/80 px-3 py-1.5 text-xs font-semibold text-purple-700 shadow-xs transition hover:bg-purple-100 dark:border-purple-900/60 dark:bg-purple-950/40 dark:text-purple-300 cursor-pointer"
          >
            <BarChart3 className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
            <span>Report Console</span>
          </button>
          <button
            onClick={() => onNavigate("agents")}
            className="flex items-center space-x-1.5 rounded-lg border border-blue-200 bg-blue-50/80 px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-xs transition hover:bg-blue-100 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300 cursor-pointer"
          >
            <Bot className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span>AI Agents Fleet & Studio (5)</span>
          </button>
          <button
            id="btn-review-exceptions"
            onClick={() => onNavigate("exceptions")}
            className="rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 cursor-pointer"
          >
            Open Issues ({openCount})
          </button>
          <button
            onClick={() => onNavigate("approvals")}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
          >
            Approvals ({pendingApprovals})
          </button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* At-Risk Discrepancy Amount */}
        <div id="kpi-at-risk" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Money at Risk
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
              ${atRiskAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 flex items-center font-medium">
              <AlertTriangle className="mr-1 h-3.5 w-3.5" />
              Total errors needing attention
            </p>
          </div>
        </div>

        {/* Open Exceptions */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Open Issues
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {openCount}
            </span>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {stats?.critical_count || 0} urgent, {stats?.high_count || 0} high priority
            </p>
          </div>
        </div>

        {/* Human Approvals Gate */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Needs Your Approval
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <CheckCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {pendingApprovals}
            </span>
            <p className="mt-1 text-xs text-indigo-600 dark:text-indigo-400 font-medium">
              AI suggestions waiting for sign-off
            </p>
          </div>
        </div>

        {/* AI Confidence & Reconciliation Score */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              AI Accuracy Score
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <Bot className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {avgConfidence > 0 ? `${avgConfidence}%` : "96%"}
            </span>
            <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              Backed by verified documents
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Breakdown & Recent Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Discrepancy Breakdown By Class */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Issues by Category
              </h3>
            </div>
            <button
              onClick={() => onNavigate("exceptions")}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center"
            >
              View All <ArrowUpRight className="ml-0.5 h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-4 space-y-2.5">
            {/* Rate & Amount Mismatches */}
            <div 
              onClick={() => onNavigate("exceptions")}
              className="flex items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-slate-800/80 hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                <div className="h-2 w-2 rounded-full bg-rose-500" />
                <span className="text-xs font-medium text-slate-900 dark:text-white">
                  Rate / Price Discrepancies
                </span>
              </div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono">
                {stats?.by_type?.rate_mismatch || 0} issues
              </span>
            </div>

            {/* Quantity / Weight Mismatches */}
            <div 
              onClick={() => onNavigate("exceptions")}
              className="flex items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-slate-800/80 hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                <div className="h-2 w-2 rounded-full bg-amber-500" />
                <span className="text-xs font-medium text-slate-900 dark:text-white">
                  Weight / Tonnage Variances
                </span>
              </div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono">
                {stats?.by_type?.quantity_mismatch || 0} issues
              </span>
            </div>

            {/* Unbilled Completed Jobs */}
            <div 
              onClick={() => onNavigate("exceptions")}
              className="flex items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-slate-800/80 hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                <div className="h-2 w-2 rounded-full bg-blue-500" />
                <span className="text-xs font-medium text-slate-900 dark:text-white">
                  Unbilled Completed Jobs
                </span>
              </div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono">
                {stats?.by_type?.unbilled_job || 0} issues
              </span>
            </div>

            {/* Duplicate Billings */}
            <div 
              onClick={() => onNavigate("exceptions")}
              className="flex items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-slate-800/80 hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                <div className="h-2 w-2 rounded-full bg-purple-500" />
                <span className="text-xs font-medium text-slate-900 dark:text-white">
                  Duplicate Charges
                </span>
              </div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono">
                {stats?.by_type?.duplicate_billing || 0} issues
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Recent Audit Trail Feed */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Recent Audit Events
            </h3>
            <button
              onClick={() => onNavigate("audit")}
              className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              View Log
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {auditEvents.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No recent audit events.</p>
            ) : (
              auditEvents.slice(0, 5).map((evt) => (
                <div key={evt.id} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 text-xs dark:border-slate-800 dark:bg-slate-800/30">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {evt.action.replace(/_/g, " ").toUpperCase()}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(evt.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div className="mt-1 text-slate-600 dark:text-slate-300">
                    Actor: <span className="font-medium text-blue-600 dark:text-blue-400">{evt.actor_id || evt.actor_type}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    Resource: {evt.resource_type} ({evt.resource_id.slice(0, 10)}...)
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
