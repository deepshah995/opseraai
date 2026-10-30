"use client";

import React, { useState, useEffect } from "react";
import { 
  Bot, 
  Sparkles, 
  Play, 
  BookOpen, 
  ArrowRight, 
  Scale, 
  Truck, 
  Receipt, 
  BarChart3, 
  ShieldAlert,
  RotateCcw,
  Layers,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  Clock,
  ChevronRight,
  Zap
} from "lucide-react";
import { AgentDefinition, OperationalException, AnalyticsSummary } from "@/types";
import { api } from "@/lib/api/client";
import { AgentWorkbench } from "./AgentWorkbench";
import { AgentTutorialModal } from "./AgentTutorialModal";
import { AgentFleetStudio } from "./AgentFleetStudio";

interface AgentsHubViewProps {
  summary: AnalyticsSummary | null;
  exceptions: OperationalException[];
  onRefreshData?: () => void;
  onSelectException?: (id: string) => void;
  initialSelectedAgentId?: string;
  initialTab?: "fleet" | "studio" | "workbench";
  onNavigateToReports?: () => void;
}

export function AgentsHubView({
  summary,
  exceptions,
  onRefreshData,
  onSelectException,
  initialSelectedAgentId,
  initialTab,
  onNavigateToReports,
}: AgentsHubViewProps) {
  const [agents, setAgents] = useState<AgentDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<AgentDefinition | null>(null);
  const [activeTab, setActiveTab] = useState<"fleet" | "studio" | "workbench">(
    initialTab || (initialSelectedAgentId ? "workbench" : "fleet")
  );

  // Tutorial Modal State
  const [tutorialAgent, setTutorialAgent] = useState<AgentDefinition | null>(null);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      setLoading(true);
      const res = await api.listAgents();
      setAgents(res);
      if (res.length > 0) {
        if (initialSelectedAgentId) {
          const found = res.find((a) => a.id === initialSelectedAgentId);
          setSelectedAgent(found || res[0]);
        } else if (!selectedAgent) {
          setSelectedAgent(res[0]);
        }
      }
    } catch (e) {
      console.error("Failed to load agents:", e);
    } finally {
      setLoading(false);
    }
  };

  const getAgentIcon = (name: string) => {
    switch (name) {
      case "Scale": return Scale;
      case "Truck": return Truck;
      case "Receipt": return Receipt;
      case "BarChart3": return BarChart3;
      case "ShieldAlert": return ShieldAlert;
      case "Zap": return Zap;
      default: return Sparkles;
    }
  };

  const getColorClasses = (color: string) => {
    switch (color) {
      case "cyan":
        return {
          bg: "bg-cyan-500/10 dark:bg-cyan-500/20",
          text: "text-cyan-600 dark:text-cyan-400",
          ring: "ring-cyan-500/30",
          borderHover: "hover:border-cyan-300 dark:hover:border-cyan-700",
          badge: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800",
        };
      case "emerald":
        return {
          bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
          text: "text-emerald-600 dark:text-emerald-400",
          ring: "ring-emerald-500/30",
          borderHover: "hover:border-emerald-300 dark:hover:border-emerald-700",
          badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
        };
      case "blue":
        return {
          bg: "bg-blue-500/10 dark:bg-blue-500/20",
          text: "text-blue-600 dark:text-blue-400",
          ring: "ring-blue-500/30",
          borderHover: "hover:border-blue-300 dark:hover:border-blue-700",
          badge: "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800",
        };
      case "amber":
        return {
          bg: "bg-amber-500/10 dark:bg-amber-500/20",
          text: "text-amber-600 dark:text-amber-400",
          ring: "ring-amber-500/30",
          borderHover: "hover:border-amber-300 dark:hover:border-amber-700",
          badge: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800",
        };
      case "purple":
        return {
          bg: "bg-purple-500/10 dark:bg-purple-500/20",
          text: "text-purple-600 dark:text-purple-400",
          ring: "ring-purple-500/30",
          borderHover: "hover:border-purple-300 dark:hover:border-purple-700",
          badge: "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800",
        };
      case "rose":
      default:
        return {
          bg: "bg-rose-500/10 dark:bg-rose-500/20",
          text: "text-rose-600 dark:text-rose-400",
          ring: "ring-rose-500/30",
          borderHover: "hover:border-rose-300 dark:hover:border-rose-700",
          badge: "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800",
        };
    }
  };

  const handleOpenTutorial = (agent: AgentDefinition) => {
    setTutorialAgent(agent);
    setIsTutorialOpen(true);
  };

  const handleLaunchAgent = (agent: AgentDefinition) => {
    setSelectedAgent(agent);
    setActiveTab("workbench");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-12">
      
      {/* Crisp Executive Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              AI Operations Fleet
            </h1>
            <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>5 Agents Active</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Specialized autonomous agents monitoring ticket weights, dispatch, billing rates, and customer disputes.
          </p>
        </div>

        {/* View Switcher & Actions */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100/80 p-0.5 dark:border-slate-800 dark:bg-slate-800/80 text-xs font-medium">
            <button
              id="btn-fleet-overview"
              onClick={() => setActiveTab("fleet")}
              className={`flex items-center space-x-1.5 rounded-md px-3 py-1.5 transition ${
                activeTab === "fleet"
                  ? "bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white font-semibold"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Fleet Overview</span>
            </button>
            <button
              id="btn-agent-studio"
              onClick={() => setActiveTab("studio")}
              className={`flex items-center space-x-1.5 rounded-md px-3 py-1.5 transition ${
                activeTab === "studio"
                  ? "bg-white text-blue-700 shadow-xs dark:bg-slate-900 dark:text-blue-300 font-bold"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <Bot className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>Agent Live Studio</span>
            </button>
            <button
              id="btn-agent-workbench"
              onClick={() => setActiveTab("workbench")}
              className={`flex items-center space-x-1.5 rounded-md px-3 py-1.5 transition ${
                activeTab === "workbench"
                  ? "bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white font-semibold"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Console {selectedAgent ? `(${selectedAgent.name})` : ""}</span>
            </button>
          </div>

          <button
            id="btn-agent-tutorials"
            onClick={() => {
              if (agents.length > 0) handleOpenTutorial(selectedAgent || agents[0]);
            }}
            className="inline-flex items-center space-x-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200 transition"
          >
            <BookOpen className="h-3.5 w-3.5 text-slate-500" />
            <span>Tutorials</span>
          </button>

          <button
            onClick={loadAgents}
            title="Refresh Fleet Status"
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 shadow-xs transition"
          >
            <RotateCcw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* COMBINED VIEW: Cartoon Bots First Thing, Followed by Fleet Specifications */}
      {activeTab === "fleet" && (
        <div className="space-y-8">
          {/* 1. CARTOON BOTS ARE THE FIRST THING SEEN */}
          <AgentFleetStudio
            agents={agents}
            onLaunchConsole={(ag) => {
              setSelectedAgent(ag);
              setActiveTab("workbench");
            }}
            onOpenTutorial={(ag) => handleOpenTutorial(ag)}
            onNavigateToReports={onNavigateToReports}
          />

          {/* 2. DIRECTLY BELOW: FLEET SPECIFICATIONS & GOVERNANCE */}
          <div className="space-y-4 pt-6 border-t border-slate-200/80 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <Layers className="h-4 w-4 text-blue-600" />
                  <span>Agent Fleet Specifications & Live Metrics</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Detailed capabilities, ground accuracy, and direct console access for all 5 specialized operations agents.
                </p>
              </div>
            </div>

            {/* Lightweight Status Pills Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="flex items-center space-x-3 rounded-xl border border-slate-200/80 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <div className="h-2 w-2 rounded-full bg-blue-500" />
                <div>
                  <div className="text-[11px] text-slate-400 dark:text-slate-500">Records Monitored</div>
                  <div className="text-sm font-bold font-mono text-slate-900 dark:text-white mt-0.5">
                    {summary?.total_records || 142} hauls
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3 rounded-xl border border-slate-200/80 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <div className="h-2 w-2 rounded-full bg-rose-500" />
                <div>
                  <div className="text-[11px] text-slate-400 dark:text-slate-500">At-Risk Protected</div>
                  <div className="text-sm font-bold font-mono text-rose-600 dark:text-rose-400 mt-0.5">
                    ${summary?.at_risk_discrepancy_amount?.toFixed(2) || "1,115.00"}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3 rounded-xl border border-slate-200/80 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <div>
                  <div className="text-[11px] text-slate-400 dark:text-slate-500">Accuracy Verified</div>
                  <div className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                    99.4% Grounded
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3 rounded-xl border border-slate-200/80 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <div className="h-2 w-2 rounded-full bg-cyan-500" />
                <div>
                  <div className="text-[11px] text-slate-400 dark:text-slate-500">Resolution Speed</div>
                  <div className="text-sm font-bold font-mono text-cyan-600 dark:text-cyan-400 mt-0.5">
                    1.2 seconds
                  </div>
                </div>
              </div>
            </div>

            {/* Clean, Breathable Agent Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {agents.map((agent) => {
                const Icon = getAgentIcon(agent.icon_name);
                const colors = getColorClasses(agent.color_theme);
                const isSelected = selectedAgent?.id === agent.id;

                return (
                  <div
                    key={agent.id}
                    className={`group relative flex flex-col justify-between rounded-xl border bg-white p-4 transition-all duration-150 shadow-xs dark:bg-slate-900 ${
                      isSelected
                        ? "border-blue-500 ring-1 ring-blue-500/20"
                        : `border-slate-200 dark:border-slate-800 ${colors.borderHover}`
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Top Row: Icon, Name, Category */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg ${colors.bg} ${colors.text} ring-1 ${colors.ring}`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-1.5">
                              <h3 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-blue-600 transition">
                                {agent.name}
                              </h3>
                              <span className="font-mono text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                {agent.code_name}
                              </span>
                            </div>
                            <span className={`inline-block mt-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${colors.badge}`}>
                              {agent.category}
                            </span>
                          </div>
                        </div>

                        <span className="inline-flex items-center space-x-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          <span>Ready</span>
                        </span>
                      </div>

                      {/* Clean 1-2 Line Summary (Tagline) */}
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                        {agent.tagline}
                      </p>

                      {/* Subtle Stat Chips */}
                      <div className="flex items-center gap-2 pt-1">
                        <span className="inline-flex items-center text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 px-2 py-1 rounded-md">
                          Accuracy: <strong className="ml-1 text-slate-800 dark:text-slate-200 font-mono">{agent.key_metrics.accuracy_rate}</strong>
                        </span>
                        <span className="inline-flex items-center text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 px-2 py-1 rounded-md truncate max-w-[150px]">
                          <strong className="text-slate-800 dark:text-slate-200 truncate">{agent.key_metrics.recovered_leakage_mtd || agent.key_metrics.revenue_leakage_prevented || "Active"}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Bottom Action Row */}
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                      <button
                        onClick={() => handleOpenTutorial(agent)}
                        className="inline-flex items-center space-x-1 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition"
                      >
                        <BookOpen className="h-3.5 w-3.5" />
                        <span>Tutorial</span>
                      </button>

                      {agent.id === "ops_beacon" && onNavigateToReports ? (
                        <button
                          onClick={onNavigateToReports}
                          className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white shadow-xs transition"
                        >
                          <BarChart3 className="h-3.5 w-3.5" />
                          <span>View Report Console</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleLaunchAgent(agent)}
                          className={`inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                            isSelected
                              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950"
                              : "bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                          }`}
                        >
                          <span>Open Console</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: Backwards compatibility if studio tab is requested directly */}
      {activeTab === "studio" && (
        <AgentFleetStudio
          agents={agents}
          onLaunchConsole={(ag) => {
            setSelectedAgent(ag);
            setActiveTab("workbench");
          }}
          onOpenTutorial={(ag) => handleOpenTutorial(ag)}
        />
      )}

      {/* VIEW 3: Dedicated, Uncluttered Agent Execution Console */}
      {activeTab === "workbench" && selectedAgent && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50/70 border border-blue-200/70 dark:bg-blue-950/40 dark:border-blue-900/40">
            <div className="flex items-center space-x-2 text-xs font-semibold text-blue-900 dark:text-blue-300">
              <Bot className="h-4 w-4 text-blue-600" />
              <span>Forensic Console Active: {selectedAgent.name} ({selectedAgent.code_name})</span>
            </div>
            <button
              onClick={() => setActiveTab("fleet")}
              className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-white text-blue-700 hover:bg-blue-100 dark:bg-slate-800 dark:text-blue-300 shadow-xs transition cursor-pointer"
            >
              <span>← Back to Cartoon Bots & Fleet</span>
            </button>
          </div>

          <AgentWorkbench
            selectedAgent={selectedAgent}
            allAgents={agents}
            onSelectAgent={(ag) => setSelectedAgent(ag)}
            exceptions={exceptions}
            onRefreshData={onRefreshData}
            onOpenTutorial={(ag) => handleOpenTutorial(ag)}
          />
        </div>
      )}

      {/* Step-by-Step Interactive Tutorial Modal */}
      <AgentTutorialModal
        isOpen={isTutorialOpen}
        agent={tutorialAgent}
        onClose={() => setIsTutorialOpen(false)}
        onRunInWorkbench={(agentId) => {
          const found = agents.find((a) => a.id === agentId);
          if (found) {
            setSelectedAgent(found);
            setActiveTab("workbench");
          }
        }}
      />

    </div>
  );
}
