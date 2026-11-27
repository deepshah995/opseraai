"use client";

import React, { useState } from "react";
import { FaktryLogo } from "@/components/agents/SwarmBotAvatar";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Database,
  HelpCircle,
  Play,
  RefreshCw,
} from "lucide-react";

interface NavbarProps {
  onRefresh: () => Promise<void> | void;
  onStartTour: () => void;
  onSeed: () => Promise<void>;
  onDetect: () => Promise<void>;
  onOpenGuide?: () => void;
}

export function Navbar({
  onRefresh,
  onStartTour,
  onSeed,
  onDetect,
  onOpenGuide,
}: NavbarProps) {
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  };

  const handleSeedData = async () => {
    setBusyAction("seed");
    try {
      await onSeed();
      showToast("Loaded sample manufacturing POs, receiving slips & invoices.");
    } catch (err: any) {
      showToast(err.message || "Failed to load demo data.", "error");
    } finally {
      setBusyAction(null);
    }
  };

  const handleRunDetection = async () => {
    setBusyAction("detect");
    try {
      await onDetect();
      showToast("Faktry AI swarm cost-leak scan finished.");
    } catch (err: any) {
      showToast(err.message || "Scan failed.", "error");
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <header className="h-16 border-b border-slate-200/80 bg-white/90 backdrop-blur-md px-4 lg:px-6 flex items-center justify-between gap-4 sticky top-0 z-30">
      <div className="flex items-center gap-3 min-w-0">
        <FaktryLogo className="h-6 w-7 shrink-0" />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-base text-slate-950 tracking-tight truncate">
              Faktry <span className="text-emerald-600">AI</span>
            </span>
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Apex Precision Mfg
            </span>
          </div>
          <p className="hidden md:block text-[11px] text-slate-500 truncate">
            AI Operations Agents Platform · Cost &amp; Time Savings Swarm
          </p>
        </div>
      </div>

      {notification && (
        <div
          className={`hidden xl:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
            notification.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
          ) : (
            <AlertCircle className="h-3.5 w-3.5 text-rose-600" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      <div className="flex items-center gap-2 shrink-0">
        {onOpenGuide && (
          <button
            type="button"
            onClick={onOpenGuide}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full border border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:text-emerald-700 transition-colors"
          >
            <BookOpen className="h-3.5 w-3.5 text-emerald-600" />
            How It Works
          </button>
        )}

        <button
          id="tour-start-btn"
          type="button"
          onClick={onStartTour}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-full border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition-colors"
          title="Interactive Walkthrough"
        >
          <HelpCircle className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Tour</span>
        </button>

        <button
          id="tour-seed-btn"
          type="button"
          disabled={busyAction !== null}
          onClick={handleSeedData}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50 transition-colors"
        >
          {busyAction === "seed" ? (
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Database className="h-3.5 w-3.5 text-slate-500" />
          )}
          <span className="hidden lg:inline">Load Plant Demo</span>
        </button>

        <button
          id="tour-detect-btn"
          type="button"
          disabled={busyAction !== null}
          onClick={handleRunDetection}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-full bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 shadow-xs transition-colors"
        >
          {busyAction === "detect" ? (
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Play className="h-3.5 w-3.5" />
          )}
          <span>Scan for Savings</span>
        </button>

        <button
          type="button"
          onClick={() => onRefresh()}
          title="Refresh Data"
          className="p-2 rounded-full border border-slate-200 bg-white text-slate-500 hover:text-emerald-700 hover:border-emerald-300 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>
    </header>
  );
}
