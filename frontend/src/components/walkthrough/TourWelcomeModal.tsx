"use client";

import React from "react";
import {
  BookOpen,
  FileSpreadsheet,
  GitBranch,
  Play,
  Sparkles,
  X,
} from "lucide-react";

interface TourWelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartTour: () => void;
}

export function TourWelcomeModal({
  isOpen,
  onClose,
  onStartTour,
}: TourWelcomeModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-blue-700">
            <Sparkles className="h-4 w-4" />
            Opsera Manufacturing Swarm · Quick Tour
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close welcome modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <h2 className="text-lg font-bold text-slate-900">
            Welcome to Your Manufacturing Agent Swarm
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Built with the Google Antigravity SDK to find cost leaks, reclaim engineering &amp;
            finance hours, and connect directly with your plant&apos;s tools.
          </p>

          <div className="space-y-2.5 text-xs">
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 flex items-start gap-3">
              <FileSpreadsheet className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-bold text-slate-900">Google Sheets, Docs &amp; ERP Sync</p>
                <p className="text-slate-600 mt-0.5">
                  Import receiving scale slips, POs, and work orders, or export cost savings and
                  supplier NCR briefs automatically.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 flex items-start gap-3">
              <GitBranch className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-bold text-slate-900">Drag &amp; Drop Swarm Builder</p>
                <p className="text-slate-600 mt-0.5">
                  Customize workflows visually across BOMGuard, CostSentry, LinePulse,
                  QualityShield, and PlantBeacon with a $500 manager gate.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 flex items-start gap-3">
              <BookOpen className="h-4 w-4 text-indigo-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-bold text-slate-900">Dedicated How It Works Guide</p>
                <p className="text-slate-600 mt-0.5">
                  Read a plain-English breakdown of each agent&apos;s ROI or run a safe preview
                  simulation anytime from the left sidebar.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-50"
          >
            Dismiss
          </button>
          <button
            type="button"
            onClick={onStartTour}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 hover:bg-slate-800 text-white flex items-center gap-1.5"
          >
            <Play className="h-3.5 w-3.5" />
            Take Guided Tour
          </button>
        </div>
      </div>
    </div>
  );
}
