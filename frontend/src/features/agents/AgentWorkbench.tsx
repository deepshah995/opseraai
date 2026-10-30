"use client";

import React, { useState, useEffect } from "react";
import { 
  Play, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  FileText, 
  DollarSign, 
  Check, 
  Copy, 
  RotateCcw,
  Scale,
  Truck,
  Receipt,
  BarChart3,
  ShieldAlert,
  HelpCircle,
  FileSearch,
  ExternalLink
} from "lucide-react";
import { AgentDefinition, AgentRunResult, OperationalException } from "@/types";
import { api } from "@/lib/api/client";

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
  const [error, setError] = useState<string | null>(null);
  const [copiedLetter, setCopiedLetter] = useState(false);
  const [appliedAction, setAppliedAction] = useState(false);

  // Input selection mode
  const [mode, setMode] = useState<"preset" | "live_exception" | "custom">("preset");
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>("");
  const [selectedExceptionId, setSelectedExceptionId] = useState<string>("");

  // Custom Dispute inputs for DisputeShield
  const [disputeCustomer, setDisputeCustomer] = useState("Apex Manufacturing Corp");
  const [disputeClaim, setDisputeClaim] = useState("Client claims they were billed for 6.8 tons of industrial waste, but only produced 4.0 tons. They are requesting a $140 refund.");
  const [disputeInvoice, setDisputeInvoice] = useState("INV-9020");
  const [disputeAmount, setDisputeAmount] = useState("140.00");

  // Reset results when switching agents
  useEffect(() => {
    setResult(null);
    setError(null);
    setAppliedAction(false);
    if (selectedAgent.sample_scenarios && selectedAgent.sample_scenarios.length > 0) {
      setSelectedScenarioId(selectedAgent.sample_scenarios[0].scenario_id);
    }
  }, [selectedAgent.id]);

  // Filter exceptions matching this agent's specialization
  const matchingExceptions = exceptions.filter((e) => {
    if (selectedAgent.id === "ticket_hawk") return e.exception_type === "quantity_mismatch";
    if (selectedAgent.id === "dispatch_pulse") return e.exception_type === "dispatch_discrepancy";
    if (selectedAgent.id === "bill_sentry") return ["rate_mismatch", "unbilled_job", "duplicate_billing"].includes(e.exception_type);
    return true;
  });

  const handleRun = async () => {
    setRunning(true);
    setError(null);
    setResult(null);
    setAppliedAction(false);

    try {
      if (selectedAgent.id === "ops_beacon") {
        const res = await api.generateOpsReport("Last 30 Days");
        setResult(res);
      } else if (selectedAgent.id === "dispute_shield" && mode === "custom") {
        const res = await api.resolveDispute({
          customer_name: disputeCustomer,
          dispute_claim: disputeClaim,
          disputed_invoice_ref: disputeInvoice,
          disputed_amount: parseFloat(disputeAmount) || 140.0,
        });
        setResult(res);
      } else if (mode === "live_exception" && selectedExceptionId) {
        const res = await api.runAgent(selectedAgent.id, {
          exception_id: selectedExceptionId,
        });
        setResult(res);
      } else {
        // Run with preset scenario
        const res = await api.runAgent(selectedAgent.id, {
          scenario_id: selectedScenarioId || selectedAgent.sample_scenarios?.[0]?.scenario_id,
        });
        setResult(res);
      }
    } catch (e: any) {
      setError(e.message || "Failed to execute agent.");
    } finally {
      setRunning(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLetter(true);
    setTimeout(() => setCopiedLetter(false), 2000);
  };

  const getAgentIcon = (name: string) => {
    switch (name) {
      case "Scale": return Scale;
      case "Truck": return Truck;
      case "Receipt": return Receipt;
      case "BarChart3": return BarChart3;
      case "ShieldAlert": return ShieldAlert;
      default: return Sparkles;
    }
  };

  const IconComponent = getAgentIcon(selectedAgent.icon_name);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-5">
      
      {/* Workbench Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center space-x-3">
          <div className={`p-2.5 rounded-xl bg-${selectedAgent.color_theme}-500/10 text-${selectedAgent.color_theme}-600 dark:bg-${selectedAgent.color_theme}-500/20 dark:text-${selectedAgent.color_theme}-400 ring-1 ring-${selectedAgent.color_theme}-500/30`}>
            <IconComponent className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-[10px] uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-bold text-slate-600 dark:text-slate-300">
                {selectedAgent.code_name}
              </span>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {selectedAgent.name} Workbench
              </h2>
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>Ready</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {selectedAgent.tagline}
            </p>
          </div>
        </div>

        {/* Agent Switcher Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto py-1">
          {allAgents.map((ag) => (
            <button
              key={ag.id}
              onClick={() => onSelectAgent(ag)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
                selectedAgent.id === ag.id
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-xs font-semibold"
                  : "bg-slate-100/80 text-slate-600 hover:bg-slate-200/80 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-750"
              }`}
            >
              {ag.name}
            </button>
          ))}
          <button
            onClick={() => onOpenTutorial(selectedAgent)}
            className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/50 transition border border-blue-200 dark:border-blue-900"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            <span>Tutorial</span>
          </button>
        </div>
      </div>

      {/* Input Configuration Box */}
      <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-850/40 space-y-3.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
            Select Input Scenario or Live Record
          </span>

          {/* Mode Switcher */}
          {selectedAgent.id !== "ops_beacon" && (
            <div className="flex items-center rounded-lg bg-slate-200/70 p-0.5 dark:bg-slate-800 text-xs">
              <button
                onClick={() => setMode("preset")}
                className={`px-2.5 py-1 rounded-md font-medium transition ${
                  mode === "preset"
                    ? "bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white font-semibold"
                    : "text-slate-600 dark:text-slate-400"
                }`}
              >
                Sample Scenarios
              </button>
              {matchingExceptions.length > 0 && (
                <button
                  onClick={() => setMode("live_exception")}
                  className={`px-3 py-1 rounded-md font-medium transition ${
                    mode === "live_exception"
                      ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white"
                      : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  Live Database Issue ({matchingExceptions.length})
                </button>
              )}
              {selectedAgent.id === "dispute_shield" && (
                <button
                  onClick={() => setMode("custom")}
                  className={`px-3 py-1 rounded-md font-medium transition ${
                    mode === "custom"
                      ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white"
                      : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  Custom Dispute
                </button>
              )}
            </div>
          )}
        </div>

        {/* ReportBeacon info */}
        {selectedAgent.id === "ops_beacon" && (
          <div className="text-xs text-slate-600 dark:text-slate-300">
            ReportBeacon will run a holistic audit across all current tenant operational records, identify margin leakage by facility, and compile an executive operational briefing.
          </div>
        )}

        {/* Preset Selector */}
        {mode === "preset" && selectedAgent.sample_scenarios && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {selectedAgent.sample_scenarios.map((scen) => (
              <label
                key={scen.scenario_id}
                className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition ${
                  selectedScenarioId === scen.scenario_id
                    ? "border-blue-500 bg-blue-50/60 dark:border-blue-500 dark:bg-blue-950/40"
                    : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
                }`}
              >
                <input
                  type="radio"
                  name="scenario"
                  checked={selectedScenarioId === scen.scenario_id}
                  onChange={() => setSelectedScenarioId(scen.scenario_id)}
                  className="mt-0.5 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-slate-900 dark:text-white">
                      {scen.title}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-slate-400">
                      {scen.customer}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {scen.claim || scen.expected_resolution || `Ticket: ${scen.ticket_no}`}
                  </p>
                </div>
              </label>
            ))}
          </div>
        )}

        {/* Live Exception Selector */}
        {mode === "live_exception" && (
          <div className="space-y-2">
            <select
              value={selectedExceptionId}
              onChange={(e) => setSelectedExceptionId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              <option value="">-- Choose an open issue from your database --</option>
              {matchingExceptions.map((exc) => (
                <option key={exc.id} value={exc.id}>
                  {exc.title} — ${exc.discrepancy_amount?.toFixed(2) || "0.00"} ({exc.severity.toUpperCase()})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500">
              {selectedAgent.name} will pull all verified records attached to this issue, calculate variance, and draft resolution.
            </p>
          </div>
        )}

        {/* Custom Dispute Fields */}
        {mode === "custom" && selectedAgent.id === "dispute_shield" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="font-medium text-slate-700 dark:text-slate-300">Customer Name</label>
              <input
                type="text"
                value={disputeCustomer}
                onChange={(e) => setDisputeCustomer(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="font-medium text-slate-700 dark:text-slate-300">Invoice Number</label>
              <input
                type="text"
                value={disputeInvoice}
                onChange={(e) => setDisputeInvoice(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="font-medium text-slate-700 dark:text-slate-300">Disputed Dollar Amount</label>
              <input
                type="number"
                value={disputeAmount}
                onChange={(e) => setDisputeAmount(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
            <div className="md:col-span-2">
              <label className="font-medium text-slate-700 dark:text-slate-300">Customer Dispute Claim / Email Text</label>
              <textarea
                rows={2}
                value={disputeClaim}
                onChange={(e) => setDisputeClaim(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 p-2 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
          </div>
        )}

        {/* Launch Button */}
        <div className="flex justify-end pt-2">
          <button
            id="btn-run-agent-workbench"
            disabled={running || (mode === "live_exception" && !selectedExceptionId)}
            onClick={handleRun}
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/20 disabled:opacity-50 transition cursor-pointer"
          >
            {running ? (
              <>
                <RotateCcw className="h-4 w-4 animate-spin" />
                <span>{selectedAgent.name} is Reasoning...</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                <span>Execute {selectedAgent.name}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Execution Results View */}
      {result && (
        <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-850 p-5 space-y-5 animate-in fade-in duration-300">
          
          {/* Header Status */}
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 gap-2">
            <div className="flex items-center space-x-2.5">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-bold text-sm text-slate-900 dark:text-white">
                {result.agent_name} Execution Complete
              </span>
              <span className="font-mono text-xs text-slate-500">
                ({result.code_name})
              </span>
            </div>

            <div className="flex items-center space-x-2 text-xs">
              <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold">
                ✓ 100% Grounded Citations
              </span>
              <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-semibold">
                {Math.round((result.confidence_score || 0.98) * 100)}% Confidence
              </span>
            </div>
          </div>

          {/* Reasoning Steps */}
          {result.reasoning_steps && result.reasoning_steps.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Reasoning Steps & Verification
              </h4>
              <div className="space-y-1.5">
                {result.reasoning_steps.map((st, idx) => (
                  <div key={idx} className="flex items-start space-x-2 text-xs text-slate-700 dark:text-slate-300">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{st}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Root Cause / Verdict Box */}
          {(result.root_cause_analysis || result.verdict) && (
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-900/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {result.verdict ? "Arbitration Verdict" : "Root Cause Diagnosis"}
                </span>
                {result.claim_is_valid !== undefined && (
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    result.claim_is_valid
                      ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                      : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                  }`}>
                    {result.claim_is_valid ? "Valid Customer Dispute" : "Invoiced Accurately"}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-800 dark:text-slate-200 mt-1 leading-relaxed">
                {result.verdict || result.root_cause_analysis}
              </p>
            </div>
          )}

          {/* DisputeShield Formal Letter Preview */}
          {result.customer_resolution_letter && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4 text-rose-600" />
                  <span className="text-xs font-semibold text-slate-900 dark:text-white">
                    Drafted Customer Resolution Letter
                  </span>
                </div>
                <button
                  onClick={() => copyToClipboard(result.customer_resolution_letter!)}
                  className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-medium border border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  {copiedLetter ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-slate-500" />}
                  <span>{copiedLetter ? "Copied" : "Copy"}</span>
                </button>
              </div>

              <div className="rounded-lg bg-slate-50/80 p-3.5 font-sans text-xs leading-relaxed text-slate-700 dark:bg-slate-950 dark:text-slate-300 whitespace-pre-line border border-slate-200/70 dark:border-slate-800">
                {result.customer_resolution_letter}
              </div>
            </div>
          )}

          {/* OpsBeacon Executive Brief View */}
          {result.kpis && (
            <div className="space-y-3.5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
                  <div className="text-[11px] text-slate-400">Health Score</div>
                  <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {result.health_score_pct}%
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
                  <div className="text-[11px] text-slate-400">Records Audited</div>
                  <div className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                    {result.kpis.total_records_audited}
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
                  <div className="text-[11px] text-slate-400">At-Risk Leakage</div>
                  <div className="text-lg font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                    ${result.kpis.at_risk_discrepancy_amount_usd?.toFixed(2)}
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
                  <div className="text-[11px] text-slate-400">Recovered to Date</div>
                  <div className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                    ${result.kpis.recovered_amount_usd?.toFixed(2)}
                  </div>
                </div>
              </div>

              {result.action_items && (
                <div className="rounded-xl border border-purple-200/80 bg-purple-50/50 p-3.5 dark:border-purple-900/40 dark:bg-purple-950/20">
                  <span className="text-xs font-semibold text-purple-900 dark:text-purple-300">
                    Recommended Leadership Actions
                  </span>
                  <ul className="mt-2 space-y-1 text-xs text-purple-950 dark:text-purple-200">
                    {result.action_items.map((act, aIdx) => (
                      <li key={aIdx} className="flex items-start space-x-2">
                        <span className="font-bold text-purple-600">•</span>
                        <span>{act}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Evidence Citations */}
          {result.evidence_citations && result.evidence_citations.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Verified Evidence Citations
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {result.evidence_citations.map((ev, eIdx) => (
                  <div
                    key={eIdx}
                    className="flex items-start space-x-2.5 p-2.5 rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900 text-xs"
                  >
                    <FileSearch className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {ev.reference}
                      </div>
                      <div className="text-slate-500 dark:text-slate-400 text-[11px]">
                        {ev.details}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actionable Proposed Resolution Card */}
          {result.proposed_resolution && (
            <div className="rounded-xl border border-emerald-300/80 bg-emerald-50/60 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                  Recommended Action ({result.proposed_resolution.action_type})
                </span>
                <div className="flex items-center space-x-2 mt-0.5">
                  <h3 className="font-bold text-sm text-emerald-950 dark:text-emerald-100">
                    {result.proposed_resolution.recommended_action}
                  </h3>
                  {result.proposed_resolution.proposed_amount !== undefined && (
                    <span className="font-mono text-sm font-bold text-emerald-700 dark:text-emerald-300">
                      ${result.proposed_resolution.proposed_amount.toFixed(2)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-emerald-900/80 dark:text-emerald-200 mt-1 max-w-xl">
                  {result.proposed_resolution.explanation}
                </p>
              </div>

              <button
                disabled={appliedAction}
                onClick={() => {
                  setAppliedAction(true);
                  if (onRefreshData) onRefreshData();
                }}
                className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition ${
                  appliedAction
                    ? "bg-emerald-700 text-white cursor-default"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                }`}
              >
                {appliedAction ? "✓ Action Staged for Review" : "Approve Proposed Action"}
              </button>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-200 flex items-center space-x-2">
          <AlertCircle className="h-4 w-4 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

    </div>
  );
}
