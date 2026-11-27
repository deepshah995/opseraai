"use client";

import React from "react";
import { AnalyticsSummary, AuditEvent, ExceptionStats } from "@/types";
import { SwarmBotAvatar, getCompanionMeta } from "@/components/agents/SwarmBotAvatar";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  DollarSign,
  FileSpreadsheet,
  GitBranch,
  History,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

const DASHBOARD_BOTS = [
  {
    id: "bom_guard",
    name: "BOMGuard",
    specialty: "Dock Scales & BOM",
    cardTheme: "border-emerald-200/80 bg-gradient-to-br from-emerald-50/60 to-white hover:border-emerald-300",
    pillTheme: "text-emerald-700",
  },
  {
    id: "cost_sentry",
    name: "CostSentry",
    specialty: "3-Way PO Audits",
    cardTheme: "border-amber-200/80 bg-gradient-to-br from-amber-50/60 to-white hover:border-amber-300",
    pillTheme: "text-amber-700",
  },
  {
    id: "line_pulse",
    name: "LinePulse",
    specialty: "CNC Cell Schedules",
    cardTheme: "border-blue-200/80 bg-gradient-to-br from-blue-50/60 to-white hover:border-blue-300",
    pillTheme: "text-blue-700",
  },
  {
    id: "quality_shield",
    name: "QualityShield",
    specialty: "QC & Supplier NCRs",
    cardTheme: "border-rose-200/80 bg-gradient-to-br from-rose-50/60 to-white hover:border-rose-300",
    pillTheme: "text-rose-700",
  },
  {
    id: "plant_beacon",
    name: "PlantBeacon",
    specialty: "ROI & Google Docs",
    cardTheme: "border-indigo-200/80 bg-gradient-to-br from-indigo-50/60 to-white hover:border-indigo-300",
    pillTheme: "text-indigo-700",
  },
];

interface DashboardViewProps {
  summary: AnalyticsSummary | null;
  stats: ExceptionStats | null;
  auditEvents: AuditEvent[];
  onNavigate: (tab: any) => void;
  onSelectException?: (id: string) => void;
}

const EXCEPTION_LABELS: Record<
  string,
  { label: string; agent: string; desc: string; badge: string }
> = {
  rate_mismatch: {
    label: "Vendor PO Rate Creep",
    agent: "CostSentry",
    desc: "Supplier invoice unit rate exceeds contracted PO price book",
    badge: "bg-amber-50 text-amber-800 border-amber-200",
  },
  quantity_mismatch: {
    label: "Receiving Weight / BOM Variance",
    agent: "BOMGuard",
    desc: "Dock scale net weight or scrap pull differs from PO / BOM",
    badge: "bg-emerald-50 text-emerald-800 border-emerald-200",
  },
  unbilled_job: {
    label: "Unbilled Completed Production",
    agent: "CostSentry",
    desc: "Finished work order lacks corresponding AR/AP settlement",
    badge: "bg-amber-50 text-amber-800 border-amber-200",
  },
  duplicate_billing: {
    label: "Duplicate Supplier Invoice",
    agent: "CostSentry",
    desc: "Two invoices detected for the same PO or work order lot",
    badge: "bg-rose-50 text-rose-800 border-rose-200",
  },
  dispatch_discrepancy: {
    label: "Shop-Floor Schedule Drift",
    agent: "LinePulse",
    desc: "CNC or assembly cell ran a job marked cancelled in ERP",
    badge: "bg-blue-50 text-blue-800 border-blue-200",
  },
};

export function DashboardView({
  summary,
  stats,
  auditEvents,
  onNavigate,
}: DashboardViewProps) {
  const identifiedSavings =
    summary?.cost_savings_identified_usd ?? summary?.at_risk_discrepancy_amount ?? 0;
  const capturedSavings = summary?.cost_savings_captured_usd ?? 0;
  const hoursSaved = summary?.hours_saved_mtd ?? 0;
  const pendingApprovals = summary?.pending_human_approvals ?? 0;
  const openCount = summary?.open_exceptions ?? 0;
  const healthPct = summary?.reconciliation_health_pct ?? 94.0;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Faktry AI Clean Aura Welcome Strip */}
      <div className="hero-aura rounded-[22px] border border-slate-200/80 p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4 shadow-2xs">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-0.5 text-[11px] font-semibold text-emerald-800">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Faktry AI · Plant Command Board
          </div>
          <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-950">
            Catch hidden profit leaks.{" "}
            <span className="bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
              Run every agent in one place.
            </span>
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => onNavigate("builder")}
            className="rounded-full bg-slate-950 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <GitBranch className="h-3.5 w-3.5 text-emerald-400" />
            Customize Swarm Flow
          </button>
          <button
            type="button"
            onClick={() => onNavigate("agents")}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:border-emerald-300 hover:bg-emerald-50/40 transition-colors"
          >
            Open Swarm Studio
          </button>
        </div>
      </div>

      {/* 4 Faktry AI Accent-Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          id="tour-kpi-leakage"
          type="button"
          onClick={() => onNavigate("exceptions")}
          className="text-left bg-white rounded-2xl border border-slate-200 border-t-4 border-t-emerald-500 p-5 shadow-xs hover:shadow-sm transition-all"
        >
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wide text-emerald-700">
            <span>Cost Savings Found</span>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 tabular-nums mt-2">
            ${identifiedSavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-slate-500 font-medium mt-1.5">
            <span className="text-emerald-700 font-semibold">{openCount} open</span> cost leaks ready to capture &rarr;
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate("reports")}
          className="text-left bg-white rounded-2xl border border-slate-200 border-t-4 border-t-blue-600 p-5 shadow-xs hover:shadow-sm transition-all"
        >
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wide text-blue-700">
            <span>Hours Saved (MTD)</span>
            <Clock className="h-4 w-4 text-blue-600" />
          </div>
          <p className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 tabular-nums mt-2">
            {hoursSaved} hrs
          </p>
          <p className="text-xs text-slate-500 font-medium mt-1.5">
            Automated 3-way PO &amp; receiving audits
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate("reports")}
          className="text-left bg-white rounded-2xl border border-slate-200 border-t-4 border-t-indigo-600 p-5 shadow-xs hover:shadow-sm transition-all"
        >
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wide text-indigo-700">
            <span>Savings Captured</span>
            <TrendingUp className="h-4 w-4 text-indigo-600" />
          </div>
          <p className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 tabular-nums mt-2">
            ${capturedSavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-slate-500 mt-1.5">
            Plant reconciliation health: <strong className="text-slate-900 tabular-nums">{healthPct}%</strong>
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate("approvals")}
          className="text-left bg-white rounded-2xl border border-slate-200 border-t-4 border-t-amber-500 p-5 shadow-xs hover:shadow-sm transition-all"
        >
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wide text-amber-700">
            <span>Needs Approval</span>
            <ShieldCheck className="h-4 w-4 text-amber-600" />
          </div>
          <p className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 tabular-nums mt-2">
            {pendingApprovals}
          </p>
          <p className="text-xs text-slate-500 font-medium mt-1.5">
            High-value actions paused for sign-off &rarr;
          </p>
        </button>
      </div>

      {/* Interactive Personified Swarm Companion Strip */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3.5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="font-display text-sm font-bold text-slate-950">
              Meet Your Manufacturing Bot Swarm
            </h3>
            <p className="text-xs text-slate-500">
              Click any friendly bot companion to chat with it in Swarm Studio.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate("agents")}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline shrink-0"
          >
            Open Swarm Studio &rarr;
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {DASHBOARD_BOTS.map((bot) => {
            const meta = getCompanionMeta(bot.id);
            return (
              <button
                key={bot.id}
                type="button"
                onClick={() => onNavigate("agents")}
                className={`group p-3.5 rounded-2xl border text-left transition-all flex items-center gap-2.5 shadow-2xs ${bot.cardTheme}`}
              >
                <div className="transition-transform duration-200 group-hover:-translate-y-1">
                  <SwarmBotAvatar agentId={bot.id} mood="happy" size="sm" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-950 truncate">
                    {bot.name}
                  </p>
                  <p className={`text-[10px] font-semibold truncate ${bot.pillTheme}`}>
                    {meta.nickname}
                  </p>
                  <p className="text-[10px] text-slate-500 truncate">
                    {bot.specialty}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Action Bar for Customizing Swarm, Connecting Apps, and Learning */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => onNavigate("builder")}
          className="text-left rounded-2xl brand-gradient-card p-5 text-white hover:opacity-95 transition-all flex items-start justify-between gap-3 shadow-sm"
        >
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300">
              <GitBranch className="h-4 w-4" />
              Drag &amp; Drop Swarm Builder
            </div>
            <p className="text-xs text-slate-200/90 leading-relaxed">
              Design custom workflows linking Sheets, swarm agents, and $500 approval gates.
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-emerald-300 shrink-0 mt-1" />
        </button>

        <button
          type="button"
          onClick={() => onNavigate("connectors")}
          className="text-left rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/60 to-white p-5 hover:border-emerald-300 hover:shadow-xs transition-all flex items-start justify-between gap-3"
        >
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800">
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              Google Sheets &amp; Google Docs
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Import receiving &amp; PO sheets in 1 click or publish executive ROI briefs to Docs.
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-emerald-600 shrink-0 mt-1" />
        </button>

        <button
          type="button"
          onClick={() => onNavigate("guide")}
          className="text-left rounded-2xl border border-blue-200/80 bg-gradient-to-br from-blue-50/60 to-white p-5 hover:border-blue-300 hover:shadow-xs transition-all flex items-start justify-between gap-3"
        >
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-800">
              <BookOpen className="h-4 w-4 text-blue-600" />
              How the Swarm Works
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Plain-English guide &amp; safe live simulation showing how every agent saves money.
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-blue-600 shrink-0 mt-1" />
        </button>
      </div>

      {/* Main Content Split: Cost Leak Categories & Recent Swarm Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div
          id="tour-breakdown-panel"
          className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-display text-sm font-bold text-slate-950">
                Detected Cost Leaks &amp; Discrepancies
              </h3>
              <p className="text-xs text-slate-500">
                Breakdown by manufacturing anomaly pattern
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate("exceptions")}
              className="text-xs font-semibold text-emerald-700 hover:underline"
            >
              Inspect All &rarr;
            </button>
          </div>

          <div className="space-y-2.5">
            {Object.entries(EXCEPTION_LABELS).map(([key, meta]) => {
              const count = stats?.by_type?.[key] ?? 0;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onNavigate("exceptions")}
                  className="w-full text-left p-3.5 rounded-xl border border-slate-200/90 hover:border-emerald-300 bg-slate-50/50 hover:bg-emerald-50/20 transition-colors flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-950">
                        {meta.label}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${meta.badge}`}
                      >
                        {meta.agent}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                      {meta.desc}
                    </p>
                  </div>
                  <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-900 tabular-nums shrink-0">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-emerald-600" />
              <h3 className="font-display text-sm font-bold text-slate-950">Recent Swarm Activity</h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigate("audit")}
              className="text-xs font-semibold text-emerald-700 hover:underline"
            >
              Full Log &rarr;
            </button>
          </div>

          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
            {auditEvents.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center">
                No swarm events logged yet. Click &ldquo;Scan for Savings&rdquo; or run a workflow.
              </p>
            ) : (
              auditEvents.slice(0, 8).map((ev) => (
                <div
                  key={ev.id}
                  className="p-3 rounded-xl border border-slate-100 bg-slate-50/70 flex items-start gap-2.5 text-xs"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900 truncate">
                      {ev.action.replace(/_/g, " ")}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      Actor: {ev.actor_id} · {ev.resource_type}
                    </p>
                  </div>
                  <span className="font-mono text-[10px] text-slate-400 tabular-nums shrink-0">
                    {new Date(ev.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
