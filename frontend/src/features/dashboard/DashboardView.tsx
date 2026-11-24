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
  { id: "bom_guard", name: "BOMGuard", specialty: "Dock Scales & BOM" },
  { id: "cost_sentry", name: "CostSentry", specialty: "3-Way PO Audits" },
  { id: "line_pulse", name: "LinePulse", specialty: "CNC Cell Schedules" },
  { id: "quality_shield", name: "QualityShield", specialty: "QC & Supplier NCRs" },
  { id: "plant_beacon", name: "PlantBeacon", specialty: "ROI & Google Docs" },
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
  { label: string; agent: string; desc: string }
> = {
  rate_mismatch: {
    label: "Vendor PO Rate Creep",
    agent: "CostSentry",
    desc: "Supplier invoice unit rate exceeds contracted PO price book",
  },
  quantity_mismatch: {
    label: "Receiving Weight / BOM Variance",
    agent: "BOMGuard",
    desc: "Dock scale net weight or scrap pull differs from PO / BOM",
  },
  unbilled_job: {
    label: "Unbilled Completed Production",
    agent: "CostSentry",
    desc: "Finished work order lacks corresponding AR/AP settlement",
  },
  duplicate_billing: {
    label: "Duplicate Supplier Invoice",
    agent: "CostSentry",
    desc: "Two invoices detected for the same PO or work order lot",
  },
  dispatch_discrepancy: {
    label: "Shop-Floor Schedule Drift",
    agent: "LinePulse",
    desc: "CNC or assembly cell ran a job marked cancelled in ERP",
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
      {/* 4 High-Signal Manufacturing ROI KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          id="tour-kpi-leakage"
          type="button"
          onClick={() => onNavigate("exceptions")}
          className="text-left bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-emerald-400 transition-all"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Cost Savings Found</span>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            ${identifiedSavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-emerald-700 font-medium mt-1">
            {openCount} open cost leaks ready to capture &rarr;
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate("reports")}
          className="text-left bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-blue-400 transition-all"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Hours Saved (MTD)</span>
            <Clock className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {hoursSaved} hrs
          </p>
          <p className="text-xs text-blue-700 font-medium mt-1">
            Automated 3-way PO &amp; receiving audits
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate("reports")}
          className="text-left bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-indigo-400 transition-all"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Savings Captured</span>
            <TrendingUp className="h-4 w-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            ${capturedSavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Plant reconciliation health: <strong className="text-slate-700">{healthPct}%</strong>
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate("approvals")}
          className="text-left bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-amber-400 transition-all"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Needs Manager Approval</span>
            <ShieldCheck className="h-4 w-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {pendingApprovals}
          </p>
          <p className="text-xs text-amber-700 font-medium mt-1">
            High-value actions paused for sign-off &rarr;
          </p>
        </button>
      </div>

      {/* Interactive Personified Swarm Companion Strip */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Meet Your Manufacturing Bot Swarm
            </h3>
            <p className="text-xs text-slate-500">
              Click any friendly bot companion to chat with it in Swarm Studio.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate("agents")}
            className="text-xs font-semibold text-blue-600 hover:underline shrink-0"
          >
            Open Swarm Studio &rarr;
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {DASHBOARD_BOTS.map((bot) => {
            const meta = getCompanionMeta(bot.id);
            return (
              <button
                key={bot.id}
                type="button"
                onClick={() => onNavigate("agents")}
                className="group p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-blue-300 hover:shadow-xs text-left transition-all flex items-center gap-2.5"
              >
                <div className="transition-transform duration-200 group-hover:-translate-y-1">
                  <SwarmBotAvatar agentId={bot.id} mood="happy" size="sm" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {bot.name}
                  </p>
                  <p className="text-[10px] font-semibold text-blue-700 truncate">
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
          className="text-left bg-white rounded-xl border border-slate-200 p-4 hover:border-blue-400 hover:shadow-sm transition-all flex items-start justify-between gap-3"
        >
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700">
              <GitBranch className="h-4 w-4" />
              Drag &amp; Drop Swarm Builder
            </div>
            <p className="text-xs text-slate-600">
              Design custom workflows linking Sheets, swarm agents, and $500 approval gates.
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-400 shrink-0 mt-1" />
        </button>

        <button
          type="button"
          onClick={() => onNavigate("connectors")}
          className="text-left bg-white rounded-xl border border-slate-200 p-4 hover:border-emerald-400 hover:shadow-sm transition-all flex items-start justify-between gap-3"
        >
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700">
              <FileSpreadsheet className="h-4 w-4" />
              Google Sheets &amp; Google Docs
            </div>
            <p className="text-xs text-slate-600">
              Import receiving &amp; PO sheets in 1 click or publish executive ROI briefs to Docs.
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-400 shrink-0 mt-1" />
        </button>

        <button
          type="button"
          onClick={() => onNavigate("guide")}
          className="text-left bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-400 hover:shadow-sm transition-all flex items-start justify-between gap-3"
        >
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <BookOpen className="h-4 w-4" />
              How the Swarm Works
            </div>
            <p className="text-xs text-slate-600">
              Plain-English guide &amp; safe live simulation showing how every agent saves money.
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-400 shrink-0 mt-1" />
        </button>
      </div>

      {/* Main Content Split: Cost Leak Categories & Recent Swarm Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div
          id="tour-breakdown-panel"
          className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Detected Cost Leaks &amp; Discrepancies
              </h3>
              <p className="text-xs text-slate-500">
                Breakdown by manufacturing anomaly pattern
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate("exceptions")}
              className="text-xs font-semibold text-blue-600 hover:underline"
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
                  className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        {meta.label}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
                        {meta.agent}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                      {meta.desc}
                    </p>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-800 shrink-0">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-slate-500" />
              <h3 className="text-sm font-bold text-slate-900">Recent Swarm Activity</h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigate("audit")}
              className="text-xs font-semibold text-blue-600 hover:underline"
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
                  className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/70 flex items-start gap-2.5 text-xs"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-800 truncate">
                      {ev.action.replace(/_/g, " ")}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      Actor: {ev.actor_id} · {ev.resource_type}
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0">
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
