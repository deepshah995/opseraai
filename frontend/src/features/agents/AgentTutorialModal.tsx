"use client";

import React, { useState } from "react";
import { AgentDefinition } from "@/types";
import { SwarmBotAvatar, getCompanionMeta } from "@/components/agents/SwarmBotAvatar";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Play,
  Sparkles,
  X,
} from "lucide-react";

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
  const [activeStepIdx, setActiveStepIdx] = useState(0);

  if (!isOpen || !agent) return null;

  const steps = agent.tutorial_steps || agent.full_tutorial || [];
  const companion = getCompanionMeta(agent.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Top Bar */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <SwarmBotAvatar agentId={agent.id} mood="proud" size="md" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-800">
                  {agent.code_name}
                </span>
                <h2 className="text-base font-bold text-slate-900">
                  {agent.name} ({companion.nickname})
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{agent.title}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Plain-English Role & Savings Summary */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-blue-600" />
              What {agent.name} Does
            </p>
            <p className="text-xs text-slate-600 leading-relaxed">{agent.simple_summary}</p>
            {(agent.cost_savings_focus || agent.time_saved_per_task_mins) && (
              <div className="flex flex-wrap gap-3 pt-2 text-[11px] font-semibold">
                {agent.cost_savings_focus && (
                  <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md">
                    {agent.cost_savings_focus}
                  </span>
                )}
                {agent.time_saved_per_task_mins && (
                  <span className="text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-md inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" /> ~{agent.time_saved_per_task_mins} mins saved per check
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Step-by-step Walkthrough */}
          {steps.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {steps.map((s: any, idx: number) => (
                  <button
                    key={s.step || idx}
                    type="button"
                    onClick={() => setActiveStepIdx(idx)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                      activeStepIdx === idx
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    Step {idx + 1}: {s.title}
                  </button>
                ))}
              </div>

              {steps[activeStepIdx] && (
                <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 space-y-2.5">
                  <p className="text-sm font-bold text-slate-900">
                    {steps[activeStepIdx].title}
                  </p>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {steps[activeStepIdx].explanation}
                  </p>
                  {steps[activeStepIdx].papers_compared?.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="text-[11px] font-semibold text-slate-500">
                        Compares:
                      </span>
                      {steps[activeStepIdx].papers_compared.map((doc: string, i: number) => (
                        <span
                          key={i}
                          className="text-[11px] font-medium px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700"
                        >
                          {doc}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Sample Scenarios */}
          {agent.sample_scenarios && agent.sample_scenarios.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Try a Real Manufacturing Scenario
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {agent.sample_scenarios.map((sc) => (
                  <button
                    key={sc.scenario_id}
                    type="button"
                    onClick={() => {
                      onRunInWorkbench(agent.id, sc.scenario_id);
                      onClose();
                    }}
                    className="p-3 rounded-xl border border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50/30 text-left transition-all group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-slate-900 group-hover:text-blue-700">
                        {sc.title}
                      </p>
                      <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-600 shrink-0" />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">{sc.customer}</p>
                    {sc.expected_resolution && (
                      <p className="text-[11px] font-medium text-emerald-700 mt-1.5 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 shrink-0" />
                        <span className="truncate">{sc.expected_resolution}</span>
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5 text-blue-600" />
            Executed safely via Google Antigravity SDK
          </span>
          <button
            type="button"
            onClick={() => {
              onRunInWorkbench(agent.id);
              onClose();
            }}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 hover:bg-slate-800 text-white flex items-center gap-1.5"
          >
            <Play className="h-3.5 w-3.5" />
            Open in Test Console
          </button>
        </div>
      </div>
    </div>
  );
}
