"use client";

import React, { useState } from "react";
import { NavTab } from "@/components/layout/Sidebar";
import { ArrowLeft, ArrowRight, CheckCircle2, Sparkles, X } from "lucide-react";

interface OperationsTourProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (tab: NavTab) => void;
  setActiveTab?: (tab: any) => void;
  onSelectException?: (id: string) => void;
  exceptions?: any[];
  onSeedData?: () => Promise<void>;
  onRunDetection?: () => Promise<void>;
}

const TOUR_STEPS: Array<{
  title: string;
  tab: NavTab;
  summary: string;
  detail: string;
}> = [
  {
    title: "Overview & Cost/Time ROI",
    tab: "dashboard",
    summary: "Track Cost Savings Found ($), Hours Reclaimed (MTD), and Pending Approvals.",
    detail:
      "Every discrepancy flagged by your swarm translates directly into prevented margin leaks and hours saved for buyers and plant engineers.",
  },
  {
    title: "Manufacturing Swarm Studio",
    tab: "agents",
    summary: "Operate and chat directly with all 5 Manufacturing Agents.",
    detail:
      "Meet BOMGuard (receiving & BOM weight audits), CostSentry (3-way PO & invoice checks), LinePulse (CNC cell schedules), QualityShield (QC/NCR disputes), and PlantBeacon (executive ROI briefs) powered by Google Antigravity SDK.",
  },
  {
    title: "Drag & Drop Swarm Builder",
    tab: "builder",
    summary: "Visually wire data sources, agents, approval gates & output apps.",
    detail:
      "Drag blocks onto the canvas, set routing conditions like 'If Impact >= $500', save templates per plant, and execute the pipeline in 1 click.",
  },
  {
    title: "App Connectors (Google Sheets & Docs)",
    tab: "connectors",
    summary: "Connect Google Sheets, Google Docs, Manufacturing ERP, and Slack.",
    detail:
      "Import receiving slips and PO spreadsheets or publish formatted ROI and supplier NCR briefs to Google Docs.",
  },
  {
    title: "How It Works & Safe Simulation",
    tab: "guide",
    summary: "Plain-English onboarding guide for every plant operator and manager.",
    detail:
      "Share this tab with your team so anyone can understand each agent's inputs, outputs, and safety guardrails—or trigger a safe preview run anytime.",
  },
  {
    title: "Human-in-the-Loop Approvals",
    tab: "approvals",
    summary: "Managers retain final sign-off for high-dollar actions (>= $500).",
    detail:
      "Low-risk adjustments can be auto-cleared, while high-impact credit memos and NCR claims wait safely in Needs Approval.",
  },
];

export function OperationsTour({
  isOpen,
  onClose,
  onNavigate,
  setActiveTab,
}: OperationsTourProps) {
  const [stepIdx, setStepIdx] = useState(0);

  if (!isOpen) return null;

  const current = TOUR_STEPS[stepIdx];

  const goTo = (nextIdx: number) => {
    setStepIdx(nextIdx);
    const dest = TOUR_STEPS[nextIdx].tab;
    if (onNavigate) onNavigate(dest);
    else if (setActiveTab) setActiveTab(dest);
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold">
          <Sparkles className="h-4 w-4 text-blue-400" />
          <span>
            Interactive Guide · Step {stepIdx + 1} of {TOUR_STEPS.length}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close tour"
          className="p-1 rounded hover:bg-slate-800 text-slate-300"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-5 space-y-2.5">
        <h3 className="text-sm font-bold text-slate-900">{current.title}</h3>
        <p className="text-xs font-semibold text-blue-700">{current.summary}</p>
        <p className="text-xs text-slate-600 leading-relaxed">{current.detail}</p>
      </div>

      <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
        <button
          type="button"
          disabled={stepIdx === 0}
          onClick={() => goTo(stepIdx - 1)}
          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 bg-white text-slate-700 disabled:opacity-40 flex items-center gap-1"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Prev
        </button>

        {stepIdx < TOUR_STEPS.length - 1 ? (
          <button
            type="button"
            onClick={() => goTo(stepIdx + 1)}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 flex items-center gap-1"
          >
            Next <ArrowRight className="h-3.5 w-3.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1"
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> Finish
          </button>
        )}
      </div>
    </div>
  );
}
