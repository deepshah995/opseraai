"use client";

import React, { useState } from "react";
import { 
  Building2, 
  Sparkles, 
  Database, 
  RefreshCw, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle
} from "lucide-react";
import { api } from "@/lib/api/client";

interface NavbarProps {
  onRefresh?: () => void;
  onStartTour?: () => void;
  onSeed?: () => Promise<void> | void;
  onDetect?: () => Promise<void> | void;
}

export function Navbar({ onRefresh, onStartTour, onSeed, onDetect }: NavbarProps) {
  const [seeding, setSeeding] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showNotice = (message: string, type: "success" | "error") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleSeedData = async () => {
    try {
      setSeeding(true);
      if (onSeed) {
        await onSeed();
      } else {
        const res = await api.seedDemoData(true);
        if (onRefresh) onRefresh();
      }
      showNotice("Loaded 11 sample tickets and bills! You can now click 'Check for Errors'.", "success");
    } catch (e: any) {
      showNotice(`Could not load data: ${e.message}`, "error");
    } finally {
      setSeeding(false);
    }
  };

  const handleRunDetection = async () => {
    try {
      setDetecting(true);
      if (onDetect) {
        await onDetect();
      } else {
        const detected = await api.runExceptionDetection();
        if (onRefresh) onRefresh();
      }
      showNotice("Scan complete! Found billing issues to review.", "success");
    } catch (e: any) {
      showNotice(`Check failed: ${e.message}`, "error");
    } finally {
      setDetecting(false);
    }
  };


  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
      <div className="flex h-16 items-center justify-between px-6">
        {/* Left: Branding & Tenant */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white font-bold shadow-sm">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <span className="text-base font-semibold tracking-tight text-slate-900 dark:text-white">
                Opsera AI
              </span>
              <span className="ml-2 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-950/60 dark:text-blue-400">
                Operations
              </span>
            </div>
          </div>

          <div className="hidden h-5 w-[1px] bg-slate-200 dark:bg-slate-800 md:block" />

          {/* Tenant Switcher */}
          <div className="hidden items-center space-x-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300 md:flex">
            <Building2 className="h-3.5 w-3.5 text-slate-500" />
            <span className="font-medium">Apex Industrial Waste & Recycling</span>
          </div>
        </div>

        {/* Center: Live Notification */}
        {notification && (
          <div className={`hidden items-center space-x-2 rounded-full px-4 py-1 text-xs font-medium lg:flex ${
            notification.type === "success" 
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300" 
              : "bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-300"
          }`}>
            {notification.type === "success" ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <AlertCircle className="h-3.5 w-3.5 text-rose-600" />
            )}
            <span>{notification.message}</span>
          </div>
        )}

        {/* Right: Actions & User Info */}
        <div className="flex items-center space-x-3">
          {onStartTour && (
            <button
              id="btn-start-tour"
              onClick={onStartTour}
              className="flex items-center space-x-1.5 rounded-md border border-blue-200 bg-blue-50/80 px-2.5 py-1.5 text-xs font-semibold text-blue-700 shadow-sm transition hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-300 cursor-pointer"
              title="Start quick step-by-step tour"
            >
              <Sparkles className="h-3.5 w-3.5 text-blue-600 animate-pulse" />
              <span>Quick Tour</span>
            </button>
          )}

          <button
            id="btn-seed-data"
            onClick={handleSeedData}
            disabled={seeding}
            className="flex items-center space-x-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
            title="Load sample tickets, receipts, and invoices"
          >
            <Database className={`h-3.5 w-3.5 text-slate-500 ${seeding ? "animate-pulse" : ""}`} />
            <span>{seeding ? "Loading Demo..." : "Load Demo Data"}</span>
          </button>

          <button
            id="btn-run-detection"
            onClick={handleRunDetection}
            disabled={detecting}
            className="flex items-center space-x-1.5 rounded-md bg-blue-600 px-3.5 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
            title="Compare tickets and bills to find mistakes"
          >

            <RefreshCw className={`h-3.5 w-3.5 ${detecting ? "animate-spin" : ""}`} />
            <span>{detecting ? "Checking..." : "Check for Errors"}</span>
          </button>

          <div className="hidden h-5 w-[1px] bg-slate-200 dark:bg-slate-800 md:block" />

          {/* User Profile */}
          <div className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
              SJ
            </div>
            <div className="hidden text-left sm:block">
              <div className="text-xs font-medium text-slate-900 dark:text-white">Sarah Jenkins</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Operations Manager</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
