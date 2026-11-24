"use client";

import React, { useState } from "react";
import { api } from "@/lib/api/client";
import { SwarmBotAvatar } from "@/components/agents/SwarmBotAvatar";
import {
  AgentDefinition,
  AgentRunResult,
  OperationalException,
} from "@/types";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Clock,
  DollarSign,
  Play,
  RefreshCw,
  Sparkles,
} from "lucide-react";

interface AgentWorkbenchProps {
  selectedAgent: AgentDefinition;
  allAgents: AgentDefinition[];
  onSelectAgent: (agent: AgentDefinition) => void;
  exceptions: OperationalException[];
  onRefreshData?: () => void;
  onOpenTutorial: (agent: AgentDefinition) => void;
}

export function AgentWorkbench({
  selectedAgent,
  allAgents,
  onSelectAgent,
  exceptions,
  onRefreshData,
  onOpenTutorial,
}: AgentWorkbenchProps) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<AgentRunResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedExcId, setSelectedExcId] = useState<string>("");

  const relevantExceptions = exceptions.filter((e) =>
    selectedAgent.exception_types_handled.includes(e.exception_type),
  );

  const executeRun = async (params: {
    exception_id?: string;
    scenario_id?: string;
  }) => {
    setRunning(true);
    setErrorMsg(null);
    setResult(null);
    try {
      const res = await api.runAgent(selectedAgent.id, params);
      setResult(res);
      onRefreshData?.();
    } catch (err: any) {
      setErrorMsg(err.message || "Agent execution failed.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Compact Agent Switcher */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        {allAgents.map((ag) => {
          const active = ag.id === selectedAgent.id;
          return (
            <button
              key={ag.id}
              type="button"
              onClick={() => {
                onSelectAgent(ag);
                setResult(null);
                setErrorMsg(null);
                setSelectedExcId("");
              }}
              className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors ${
                active
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <SwarmBotAvatar
                agentId={ag.id}
                mood={active && running ? "scanning" : "happy"}
                size="xs"
              />
              <span>{ag.name}</span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                  active ? "bg-slate-700 text-slate-100" : "bg-white text-slate-600"
                }`}
              >
                {ag.code_name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Console Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Controls Column */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {selectedAgent.name} ({selectedAgent.code_name})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">{selectedAgent.title}</p>
            </div>
            <button
              type="button"
              onClick={() => onOpenTutorial(selectedAgent)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-1 shrink-0"
            >
              <BookOpen className="h-3.5 w-3.5" />
              Guide
            </button>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            {selectedAgent.simple_summary}
          </p>

          {/* Option A: Sample Scenario */}
          {selectedAgent.sample_scenarios && selectedAgent.sample_scenarios.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Option 1: Test with Manufacturing Scenario
              </p>
              <div className="space-y-2">
                {selectedAgent.sample_scenarios.map((sc) => (
                  <button
                    key={sc.scenario_id}
                    type="button"
                    disabled={running}
                    onClick={() => executeRun({ scenario_id: sc.scenario_id })}
                    className="w-full p-3 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 text-left transition-colors flex items-center justify-between gap-2 disabled:opacity-50"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{sc.title}</p>
                      <p className="text-[11px] text-slate-500 truncate">{sc.customer}</p>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-slate-900 text-white text-[11px] font-semibold flex items-center gap-1 shrink-0">
                      <Play className="h-3 w-3" /> Run
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Option B: Run against Live Exception */}
          <div className="space-y-2.5 pt-3 border-t border-slate-100">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Option 2: Run Against Live Plant Issue
            </p>
            {relevantExceptions.length > 0 ? (
              <div className="flex gap-2">
                <select
                  value={selectedExcId}
                  onChange={(e) => setSelectedExcId(e.target.value)}
                  className="flex-1 min-w-0 px-2.5 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value="">Select open issue...</option>
                  {relevantExceptions.map((exc) => (
                    <option key={exc.id} value={exc.id}>
                      {exc.title} (${(exc.discrepancy_amount || 0).toFixed(0)})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={running || !selectedExcId}
                  onClick={() => executeRun({ exception_id: selectedExcId })}
                  className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 shrink-0"
                >
                  Inspect
                </button>
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                No unmatched live exceptions for this specialization — use a scenario above or run
                general plant check below.
              </p>
            )}

            <button
              type="button"
              disabled={running}
              onClick={() => executeRun({})}
              className="w-full py-2 text-xs font-semibold rounded-lg border border-slate-300 text-slate-800 hover:bg-slate-50 flex items-center justify-center gap-1.5"
            >
              {running ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 text-blue-600" />
              )}
              {running ? "Executing..." : `Run Default ${selectedAgent.name} Check`}
            </button>
          </div>
        </div>

        {/* Results Column */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-5 shadow-sm min-h-[380px]">
          {errorMsg && (
            <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {running && (
            <div className="py-16 flex flex-col items-center justify-center text-slate-500 gap-3">
              <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
              <p className="text-xs font-medium">
                Running {selectedAgent.name} via Google Antigravity SDK...
              </p>
            </div>
          )}

          {!running && !result && !errorMsg && (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <Sparkles className="h-7 w-7 mx-auto opacity-60" />
              <p className="text-sm font-medium text-slate-600">
                Ready to run {selectedAgent.name}
              </p>
              <p className="text-xs max-w-md mx-auto">
                Pick a manufacturing test scenario or live plant discrepancy on the left to inspect
                findings, evidence citations, cost savings, and time saved.
              </p>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      {result.agent_name} Execution Complete
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      {result.verdict || "Verification & Audit Complete"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {(result.proposed_resolution?.proposed_amount !== undefined ||
                    result.kpis?.total_financial_leakage_usd !== undefined) && (
                    <span className="px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-1">
                      <DollarSign className="h-3.5 w-3.5" />
                      {(
                        result.proposed_resolution?.proposed_amount ??
                        result.kpis?.total_financial_leakage_usd ??
                        0
                      ).toLocaleString()}{" "}
                      Impact
                    </span>
                  )}
                  <span className="px-2.5 py-1 rounded-md bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-800 flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    ~{selectedAgent.time_saved_per_task_mins ?? 40} min saved
                  </span>
                </div>
              </div>

              {(result.root_cause_analysis ||
                result.dispute_rationale ||
                result.executive_summary) && (
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed">
                  {result.root_cause_analysis ||
                    result.dispute_rationale ||
                    result.executive_summary}
                </div>
              )}

              {result.proposed_resolution && (
                <div className="p-3.5 rounded-lg bg-emerald-50/70 border border-emerald-200 space-y-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                    Recommended Next Action
                  </p>
                  <p className="text-xs font-semibold text-slate-900">
                    {result.proposed_resolution.recommended_action}
                  </p>
                  <p className="text-xs text-slate-600">
                    {result.proposed_resolution.explanation}
                  </p>
                </div>
              )}

              {result.customer_resolution_letter && (
                <div className="space-y-1.5">
                  <p className="text-xs font-bold text-slate-700">
                    Drafted NCR / Quality Resolution Packet
                  </p>
                  <pre className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
                    {result.customer_resolution_letter}
                  </pre>
                </div>
              )}

              {(result.reasoning_steps || result.reasoning_chain) && (result.reasoning_steps || result.reasoning_chain || []).length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-bold text-slate-700">Audit Steps Checked</p>
                  <ul className="space-y-1">
                    {(result.reasoning_steps || result.reasoning_chain || []).map((step, i) => (
                      <li
                        key={i}
                        className="text-xs text-slate-600 flex items-start gap-2"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
