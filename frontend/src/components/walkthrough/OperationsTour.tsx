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
      headline: "Load sample tickets & customer bills",
      description: "Click 'Load Demo Data' in the top bar to add realistic examples of waste haul tickets, disposal scale receipts, customer invoices, and driver logs.",
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
      description: "Click 'Check for Errors'. The system compares your tickets, invoices, and disposal receipts to instantly spot wrong prices, double charges, and missing bills.",
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
      title: "See Money at Risk",
      headline: "Track how much money is affected",
      description: "Look at the 'Money at Risk' card. It shows the total dollar amount lost to billing errors, and organizes the problems into clear, simple categories.",
      icon: LayoutDashboard,
      targetElementId: "kpi-at-risk",
      pointerLabel: "Total Dollars Lost to Errors",
      pointerPosition: "bottom",
      requiredTab: "dashboard",
      actionButtonText: "Check Overview Cards",
      onExecuteAction: () => {
        setActiveTab("dashboard");
        triggerSpotlight("kpi-at-risk", "Total Money at Risk", "bottom");
      },
    },
    {
      id: "exception-queue",
      badge: "04",
      title: "Review Issues List",
      headline: "Browse and sort problems found",
      description: "Go to the 'Issues List'. You can filter by priority (Critical or High), filter by problem type (like 'Billed Twice'), or search for a specific customer.",
      icon: AlertTriangle,
      targetElementId: "tab-exceptions",
      pointerLabel: "Step 4: Go to Issues List",
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
      badge: "05",
      title: "Ask AI to Investigate",
      headline: "Let the AI find out what went wrong",
      description: "Click the blue 'Investigate' button next to any issue. The AI helper will do the math, compare documents, and find the root cause.",
      icon: Bot,
      targetElementId: "btn-investigate-first",
      pointerLabel: "Step 5: Click 'Investigate'",
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
      badge: "06",
      title: "See the Proof Side-by-Side",
      headline: "Real documents, zero guesswork",
      description: "Compare the customer bill and signed driver ticket side-by-side. The AI explains the exact difference and quotes the actual document numbers.",
      icon: ShieldCheck,
      targetElementId: "agent-findings-card",
      pointerLabel: "AI Explanation & Document Proof",
      pointerPosition: "auto",
      requiredTab: "exceptions",
      actionButtonText: "View Document Proof",
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
      badge: "07",
      title: "Approve or Reject the Fix",
      headline: "You have the final say",
      description: "The AI suggests how to fix it (like giving a $220.00 refund). You type your notes and click 'Approve Fix'. The AI never changes money on its own.",
      icon: CheckSquare,
      targetElementId: "hitl-approval-card",
      pointerLabel: "Step 7: Manager Approval Box",
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
      badge: "08",
      title: "Upload Your Own Files",
      headline: "Import spreadsheets or PDF tickets",
      description: "Go to 'Upload Files' to import your own CSV spreadsheets or PDF receipts. The system matches columns automatically so you don't have to enter them by hand.",
      icon: FileUp,
      targetElementId: "tab-ingestion",
      pointerLabel: "Step 8: Upload Files",
      pointerPosition: "auto",
      requiredTab: "ingestion",
      actionButtonText: "Open Upload Screen",
      onExecuteAction: () => {
        setActiveTab("ingestion");
        triggerSpotlight("tab-ingestion", "Upload Files", "auto");
      },
    },
    {
      id: "audit-trail",
      badge: "09",
      title: "Activity History",
      headline: "Complete, honest record of all actions",
      description: "Every check, AI explanation, and manager approval is saved in this log so your team always knows who approved what and when.",
      icon: History,
      targetElementId: "tab-audit",
      pointerLabel: "Step 9: Activity Log",
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

      if ((currentStep.id === "evidence-grounding" || currentStep.id === "hitl-approval") && exceptions.length > 0 && onSelectException) {
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
              <h3 className="font-bold text-xs tracking-wide text-white">App Walkthrough</h3>
              <p className="text-[10px] text-slate-400">Step-by-Step Guide</p>
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
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500 ease-out"
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
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2 truncate">
              <span className="w-4 h-4 rounded bg-blue-500 text-white font-mono font-bold text-[9px] flex items-center justify-center shrink-0">
                {currentStep.badge}
              </span>
              <span className="truncate text-[11px] font-medium">{currentStep.title}</span>
            </div>
            {showStepList ? (
              <ChevronUp className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            )}
          </button>

          {/* Step List Drawer */}
          {showStepList && (
            <div className="mt-2 space-y-1 max-h-48 overflow-y-auto border-t border-white/10 pt-2 animate-fade-in">
              {steps.map((s, idx) => {
                const isActive = idx === currentStepIndex;
                const isDone = completedSteps[idx];
                const ItemIcon = s.icon;
                return (
                  <button
                    key={s.id}
                    onClick={() => handleSelectStep(idx)}
                    className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                      isActive
                        ? "bg-blue-600/30 text-white border border-blue-500/40"
                        : "hover:bg-white/5 text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${
                        isActive ? "bg-blue-500 text-white" : "bg-white/10 text-slate-400"
                      }`}>
                        <ItemIcon className="w-3 h-3" />
                      </div>
                      <span className="truncate text-[11px] font-medium">{s.title}</span>
                    </div>
                    {isDone && <span className="text-[10px] text-emerald-400 font-bold">✓</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Step Details & Prompt */}
        <div className="p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/30">
              <StepIcon className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white leading-tight">
                {currentStep.headline}
              </h4>
              <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                {currentStep.description}
              </p>
            </div>
          </div>

          {/* Action Trigger Button & Feedback */}
          {currentStep.onExecuteAction && (
            <div className="space-y-2">
              <button
                disabled={actionLoading}
                onClick={async () => {
                  if (!currentStep.onExecuteAction) return;
                  try {
                    setActionLoading(true);
                    setStepFeedback(null);
                    await currentStep.onExecuteAction();
                    setCompletedSteps((prev) => ({ ...prev, [currentStepIndex]: true }));
                    if (currentStepIndex === 0) {
                      setStepFeedback("✅ 11 Sample records loaded & ready! Click 'Next' to check for errors.");
                    } else if (currentStepIndex === 1) {
                      setStepFeedback("✅ Scan complete! Billing discrepancies detected.");
                    }
                  } catch (e: any) {
                    setStepFeedback(`⚠️ Error: ${e.message}`);
                  } finally {
                    setActionLoading(false);
                  }
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Loading...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3 fill-current" />
                    <span>{currentStep.actionButtonText || "Try This"}</span>
                  </>
                )}
              </button>

              {stepFeedback && (
                <div className="rounded-lg bg-emerald-950/80 border border-emerald-500/40 p-2 text-[11px] text-emerald-300 flex items-center gap-2 animate-fade-in">
                  <span>{stepFeedback}</span>
                </div>
              )}

              {currentStepIndex === 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("ingestion");
                    setStepFeedback("Switched to File & DB Import tab!");
                  }}
                  className="w-full text-center text-[11px] text-blue-300 hover:text-blue-200 underline pt-1 cursor-pointer"
                >
                  Want your own data? Download Excel template or connect DB &rarr;
                </button>
              )}
            </div>
          )}
        </div>


        {/* Footer Navigation Controls */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-white/10 bg-slate-950/60">
          <button
            onClick={handlePrev}
            disabled={currentStepIndex === 0}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <span className="text-[10px] text-slate-500 font-mono">
            {currentStepIndex + 1} of {steps.length}
          </span>

          <button
            onClick={handleNext}
            className="flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all cursor-pointer"
          >
            <span>{currentStepIndex === steps.length - 1 ? "Finish" : "Next"}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </aside>
    </>
  );
};
