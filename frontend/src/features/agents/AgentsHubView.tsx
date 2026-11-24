"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import {
  AgentDefinition,
  AnalyticsSummary,
  BatchResolutionResponse,
  OperationalException,
} from "@/types";
import { AgentFleetStudio } from "./AgentFleetStudio";
import { SwarmBuilderView } from "./SwarmBuilderView";
import { AgentWorkbench } from "./AgentWorkbench";
import { AgentTutorialModal } from "./AgentTutorialModal";
import {
  Bot,
  CheckCircle2,
  Clock,
  DollarSign,
  GitBranch,
  Play,
  RefreshCw,
  Terminal,
} from "lucide-react";

interface AgentsHubViewProps {
  summary: AnalyticsSummary | null;
  exceptions: OperationalException[];
  onRefreshData?: () => void;
  onSelectException?: (id: string) => void;
  initialSelectedAgentId?: string;
  initialTab?: "fleet" | "studio" | "builder" | "workbench";
  onNavigateToReports?: () => void;
  onNavigateTab?: (tab: string) => void;
}

export function AgentsHubView({
  summary,
  exceptions,
  onRefreshData,
  initialSelectedAgentId,
  initialTab = "studio",
  onNavigateToReports,
  onNavigateTab,
}: AgentsHubViewProps) {
  const [agents, setAgents] = useState<AgentDefinition[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<AgentDefinition | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<"studio" | "builder" | "workbench">(
    initialTab === "builder"
      ? "builder"
      : initialTab === "workbench"
        ? "workbench"
        : "studio",
  );
  const [loading, setLoading] = useState(true);
  const [tutorialAgent, setTutorialAgent] = useState<AgentDefinition | null>(null);

  const [batchRunning, setBatchRunning] = useState(false);
  const [batchSummary, setBatchSummary] = useState<BatchResolutionResponse | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  useEffect(() => {
    if (initialTab === "builder") {
      setActiveSubTab("builder");
    } else if (initialTab === "workbench") {
      setActiveSubTab("workbench");
    } else {
      setActiveSubTab("studio");
    }
  }, [initialTab]);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const list = await api.listAgents();
      setAgents(list);
      const preferred =
        (initialSelectedAgentId
          ? list.find((a) => a.id === initialSelectedAgentId)
          : null) || list[0] || null;
      setSelectedAgent(preferred);
    } catch (err: any) {
      setErrorBanner(err.message || "Failed to load agents.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const handleBatchResolve = async () => {
    setBatchRunning(true);
    setErrorBanner(null);
    try {
      const res = await api.resolveBatchExceptions();
      setBatchSummary(res);
      await fetchAgents();
      onRefreshData?.();
    } catch (err: any) {
      setErrorBanner(err.message || "Batch resolution failed.");
    } finally {
      setBatchRunning(false);
    }
  };

  const openSavings =
    summary?.cost_savings_identified_usd ?? summary?.at_risk_discrepancy_amount ?? 0;
  const capturedSavings = summary?.cost_savings_captured_usd ?? 0;
  const hoursSaved = summary?.hours_saved_mtd ?? 0;

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Clean Header Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Manufacturing Swarm Studio
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Operate your 5 specialized manufacturing agents, chat with live plant records, or
            design custom drag-and-drop orchestrations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="hidden sm:flex items-center gap-4 px-3.5 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs">
            <span className="flex items-center gap-1 font-semibold text-emerald-700">
              <DollarSign className="h-3.5 w-3.5" />
              ${openSavings.toLocaleString()} Identified
            </span>
            <span className="text-slate-300">|</span>
            <span className="font-semibold text-slate-700">
              ${capturedSavings.toLocaleString()} Captured
            </span>
            <span className="text-slate-300">|</span>
            <span className="flex items-center gap-1 font-semibold text-blue-700">
              <Clock className="h-3.5 w-3.5" />
              {hoursSaved} hrs saved
            </span>
          </div>

          <button
            type="button"
            onClick={handleBatchResolve}
            disabled={batchRunning}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 hover:bg-slate-800 text-white disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
          >
            {batchRunning ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
            {batchRunning ? "Running Auto-Audit..." : "Auto-Resolve Low-Risk Issues"}
          </button>
        </div>
      </div>

      {/* Inline Batch Feedback */}
      {batchSummary && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs text-emerald-900">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>
              Processed <strong>{batchSummary.processed_count}</strong> plant exceptions:{" "}
              <strong>{batchSummary.auto_resolved}</strong> auto-settled (&lt;$500),{" "}
              <strong>{batchSummary.awaiting_approval}</strong> staged for manager approval, saving{" "}
              <strong>${batchSummary.total_recovered_usd.toLocaleString()}</strong>
              {batchSummary.total_hours_saved
                ? ` and ${batchSummary.total_hours_saved} hours`
                : ""}.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setBatchSummary(null)}
            className="text-emerald-700 font-semibold underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {errorBanner && (
        <div className="bg-rose-50 border border-rose-200 rounded-lg px-4 py-2.5 text-xs text-rose-800">
          {errorBanner}
        </div>
      )}

      {/* Clean 3-Tab Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveSubTab("studio")}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors ${
            activeSubTab === "studio"
              ? "bg-slate-900 text-white"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          <Bot className="h-3.5 w-3.5" />
          Swarm Overview &amp; Chat
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("builder")}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors ${
            activeSubTab === "builder"
              ? "bg-slate-900 text-white"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          <GitBranch className="h-3.5 w-3.5" />
          Drag &amp; Drop Builder
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("workbench")}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors ${
            activeSubTab === "workbench"
              ? "bg-slate-900 text-white"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          <Terminal className="h-3.5 w-3.5" />
          Agent Test Console
        </button>
      </div>

      {/* Tab Bodies */}
      {loading && activeSubTab !== "builder" ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-xs text-slate-400">
          Loading Manufacturing Swarm...
        </div>
      ) : (
        <>
          {activeSubTab === "studio" && (
            <AgentFleetStudio
              agents={agents}
              onOpenTutorial={(ag) => setTutorialAgent(ag)}
              onLaunchConsole={(ag) => {
                setSelectedAgent(ag);
                setActiveSubTab("workbench");
              }}
              onNavigateToReports={onNavigateToReports}
            />
          )}

          {activeSubTab === "builder" && (
            <SwarmBuilderView onNavigateTab={onNavigateTab} />
          )}

          {activeSubTab === "workbench" && selectedAgent && (
            <AgentWorkbench
              selectedAgent={selectedAgent}
              allAgents={agents}
              onSelectAgent={(ag) => setSelectedAgent(ag)}
              exceptions={exceptions}
              onRefreshData={onRefreshData}
              onOpenTutorial={(ag) => setTutorialAgent(ag)}
            />
          )}
        </>
      )}

      <AgentTutorialModal
        isOpen={tutorialAgent !== null}
        agent={tutorialAgent}
        onClose={() => setTutorialAgent(null)}
        onRunInWorkbench={(agentId) => {
          const found = agents.find((a) => a.id === agentId);
          if (found) setSelectedAgent(found);
          setActiveSubTab("workbench");
        }}
      />
    </div>
  );
}
