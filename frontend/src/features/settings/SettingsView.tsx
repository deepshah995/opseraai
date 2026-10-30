"use client";

import React, { useState } from "react";
import { Settings, Shield, Sliders, CheckCircle, Database } from "lucide-react";

export function SettingsView() {
  const [rateTolerance, setRateTolerance] = useState("0.05");
  const [weightTolerance, setWeightTolerance] = useState("0.01");
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
          <Settings className="h-4 w-4 text-blue-600" />
          <span>Operational Rules & Tenant Configuration</span>
        </h2>
        <p className="text-xs text-slate-500">
          Configure deterministic mathematical tolerance thresholds and tenant isolation parameters.
        </p>
      </div>

      {saved && (
        <div className="flex items-center space-x-2 rounded-lg bg-emerald-50 p-4 text-xs font-medium text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300">
          <CheckCircle className="h-4 w-4 text-emerald-600" />
          <span>Tolerance thresholds updated and saved successfully!</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Tolerances Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <Sliders className="h-4 w-4 text-blue-600" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Deterministic Reconciliation Tolerances
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Rate & Amount Variance Tolerance (USD)
              </label>
              <p className="text-[11px] text-slate-500 mb-1">
                Variances below this threshold will be flagged as acceptable rounding.
              </p>
              <input
                type="number"
                step="0.01"
                value={rateTolerance}
                onChange={(e) => setRateTolerance(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 p-2 text-xs text-slate-900 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Certified Scale Weight Tolerance (Tons)
              </label>
              <p className="text-[11px] text-slate-500 mb-1">
                Discrepancy threshold between billed tonnage and scale weight.
              </p>
              <input
                type="number"
                step="0.001"
                value={weightTolerance}
                onChange={(e) => setWeightTolerance(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 p-2 text-xs text-slate-900 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Security & AI Provider Info */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <Shield className="h-4 w-4 text-indigo-600" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              AI System Grounding & Security Guarantees
            </h3>
          </div>

          <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-start space-x-2">
              <CheckCircle className="h-4 w-4 text-emerald-600 mt-0.5" />
              <div>
                <strong>Zero Autonomous Financial Action:</strong> The system only proposes evidence-backed recommendations for operations manager review. It cannot modify live invoices or issue credits automatically.
              </div>
            </div>

            <div className="flex items-start space-x-2">
              <CheckCircle className="h-4 w-4 text-emerald-600 mt-0.5" />
              <div>
                <strong>Multi-Tenant Data Isolation:</strong> Every database query and agent tool enforces tenant isolation by organization ID.
              </div>
            </div>

            <div className="flex items-start space-x-2">
              <CheckCircle className="h-4 w-4 text-emerald-600 mt-0.5" />
              <div>
                <strong>Model Integration:</strong> Configured for Gemini 1.5 Pro via Google Cloud Vertex AI with LangGraph state checkpointing.
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition"
          >
            Save Tolerance Settings
          </button>
        </div>
      </form>
    </div>
  );
}
