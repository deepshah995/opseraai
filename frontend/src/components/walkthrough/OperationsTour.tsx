"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Database,
  RefreshCw,
  LayoutDashboard,
  AlertTriangle,
  Bot,
  ShieldCheck,
  CheckSquare,
  FileUp,
  History,
  Settings,
  ChevronRight,
  ChevronLeft,
  X,
  Minimize2,
  Maximize2,
  ChevronDown,
  ChevronUp,
  Play,
  BarChart3,
  Layers,
  Zap,
} from "lucide-react";
import { WalkthroughSpotlightPointer, SpotlightTarget } from "./WalkthroughSpotlightPointer";
import { NavTab } from "../layout/Sidebar";
import { OperationalException } from "@/types";

export interface TourStep {
  id: string;
  badge: string;
  title: string;
  headline: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  targetElementId: string;
  pointerLabel: string;
  pointerPosition?: "auto" | "top" | "bottom";
  requiredTab: NavTab;
  actionButtonText?: string;
  onExecuteAction?: () => Promise<void> | void;
}

interface OperationsTourProps {
  isOpen: boolean;
  onClose: () => void;
  setActiveTab: (tab: NavTab) => void;
  onSelectException?: (exceptionId: string) => void;
  exceptions?: OperationalException[];
  onSeedData?: () => Promise<void> | void;
  onRunDetection?: () => Promise<void> | void;
}

export const OperationsTour: React.FC<OperationsTourProps> = ({
  isOpen,
  onClose,
  setActiveTab,
  onSelectException,
  exceptions = [],
  onSeedData,
  onRunDetection,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [showStepList, setShowStepList] = useState<boolean>(false);
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});
  const [spotlight, setSpotlight] = useState<SpotlightTarget | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [stepFeedback, setStepFeedback] = useState<string | null>(null);

  const triggerSpotlight = (
    targetId: string,
    label: string,
    position: "auto" | "top" | "bottom" = "auto",
    durationMs = 6000
  ) => {
    setSpotlight({
      targetId,
      label,
      position,
      durationMs,
      timestamp: Date.now(),
    });
  };

  const steps: TourStep[] = [
    {
      id: "seed-data",
      badge: "01",
      title: "Load Demo Data",
      headline: "Populate realistic scale tickets & customer bills",
      description: "Click 'Load Demo Data' in the top bar to add realistic examples of waste haul tickets, certified landfill scale slips, customer invoices, and driver logs.",
      icon: Database,
      targetElementId: "btn-seed-data",
      pointerLabel: "Step 1: Click 'Load Demo Data'",
      pointerPosition: "bottom",
      requiredTab: "dashboard",
      actionButtonText: "Load Demo Data Now",
      onExecuteAction: async () => {
        if (onSeedData) await onSeedData();
        triggerSpotlight("btn-seed-data", "11 sample records loaded!", "bottom");
      },
    },
    {
      id: "run-detection",
      badge: "02",
      title: "Check for Errors",
      headline: "Find billing mistakes automatically",
      description: "Click 'Check for Errors'. The system compares tickets, invoices, and disposal receipts to instantly spot wrong prices, double charges, and missing bills.",
      icon: RefreshCw,
      targetElementId: "btn-run-detection",
      pointerLabel: "Step 2: Click 'Check for Errors'",
      pointerPosition: "bottom",
      requiredTab: "dashboard",
      actionButtonText: "Check for Errors Now",
      onExecuteAction: async () => {
        if (onRunDetection) await onRunDetection();
        triggerSpotlight("btn-run-detection", "Errors detected! Ready for review.", "bottom");
      },
    },
    {
      id: "dashboard-overview",
      badge: "03",
      title: "Track Money at Risk",
      headline: "Live visibility into affected revenue",
      description: "The 'Money at Risk' card tracks the total dollar volume lost to billing discrepancies across your operations, broken down by issue category.",
      icon: LayoutDashboard,
      targetElementId: "kpi-at-risk",
      pointerLabel: "Total Dollars at Risk",
      pointerPosition: "bottom",
      requiredTab: "dashboard",
      actionButtonText: "Check Overview Cards",
      onExecuteAction: () => {
        setActiveTab("dashboard");
        triggerSpotlight("kpi-at-risk", "Total Money at Risk", "bottom");
      },
    },
    {
      id: "agents-fleet",
      badge: "04",
      title: "AI Agents Fleet & Live Studio",
      headline: "5 autonomous agents with character avatars & telemetry",
      description: "Meet the specialized Opsera AI Fleet: TicketHawk (scale variance), DispatchPulse (GPS routes), BillSentry (unbilled hauls), OpsBeacon (analytics), and DisputeShield (customer claims). In the Live Studio, chat with each agent and view their live enterprise data connections!",
      icon: Bot,
      targetElementId: "tab-agents",
      pointerLabel: "Step 4: AI Agents Fleet & Live Studio",
      pointerPosition: "auto",
      requiredTab: "agents",
      actionButtonText: "Explore AI Agents Fleet",
      onExecuteAction: () => {
        setActiveTab("agents");
        triggerSpotlight("tab-agents", "AI Agents Fleet & Character Studio", "auto");
      },
    },
    {
      id: "agent-workbench",
      badge: "05",
      title: "Agent Console & Simulation",
      headline: "Run live agent simulations & auto-resolutions",
      description: "Switch to the Agent Console to test real-world scenarios. Run DisputeShield to produce certified customer dispute resolution letters or ResolveX to execute instant auto-settlements (<$500).",
      icon: Sparkles,
      targetElementId: "btn-agent-workbench",
      pointerLabel: "Step 5: Agent Console & Scenarios",
      pointerPosition: "auto",
      requiredTab: "agents",
      actionButtonText: "Highlight Agent Console",
      onExecuteAction: () => {
        setActiveTab("agents");
        triggerSpotlight("btn-agent-workbench", "Launch Agent Console", "auto");
      },
    },
    {
      id: "report-console",
      badge: "06",
      title: "Report Console (OpsBeacon)",
      headline: "Executive KPI briefings & margin analytics",
      description: "OpsBeacon (RB-04) continuously analyzes cross-fleet operational performance. Generate real-time executive briefings, facility benchmarks, cycle-time velocity, and downloadable summaries.",
      icon: BarChart3,
      targetElementId: "tab-reports",
      pointerLabel: "Step 6: Operations Report Console",
      pointerPosition: "auto",
      requiredTab: "reports",
      actionButtonText: "Open Report Console",
      onExecuteAction: () => {
        setActiveTab("reports");
        triggerSpotlight("tab-reports", "Operations Report Console", "auto");
      },
    },
    {
      id: "exception-queue",
      badge: "07",
      title: "Review Issues Queue",
      headline: "Triage detected billing discrepancies",
      description: "Browse detected discrepancies sorted by financial severity. Filter by priority (Critical or High), problem type (e.g., 'Unbilled Haul' or 'Tonnage Leak'), or search by customer name.",
      icon: AlertTriangle,
      targetElementId: "tab-exceptions",
      pointerLabel: "Step 7: Go to Issues List",
      pointerPosition: "auto",
      requiredTab: "exceptions",
      actionButtonText: "Open Issues List",
      onExecuteAction: () => {
        setActiveTab("exceptions");
        triggerSpotlight("tab-exceptions", "All Detected Issues", "auto");
      },
    },
    {
      id: "investigate-action",
      badge: "08",
      title: "Trigger AI Investigation",
      headline: "Stateful LangGraph root-cause analysis",
      description: "Click 'Investigate' next to any issue. The agent fetches linked scale slips, cross-checks customer contract rates, executes mathematical reconciliation, and formulates the exact root cause.",
      icon: Bot,
      targetElementId: "btn-investigate-first",
      pointerLabel: "Step 8: Click 'Investigate'",
      pointerPosition: "auto",
      requiredTab: "exceptions",
      actionButtonText: "Highlight Investigate Button",
      onExecuteAction: () => {
        setActiveTab("exceptions");
        if (exceptions.length > 0 && onSelectException) {
          onSelectException(exceptions[0].id);
        }
        triggerSpotlight("btn-investigate-first", "Ask AI to Investigate", "auto");
      },
    },
    {
      id: "evidence-grounding",
      badge: "09",
      title: "Side-by-Side Document Proof",
      headline: "Zero hallucination, grounded mathematical proof",
      description: "Compare the invoice line items, driver work order, and scale weight slip side-by-side. The agent displays certified weights, formulaic rate math, and contractual clauses with zero guesswork.",
      icon: ShieldCheck,
      targetElementId: "agent-findings-card",
      pointerLabel: "Step 9: Document Proof & Math",
      pointerPosition: "auto",
      requiredTab: "exceptions",
      actionButtonText: "View Evidence & Proof",
      onExecuteAction: () => {
        setActiveTab("exceptions");
        if (exceptions.length > 0 && onSelectException) {
          onSelectException(exceptions[0].id);
        }
        triggerSpotlight("agent-findings-card", "Clear Proof & Explanation", "auto");
      },
    },
    {
      id: "hitl-approval",
      badge: "10",
      title: "Manager 1-Click Approval",
      headline: "Human-in-the-loop enterprise governance",
      description: "The agent stages proposed resolutions (e.g., issuing a $220.00 credit memo or rebilling an unbilled haul) for human review. Managers enter notes and click 'Approve Fix' or 'Reject' with full governance.",
      icon: CheckSquare,
      targetElementId: "hitl-approval-card",
      pointerLabel: "Step 10: Manager Decision Box",
      pointerPosition: "auto",
      requiredTab: "exceptions",
      actionButtonText: "Highlight Approval Box",
      onExecuteAction: () => {
        setActiveTab("exceptions");
        if (exceptions.length > 0 && onSelectException) {
          onSelectException(exceptions[0].id);
        }
        triggerSpotlight("hitl-approval-card", "Your Decision", "auto");
      },
    },
    {
      id: "data-ingestion",
      badge: "11",
      title: "Spreadsheets & Database Ingestion",
      headline: "Import CSVs or connect live SQL databases",
      description: "Upload your team's existing CSV spreadsheets with automatic column mapping, or connect directly to enterprise databases (AMCS, PostgreSQL, MySQL) to pull live operations data.",
      icon: FileUp,
      targetElementId: "tab-ingestion",
      pointerLabel: "Step 11: Ingestion & ERP Connect",
      pointerPosition: "auto",
      requiredTab: "ingestion",
      actionButtonText: "Open Ingestion Screen",
      onExecuteAction: () => {
        setActiveTab("ingestion");
        triggerSpotlight("tab-ingestion", "Upload Files & Connect DB", "auto");
      },
    },
    {
      id: "audit-trail",
      badge: "12",
      title: "Complete Activity History",
      headline: "Honest, immutable audit ledger",
      description: "Every check, AI root cause analysis, and manager approval is logged with precise timestamps, before/after values, and user identity for enterprise compliance.",
      icon: History,
      targetElementId: "tab-audit",
      pointerLabel: "Step 12: Activity Log",
      pointerPosition: "auto",
      requiredTab: "audit",
      actionButtonText: "View Activity Log",
      onExecuteAction: () => {
        setActiveTab("audit");
        triggerSpotlight("tab-audit", "Activity History", "auto");
      },
    },
  ];

  const currentStep = steps[currentStepIndex];

  useEffect(() => {
    if (isOpen && !isMinimized && currentStep) {
      setActiveTab(currentStep.requiredTab);

      if (
        (currentStep.id === "evidence-grounding" || currentStep.id === "hitl-approval" || currentStep.id === "investigate-action") &&
        exceptions.length > 0 &&
        onSelectException
      ) {
        onSelectException(exceptions[0].id);
      }

      const timer = setTimeout(() => {
        triggerSpotlight(
          currentStep.targetElementId,
          currentStep.pointerLabel,
          currentStep.pointerPosition || "auto"
        );
      }, 250);

      return () => clearTimeout(timer);
    } else {
      setSpotlight(null);
    }
  }, [currentStepIndex, isOpen, isMinimized, setActiveTab, currentStep, exceptions, onSelectException]);

  if (!isOpen) return null;

  const handleNext = () => {
    setCompletedSteps((prev) => ({ ...prev, [currentStepIndex]: true }));
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleSelectStep = (index: number) => {
    setCurrentStepIndex(index);
    setCompletedSteps((prev) => ({ ...prev, [currentStepIndex]: true }));
    setShowStepList(false);
  };

  const StepIcon = currentStep.icon;

  if (isMinimized) {
    return (
      <>
        <WalkthroughSpotlightPointer spotlight={spotlight} onDismiss={() => setSpotlight(null)} />
        <div className="fixed bottom-6 right-6 z-50 animate-bounce-short">
          <button
            onClick={() => setIsMinimized(false)}
            className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-slate-900 text-white shadow-2xl border border-blue-500/50 hover:border-blue-400 transition-all group cursor-pointer"
          >
            <div className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
              <Sparkles className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
            </div>
            <div className="text-left pr-1">
              <div className="text-[10px] text-blue-400 font-mono font-bold uppercase tracking-wider">
                Step {currentStepIndex + 1} of {steps.length}
              </div>
              <div className="text-xs font-bold text-white truncate max-w-[150px]">
                {currentStep.title}
              </div>
            </div>
            <Maximize2 className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <WalkthroughSpotlightPointer spotlight={spotlight} onDismiss={() => setSpotlight(null)} />

      {/* Floating Tour Guide Card in Bottom Right */}
      <aside className="fixed bottom-6 right-6 z-50 w-full max-w-sm bg-slate-900/95 backdrop-blur-md border border-blue-500/30 text-white shadow-2xl rounded-2xl flex flex-col overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 border border-blue-500/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-xs tracking-wide text-white">Opsera AI Guided Tour</h3>
              <p className="text-[10px] text-slate-400">Interactive Walkthrough</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(true)}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Minimize Guide"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
              title="Close Guide"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress Bar & Step Selector */}
        <div className="px-4 py-2.5 bg-slate-950/40 border-b border-white/5">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
              />
            </div>
            <span className="text-[10px] font-mono text-blue-400 font-bold">
              {currentStepIndex + 1}/{steps.length}
            </span>
          </div>

          {/* Dropdown Toggle to Jump to Any Step */}
          <button
            onClick={() => setShowStepList(!showStepList)}
            className="w-full flex items-center justify-between text-left py-1 text-[11px] text-slate-300 hover:text-white transition-colors cursor-pointer group"
          >
            <span className="font-semibold truncate">
              Step {currentStep.badge}: {currentStep.title}
            </span>
            <div className="flex items-center gap-1 text-[10px] text-blue-400 font-mono">
              <span>All Steps</span>
              {showStepList ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </div>
          </button>

          {/* Expandable Step List */}
          {showStepList && (
            <div className="mt-2.5 py-1 max-h-48 overflow-y-auto space-y-1 pr-1 border-t border-white/10">
              {steps.map((st, idx) => {
                const isCur = idx === currentStepIndex;
                const isDone = completedSteps[idx];
                return (
                  <button
                    key={st.id}
                    onClick={() => handleSelectStep(idx)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs transition cursor-pointer ${
                      isCur
                        ? "bg-blue-600 text-white font-bold"
                        : "hover:bg-white/10 text-slate-300 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-[10px] font-mono opacity-70">{st.badge}</span>
                      <span className="truncate">{st.title}</span>
                    </div>
                    {isDone && !isCur && (
                      <span className="text-[10px] text-emerald-400 font-mono font-bold">✓</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Step Content */}
        <div className="p-4 space-y-3.5 max-h-[380px] overflow-y-auto">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center shrink-0 text-blue-400 mt-0.5">
              <StepIcon className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase text-blue-400 font-bold tracking-wider">
                {currentStep.headline}
              </div>
              <h4 className="text-sm font-bold text-white mt-0.5">{currentStep.title}</h4>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">{currentStep.description}</p>

          {/* Action Trigger Button */}
          {currentStep.actionButtonText && currentStep.onExecuteAction && (
            <button
              onClick={async () => {
                setActionLoading(true);
                try {
                  if (currentStep.onExecuteAction) await currentStep.onExecuteAction();
                } finally {
                  setActionLoading(false);
                }
              }}
              disabled={actionLoading}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-semibold text-white transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer disabled:opacity-50"
            >
              <Play className={`w-3.5 h-3.5 text-blue-400 ${actionLoading ? "animate-spin" : ""}`} />
              <span>{actionLoading ? "Working..." : currentStep.actionButtonText}</span>
            </button>
          )}
        </div>

        {/* Navigation Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-white/10 bg-slate-950/60">
          <button
            onClick={handlePrev}
            disabled={currentStepIndex === 0}
            className="flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition-colors cursor-pointer py-1 px-2 rounded-lg hover:bg-white/5"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <button
            onClick={handleNext}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all hover:scale-[1.02] cursor-pointer"
          >
            <span>{currentStepIndex === steps.length - 1 ? "Finish Tour" : "Next Step"}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </aside>
    </>
  );
};
