"use client";

import React, { useState } from "react";
import { 
  X, 
  BookOpen, 
  Sparkles, 
  Play, 
  CheckCircle2, 
  ArrowRight, 
  Scale, 
  Truck, 
  Receipt, 
  BarChart3, 
  ShieldAlert,
  FileText,
  DollarSign,
  HelpCircle,
  Lightbulb
} from "lucide-react";
import { AgentDefinition, AgentRunResult } from "@/types";
import { api } from "@/lib/api/client";

interface AgentTutorialModalProps {
  isOpen: boolean;
  agent: AgentDefinition | null;
  onClose: () => void;
  onRunInWorkbench: (agentId: string, scenarioId?: string) => void;
}

export function AgentTutorialModal({
  isOpen,
  agent,
  onClose,
  onRunInWorkbench,
}: AgentTutorialModalProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState<AgentRunResult | null>(null);

  if (!isOpen || !agent) return null;

  const steps = agent.full_tutorial || [];
  const activeStep = steps[currentStepIndex] || null;
  const sampleScenarios = agent.sample_scenarios || [];

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

  const IconComponent = getAgentIcon(agent.icon_name);

  const handleRunSimulation = async (scenarioId: string) => {
    try {
      setSimulating(true);
      setSimResult(null);
      const res = await api.runAgent(agent.id, { scenario_id: scenarioId });
      setSimResult(res);
    } catch (e: any) {
      console.error("Simulation error:", e);
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative flex flex-col max-h-[92vh] w-full max-w-4xl rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200/80 px-6 py-4 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-850">
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-xl bg-${agent.color_theme}-500/10 text-${agent.color_theme}-600 dark:bg-${agent.color_theme}-500/20 dark:text-${agent.color_theme}-400 ring-1 ring-${agent.color_theme}-500/30`}>
              <IconComponent className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs uppercase px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300">
                  {agent.code_name}
                </span>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {agent.name} Interactive Tutorial
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {agent.title}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-850 dark:hover:text-slate-300 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Plain English "Elevator Pitch" Box */}
          <div className="rounded-xl border border-blue-200/80 bg-blue-50/50 p-4 dark:border-blue-900/40 dark:bg-blue-950/20">
            <div className="flex items-start space-x-3">
              <Lightbulb className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-semibold text-blue-900 dark:text-blue-300">
                  How This Agent Protects Operations
                </h4>
                <p className="text-sm text-blue-950/90 dark:text-blue-100 mt-1 leading-relaxed">
                  {agent.simple_summary}
                </p>
              </div>
            </div>
          </div>

          {/* Stepper Tabs */}
          {steps.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center space-x-2">
                  <BookOpen className="h-4 w-4 text-slate-500" />
                  <span>How {agent.name} Works</span>
                </h3>
                <span className="text-xs text-slate-400">
                  Step {currentStepIndex + 1} of {steps.length}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {steps.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentStepIndex(idx)}
                    className={`rounded-lg px-3 py-2 text-left transition text-xs font-medium border ${
                      currentStepIndex === idx
                        ? "border-blue-600 bg-blue-50 text-blue-900 font-semibold dark:border-blue-500 dark:bg-blue-950/60 dark:text-blue-200 shadow-xs"
                        : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400"
                    }`}
                  >
                    <div className="flex items-center space-x-1.5">
                      <span className={`inline-flex items-center justify-center h-4 w-4 rounded-full text-[10px] font-bold ${
                        currentStepIndex === idx ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      }`}>
                        {idx + 1}
                      </span>
                      <span className="truncate">{s.title}</span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Active Step Content */}
              {activeStep && (
                <div className="mt-3.5 rounded-xl border border-slate-200 bg-white p-4.5 dark:border-slate-800 dark:bg-slate-850 space-y-3.5">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      {activeStep.title}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                      {activeStep.explanation}
                    </p>
                  </div>

                  {activeStep.papers_compared && activeStep.papers_compared.length > 0 && (
                    <div className="rounded-lg bg-slate-50 dark:bg-slate-900/80 p-3 border border-slate-200/80 dark:border-slate-800">
                      <div className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5 flex items-center space-x-1.5">
                        <FileText className="h-3.5 w-3.5 text-blue-600" />
                        <span>Source Documents & Signals Reconciled:</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {activeStep.papers_compared.map((paper, pIdx) => (
                          <span
                            key={pIdx}
                            className="inline-flex items-center rounded-md bg-white px-2 py-0.5 text-xs text-slate-700 ring-1 ring-inset ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700"
                          >
                            ✓ {paper}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2">
                    <button
                      disabled={currentStepIndex === 0}
                      onClick={() => setCurrentStepIndex((prev) => Math.max(0, prev - 1))}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800"
                    >
                      ← Previous
                    </button>
                    <button
                      disabled={currentStepIndex === steps.length - 1}
                      onClick={() => setCurrentStepIndex((prev) => Math.min(steps.length - 1, prev + 1))}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 transition"
                    >
                      Next Step →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Interactive Simulation / Test Drive */}
          {sampleScenarios.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4.5 dark:border-slate-800 dark:bg-slate-850/60 space-y-3.5">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center space-x-2">
                  <Play className="h-4 w-4 text-emerald-600" />
                  <span>Interactive Test Drive</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select a realistic scenario to see how {agent.name} cross-checks records and arrives at a verified decision.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {sampleScenarios.map((scen, sIdx) => (
                  <div
                    key={sIdx}
                    className="flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-sm"
                  >
                    <div>
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

                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">Realistic Field Data</span>
                      <button
                        disabled={simulating}
                        onClick={() => handleRunSimulation(scen.scenario_id)}
                        className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition disabled:opacity-50"
                      >
                        <Play className="h-3 w-3" />
                        <span>{simulating ? "Analyzing..." : "Test Drive"}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Simulation Output Card */}
              {simResult && (
                <div className="mt-4 rounded-xl border border-emerald-300/80 bg-emerald-50/70 p-5 dark:border-emerald-900/60 dark:bg-emerald-950/30 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between border-b border-emerald-200/80 pb-3 dark:border-emerald-900/60">
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      <span className="font-bold text-sm text-emerald-950 dark:text-emerald-200">
                        {simResult.agent_name} Resolved the Issue!
                      </span>
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-200">
                      {Math.round((simResult.confidence_score || 0.98) * 100)}% Confidence
                    </span>
                  </div>

                  <div className="mt-3 space-y-3 text-xs">
                    {simResult.root_cause_analysis && (
                      <div>
                        <span className="font-semibold text-emerald-900 dark:text-emerald-300">Root Cause Diagnosis:</span>
                        <p className="text-emerald-950 dark:text-emerald-100 mt-0.5 leading-relaxed">
                          {simResult.root_cause_analysis}
                        </p>
                      </div>
                    )}

                    {simResult.proposed_resolution && (
                      <div className="rounded-lg bg-white p-3 border border-emerald-200 dark:bg-slate-900 dark:border-emerald-900/80">
                        <div className="flex items-center justify-between text-slate-900 dark:text-white font-bold">
                          <span>{simResult.proposed_resolution.recommended_action}</span>
                          {simResult.proposed_resolution.proposed_amount !== undefined && (
                            <span className="text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                              ${simResult.proposed_resolution.proposed_amount.toFixed(2)}
                            </span>
                          )}
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                          {simResult.proposed_resolution.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 bg-slate-50 dark:border-slate-800 dark:bg-slate-850">
          <div className="text-xs text-slate-500">
            Ready to use in production? You can launch this agent directly from the fleet dashboard.
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800 transition"
            >
              Close Tutorial
            </button>
            <button
              onClick={() => {
                onClose();
                onRunInWorkbench(agent.id);
              }}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition"
            >
              <span>Launch {agent.name} in Workbench</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
