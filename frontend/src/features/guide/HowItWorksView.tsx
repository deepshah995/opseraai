"use client";

import React, { useState } from "react";
import { api } from "@/lib/api/client";
import { SwarmRun } from "@/types";
import { SwarmBotAvatar, getCompanionMeta } from "@/components/agents/SwarmBotAvatar";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock,
  Cpu,
  DollarSign,
  FileSpreadsheet,
  FileText,
  GitBranch,
  Play,
  Receipt,
  RefreshCw,
  Scale,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const AGENTS_GUIDE = [
  {
    id: "bom_guard",
    name: "BOMGuard (BG-01)",
    role: "Material & Receiving Scale Auditor",
    color: "bg-emerald-50 border-emerald-200 text-emerald-800",
    iconColor: "bg-emerald-600 text-white",
    icon: Scale,
    inputs: "Receiving dock scale tickets, vendor POs, Bill of Materials",
    catches: "Short-shipped steel/resin weights & excess BOM scrap consumption",
    saves: "$14,250/mo est. · ~40 mins saved per variance check",
  },
  {
    id: "cost_sentry",
    name: "CostSentry (CS-02)",
    role: "Procurement & 3-Way Invoice Auditor",
    color: "bg-amber-50 border-amber-200 text-amber-800",
    iconColor: "bg-amber-600 text-white",
    icon: Receipt,
    inputs: "Supplier price books, Purchase Orders, ERP invoices",
    catches: "Vendor unit-price creep, duplicate bills, and unbilled production jobs",
    saves: "$18,400/mo est. · ~45 mins saved per 3-way AP match",
  },
  {
    id: "line_pulse",
    name: "LinePulse (LP-03)",
    role: "Production Schedule & CNC Cell Coordinator",
    color: "bg-blue-50 border-blue-200 text-blue-800",
    iconColor: "bg-blue-600 text-white",
    icon: Cpu,
    inputs: "ERP shift schedules, CNC machine logs, work order completions",
    catches: "Runs marked cancelled in ERP that were actually machined on the floor",
    saves: "55 mins saved per schedule check · Prevents unbilled capacity loss",
  },
  {
    id: "quality_shield",
    name: "QualityShield (QS-04)",
    role: "QC Inspection & Supplier NCR Arbitrator",
    color: "bg-rose-50 border-rose-200 text-rose-800",
    iconColor: "bg-rose-600 text-white",
    icon: ShieldCheck,
    inputs: "QC inspection slips, work order logs, customer/vendor claims",
    catches: "Prepares verified supplier chargebacks (NCRs) or QA dispute packets",
    saves: "~65 mins saved per supplier NCR or customer RMA dispute",
  },
  {
    id: "plant_beacon",
    name: "PlantBeacon (PB-05)",
    role: "Plant ROI & Executive Report Publisher",
    color: "bg-indigo-50 border-indigo-200 text-indigo-800",
    iconColor: "bg-indigo-600 text-white",
    icon: BarChart3,
    inputs: "All plant records, discrepancy ledger, swarm execution metrics",
    catches: "Rollups of dollar savings, reclaimed staff hours, & cell efficiency",
    saves: "~90 mins saved weekly · Outputs directly to Google Docs & Sheets",
  },
];

export function HowItWorksView({
  onNavigateTab,
}: {
  onNavigateTab?: (tab: string) => void;
}) {
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState<SwarmRun | null>(null);
  const [simError, setSimError] = useState<string | null>(null);

  const handleRunDrySimulation = async () => {
    setSimulating(true);
    setSimError(null);
    try {
      const workflows = await api.listWorkflows();
      if (workflows.length === 0) {
        setSimError("No template workflows available yet.");
        return;
      }
      const run = await api.runWorkflow(workflows[0].id, true);
      setSimResult(run);
    } catch (err: any) {
      setSimError(err.message || "Could not run live simulation.");
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-300">
      {/* Calm Plain-English Hero */}
      <div className="hero-aura rounded-2xl border border-slate-200/80 p-6 md:p-8 shadow-2xs">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
              <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
              Faktry AI · Powered by Google Antigravity SDK
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-950 tracking-tight">
              How Your Manufacturing{" "}
              <span className="bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
                Agent Swarm Works
              </span>
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Faktry AI connects your plant spreadsheets, ERP work orders, and supplier invoices to a
              team of five friendly AI agents. Together, they catch hidden cost leaks (short
              deliveries, overbilling, duplicate invoices, unlogged shop-floor runs) and eliminate
              manual spreadsheet chasing — while always keeping your managers in charge of approvals.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0">
            {onNavigateTab && (
              <>
                <button
                  type="button"
                  onClick={() => onNavigateTab("builder")}
                  className="px-5 py-2.5 text-xs font-semibold rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2 shadow-xs transition-colors"
                >
                  <GitBranch className="h-4 w-4" />
                  Open Drag &amp; Drop Builder
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateTab("connectors")}
                  className="px-5 py-2.5 text-xs font-semibold rounded-full border border-slate-200 bg-white hover:border-emerald-300 hover:bg-slate-50 text-slate-800 flex items-center justify-center gap-2 transition-colors"
                >
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                  Connect Google Sheets / Docs
                </button>
              </>
            )}
          </div>
        </div>

        {/* 4-Step Flow Diagram */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-7 pt-6 border-t border-slate-100">
          {[
            {
              step: "1. Connect Your Data",
              desc: "Link a Google Sheet, upload CSVs, or pull from your ERP database.",
              icon: FileSpreadsheet,
              tone: "text-emerald-600 bg-emerald-50",
            },
            {
              step: "2. Wire Your Swarm",
              desc: "Use Drag & Drop to choose which agents inspect which records.",
              icon: GitBranch,
              tone: "text-blue-600 bg-blue-50",
            },
            {
              step: "3. Swarm Audits 24/7",
              desc: "Agents cross-check receiving weights, PO prices, CNC logs & invoices.",
              icon: DollarSign,
              tone: "text-amber-600 bg-amber-50",
            },
            {
              step: "4. Approve & Publish",
              desc: "Managers approve items >= $500 in 1 click and export briefs to Google Docs.",
              icon: FileText,
              tone: "text-indigo-600 bg-indigo-50",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.tone}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <p className="text-xs font-bold text-slate-900">{item.step}</p>
                <p className="text-xs text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive 10-Second Simulation */}
      <div className="brand-gradient-card text-white rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-base font-bold">
              Try a Safe Preview Run on Your Current Plant Data
            </h2>
            <p className="text-xs text-slate-200/90 mt-1">
              Runs the default 3-Way Cost Saver Swarm workflow in preview mode (makes zero
              changes to database statuses) so you can see cost &amp; time savings immediately.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRunDrySimulation}
            disabled={simulating}
            className="px-5 py-2.5 text-xs font-semibold rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center gap-2 disabled:opacity-60 shrink-0 shadow-xs transition-colors"
          >
            {simulating ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {simulating ? "Running Swarm Simulation..." : "Run Safe Swarm Simulation"}
          </button>
        </div>

        {simError && (
          <p className="text-xs text-rose-300 bg-rose-950/60 px-3 py-2 rounded-lg">{simError}</p>
        )}

        {simResult && (
          <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                Simulation Completed ({simResult.sdk})
              </div>
              <div className="flex items-center gap-4 text-xs font-bold">
                <span className="text-emerald-300">
                  Cost Savings Found: ${simResult.total_cost_savings_usd.toLocaleString()}
                </span>
                <span className="text-blue-300">
                  Time Reclaimed: {simResult.total_hours_saved} hrs
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-200">{simResult.orchestrator_summary}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
              {simResult.steps.map((s, idx) => (
                <div key={idx} className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-700 text-[11px]">
                  <p className="font-bold text-white truncate">{s.label}</p>
                  <p className="text-slate-400 mt-1 line-clamp-2">{s.summary}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 5 Agents Breakdown */}
      <div className="space-y-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Meet Your 5 Specialized Manufacturing Agents
          </h2>
          <p className="text-xs text-slate-500">
            Each agent focuses on one clear operational bottleneck with measurable dollar and time savings.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {AGENTS_GUIDE.map((ag) => {
            const companion = getCompanionMeta(ag.id);
            return (
              <div
                key={ag.id}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between space-y-3 group hover:border-blue-300 transition-all"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center gap-3">
                    <div className="transition-transform duration-200 group-hover:-translate-y-0.5">
                      <SwarmBotAvatar agentId={ag.id} mood="happy" size="md" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-bold text-slate-900">{ag.name}</p>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {companion.nickname}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">{ag.role}</p>
                    </div>
                  </div>
                  <p className="text-[11px] italic text-slate-500 bg-slate-50 rounded-lg px-2.5 py-1.5 border border-slate-100">
                    &ldquo;{companion.greeting}&rdquo;
                  </p>
                  <div className="text-xs space-y-1.5 pt-1">
                    <p className="text-slate-600">
                      <span className="font-semibold text-slate-800">Reads:</span> {ag.inputs}
                    </p>
                    <p className="text-slate-600">
                      <span className="font-semibold text-slate-800">Catches:</span> {ag.catches}
                    </p>
                  </div>
                </div>

                <div className={`px-3 py-2 rounded-lg border text-[11px] font-semibold flex items-center gap-1.5 ${ag.color}`}>
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  <span>{ag.saves}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Practical How-To Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-blue-600" />
            How to Use the Drag &amp; Drop Swarm Builder
          </h3>
          <ol className="text-xs text-slate-600 space-y-2 list-decimal pl-4">
            <li>
              Pick a ready-made template (like <strong>3-Way PO &amp; Invoice Cost Saver</strong>)
              or click <strong>New Flow</strong>.
            </li>
            <li>
              Drag building blocks (Inputs, Swarm Agents, Approval Gate, Google Docs/Sheets) onto
              the grid canvas, or click <strong>+</strong> beside any block.
            </li>
            <li>
              Click the small <strong>Link icon</strong> on one block, then click a second block to
              wire them together and set conditional routing rules (e.g., <em>If Impact &gt;= $500</em>).
            </li>
            <li>
              Click <strong>Run Flow Now</strong> to execute the pipeline via the Google Antigravity
              SDK and view exact dollar &amp; hour savings.
            </li>
          </ol>
          {onNavigateTab && (
            <button
              type="button"
              onClick={() => onNavigateTab("builder")}
              className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1 pt-1"
            >
              Try the Drag &amp; Drop Builder <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            How Google Sheets, Google Docs &amp; Safety Guardrails Work
          </h3>
          <ul className="text-xs text-slate-600 space-y-2 list-disc pl-4">
            <li>
              <strong>Google Sheets Two-Way Sync:</strong> Paste any public Sheet URL or paste CSV
              rows in <em>App Connectors</em> to ingest POs/receiving logs, or download verified
              savings tables back into Sheets.
            </li>
            <li>
              <strong>Google Docs Briefs:</strong> One click compiles PlantBeacon&apos;s ROI summary and
              QualityShield NCR details into a ready-to-share document.
            </li>
            <li>
              <strong>Human-in-the-Loop Safety:</strong> Antigravity SDK tool policies are fail-closed
              (read-only DB access scoped strictly to your plant tenant). Financial adjustments over
              $500 pause in <em>Needs Approval</em> for human review.
            </li>
          </ul>
          {onNavigateTab && (
            <button
              type="button"
              onClick={() => onNavigateTab("connectors")}
              className="text-xs font-semibold text-emerald-700 hover:underline flex items-center gap-1 pt-1"
            >
              Open App Connectors <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
