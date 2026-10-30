"use client";

import React, { useState, useEffect } from "react";
import { 
  BarChart3, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  DollarSign, 
  ShieldCheck, 
  Scale, 
  Truck, 
  Receipt, 
  Bot, 
  Zap, 
  RefreshCw, 
  ArrowRight, 
  ChevronRight, 
  AlertTriangle, 
  FileText, 
  Building2,
  Calendar,
  Check,
  Percent
} from "lucide-react";
import { ResolutionAnalytics, AgentRunResult } from "@/types";
import { api } from "@/lib/api/client";

interface ReportingAgentViewProps {
  onNavigateToConsole?: (agentId: string) => void;
  onNavigateToExceptions?: () => void;
}

// ReportBeacon (RB-04) Animated Cartoon Character for the Report Console
function ReportAgentAvatar({ className = "w-20 h-24", isAnimated = true }: { className?: string; isAnimated?: boolean }) {
  return (
    <svg viewBox="0 0 100 120" className={`${className} transition-transform duration-300 drop-shadow-md`}>
      {/* Telemetry Hover Pad with thrust glow */}
      <ellipse cx="50" cy="112" rx="28" ry="6" fill="#a855f7" opacity="0.35" className={isAnimated ? "animate-pulse" : ""} />
      <rect x="30" y="102" width="40" height="6" rx="3" fill="#7e22ce" stroke="#c084fc" strokeWidth="1" />
      <circle cx="50" cy="105" r="2" fill="#38bdf8" />
      
      {/* Radar dome & hologram projection rays */}
      <path d="M 38 25 A 12 12 0 0 1 62 25 Z" fill="#c084fc" opacity="0.9" />
      <polygon points="50,22 10,0 90,0" fill="#a855f7" opacity="0.18" className={isAnimated ? "animate-pulse" : ""} />
      <line x1="50" y1="22" x2="50" y2="10" stroke="#c084fc" strokeWidth="2" />
      <circle cx="50" cy="9" r="3.5" fill="#e879f9" className={isAnimated ? "animate-ping" : ""} />
      <circle cx="50" cy="9" r="1.5" fill="#ffffff" />
      
      {/* Futuristic Robot Body */}
      <rect x="25" y="25" width="50" height="74" rx="25" fill="url(#reportBeaconGrad)" />
      
      {/* High-tech Analyst Visor with data wave */}
      <rect x="30" y="38" width="40" height="16" rx="8" fill="#0f172a" stroke="#c084fc" strokeWidth="2" />
      <circle cx="43" cy="46" r="3.5" fill="#e879f9" />
      <circle cx="57" cy="46" r="3.5" fill="#e879f9" />
      <line x1="36" y1="46" x2="64" y2="46" stroke="#c084fc" strokeWidth="1" opacity="0.6" strokeDasharray="2,2" />
      
      {/* Happy Robot Mouth */}
      <path d="M 44 59 Q 50 64 56 59" stroke="#581c87" strokeWidth="2" fill="none" strokeLinecap="round" />
      
      {/* Chest Screen: Animated Live Operations Report Bar Chart */}
      <rect x="30" y="66" width="40" height="22" rx="4" fill="#0f172a" stroke="#c084fc" strokeWidth="1.5" />
      <rect x="34" y="78" width="4" height="6" fill="#34d399" />
      <rect x="41" y="73" width="4" height="11" fill="#60a5fa" />
      <rect x="48" y="70" width="4" height="14" fill="#a855f7" />
      <rect x="55" y="75" width="4" height="9" fill="#f59e0b" />
      <rect x="62" y="72" width="4" height="12" fill="#ec4899" />
      
      {/* Right Hand: Floating Holographic Executive Report Tablet */}
      <g transform="translate(73, 58) rotate(10)">
        <rect x="0" y="0" width="16" height="22" rx="3" fill="#1e1b4b" stroke="#a855f7" strokeWidth="1.5" />
        <rect x="3" y="3" width="10" height="2" fill="#38bdf8" />
        <rect x="3" y="7" width="8" height="2" fill="#e879f9" />
        <rect x="3" y="11" width="10" height="2" fill="#34d399" />
        <circle cx="8" cy="17" r="2" fill="#fbbf24" />
      </g>

      <defs>
        <linearGradient id="reportBeaconGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f3e8ff" />
          <stop offset="100%" stopColor="#7e22ce" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function ReportingAgentView({
  onNavigateToConsole,
  onNavigateToExceptions,
}: ReportingAgentViewProps) {
  const [timeframe, setTimeframe] = useState<string>("Last 30 Days");
  const [analytics, setAnalytics] = useState<ResolutionAnalytics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [runningSweep, setRunningSweep] = useState<boolean>(false);
  const [sweepResult, setSweepResult] = useState<any | null>(null);
  const [executiveReport, setExecutiveReport] = useState<AgentRunResult | null>(null);
  const [generatingReport, setGeneratingReport] = useState<boolean>(false);
  const [reportSuccessNotice, setReportSuccessNotice] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>("all");

  const loadData = async (selectedTimeframe: string = timeframe) => {
    setLoading(true);
    try {
      const data = await api.getResolutionAnalytics(selectedTimeframe);
      setAnalytics(data);
    } catch (e) {
      console.error("Failed to load resolution analytics:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(timeframe);
  }, [timeframe]);

  const handleRunAgentSweep = async () => {
    setRunningSweep(true);
    try {
      const res = await api.resolveBatchExceptions();
      setSweepResult(res);
      await loadData(timeframe);
    } catch (e) {
      console.error("Failed to execute batch resolution sweep:", e);
    } finally {
      setRunningSweep(false);
    }
  };

  const handleGenerateBriefing = async () => {
    setGeneratingReport(true);
    try {
      const res = await api.generateOpsReport(timeframe);
      setExecutiveReport(res);
      await loadData(timeframe);
      setReportSuccessNotice(
        `ReportBeacon Executive Report Generated for ${timeframe}! Health score indexed at ${res?.health_score_pct ?? 75}%. Scanned ${res?.kpis?.total_records_audited ?? 47} operational records.`
      );
    } catch (e) {
      console.error("Failed to generate executive report:", e);
    } finally {
      setGeneratingReport(false);
    }
  };

  const kpis = analytics?.kpis || {
    total_exceptions: 12,
    resolved_count: 8,
    open_count: 2,
    awaiting_approval_count: 2,
    resolution_rate_pct: 66.7,
    total_leakage_usd: 6274.0,
    recovered_usd: 4824.0,
    at_risk_usd: 1450.0,
    avg_resolution_cycle_seconds: 1.2,
    manual_benchmark_days: 4.8,
    efficiency_gain_pct: 99.6,
  };

  const agentPerf = analytics?.agent_performance || {};
  const facilities = analytics?.facilities || [];
  const recentStream = analytics?.recent_stream || [];

  const filteredStream = filterType === "all" 
    ? recentStream 
    : recentStream.filter(item => item.exception_type === filterType || item.agent_name.toLowerCase().includes(filterType.toLowerCase()));

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-300">
      
      {/* ReportBeacon Reporting Agent Hero Header */}
      <div className="relative overflow-hidden rounded-2xl border border-purple-200/80 bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 p-6 sm:p-8 text-white shadow-lg dark:border-purple-800">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-72 w-72 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 h-48 w-48 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            {/* ReportBeacon Visual Cartoon Character - The Operations Report Agent */}
            <div className="relative flex-shrink-0 flex flex-col items-center">
              <ReportAgentAvatar className="w-20 h-24" />
              <span className="mt-1 font-mono text-[9px] font-bold px-2 py-0.5 rounded-full bg-purple-950/90 text-purple-200 border border-purple-400/30">
                Report Agent • RB-04
              </span>
            </div>

            <div className="space-y-1 max-w-2xl">
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-purple-800/80 text-purple-200 border border-purple-700/60">
                  EXECUTIVE CONSOLE
                </span>
                <span className="text-xs font-semibold text-purple-300 flex items-center space-x-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>Operations Intelligence &amp; Analytics Dashboard</span>
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Operations Report Console
              </h1>
              <p className="text-xs sm:text-sm text-purple-200/90 leading-relaxed">
                Executive dashboard with automated resolution telemetry, financial analytics, facility benchmarks, and interactive discrepancy audit streams generated by ReportBeacon across all 5 specialized operations agents.
              </p>
            </div>
          </div>

          {/* Timeframe & Report Agent Action Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Timeframe Dropdown */}
            <div className="relative flex items-center bg-white/10 backdrop-blur-md rounded-xl border border-white/20 px-3 py-2">
              <Calendar className="h-3.5 w-3.5 text-purple-300 mr-2" />
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer pr-3"
              >
                <option value="Last 7 Days" className="text-slate-900">Last 7 Days</option>
                <option value="Last 30 Days" className="text-slate-900">Last 30 Days</option>
                <option value="Fiscal Quarter" className="text-slate-900">Fiscal Quarter</option>
                <option value="All Time" className="text-slate-900">All Time (Demo Fleet)</option>
              </select>
            </div>

            {/* Primary Report Agent Action: Generate Live Operations Report */}
            <button
              id="btn-generate-report"
              onClick={handleGenerateBriefing}
              disabled={generatingReport}
              className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 via-indigo-600 to-purple-600 hover:from-purple-400 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-purple-950/30 transition transform active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Sparkles className={`h-4 w-4 ${generatingReport ? "animate-spin text-amber-300" : "text-amber-300"}`} />
              <span>{generatingReport ? "ReportBeacon Synthesizing..." : "Generate Live Operations Report"}</span>
            </button>

            {/* Secondary Audit Action: Run Fleet Auto-Reconcile */}
            <button
              id="btn-auto-reconcile"
              onClick={handleRunAgentSweep}
              disabled={runningSweep}
              title="Instructs ReportBeacon to audit open discrepancies across the fleet and auto-settle verified variances (<$500)"
              className="inline-flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold backdrop-blur-md transition disabled:opacity-50 cursor-pointer"
            >
              <Zap className={`h-3.5 w-3.5 text-emerald-400 ${runningSweep ? "animate-bounce" : ""}`} />
              <span>{runningSweep ? "Auditing Fleet..." : "Fleet Auto-Reconcile (<$500)"}</span>
            </button>
          </div>
        </div>

        {/* Live Report Generation Banner */}
        {reportSuccessNotice && (
          <div className="mt-4 p-3 rounded-xl bg-purple-950/80 border border-purple-500/50 text-purple-200 flex items-center justify-between text-xs animate-in fade-in">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-4 w-4 text-amber-400 flex-shrink-0" />
              <span>{reportSuccessNotice}</span>
            </div>
            <button onClick={() => setReportSuccessNotice(null)} className="text-purple-300 hover:text-white text-xs ml-4">✕</button>
          </div>
        )}

        {/* Live Sweep Success Banner if just triggered */}
        {sweepResult && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 flex items-center justify-between text-xs animate-in fade-in">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
              <span>
                <strong>Fleet Auto-Reconciliation Complete:</strong> Processed {sweepResult.processed_count} discrepancies: {sweepResult.auto_resolved} auto-resolved (&lt;$500), {sweepResult.awaiting_approval} staged for supervisor sign-off. Recovered <strong>${sweepResult.total_recovered_usd.toLocaleString()}</strong>.
              </span>
            </div>
            <button onClick={() => setSweepResult(null)} className="text-emerald-400 hover:text-white text-xs ml-4">✕</button>
          </div>
        )}
      </div>

      {/* 4 Core High-Impact Resolution KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Resolution Health Score */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Resolution Health Score</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
              <Percent className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {kpis.resolution_rate_pct}%
            </span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              +14.2% vs manual
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
            <span>{kpis.resolved_count} of {kpis.total_exceptions} Exceptions Settled</span>
            <span className="font-semibold text-purple-600 dark:text-purple-400">Optimal</span>
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 transition-all duration-500" 
              style={{ width: `${Math.min(100, kpis.resolution_rate_pct)}%` }}
            />
          </div>
        </div>

        {/* KPI 2: Total Recovered & Protected */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Recovered Revenue</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
              ${kpis.recovered_usd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Protected</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
            <span>At-Risk Remaining:</span>
            <span className="font-mono font-semibold text-rose-600 dark:text-rose-400">
              ${kpis.at_risk_usd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div 
              className="h-full bg-emerald-500 transition-all duration-500" 
              style={{ width: `${Math.min(100, (kpis.recovered_usd / Math.max(kpis.total_leakage_usd, 1)) * 100)}%` }}
            />
          </div>
        </div>

        {/* KPI 3: Autonomous Resolution Speed */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Resolution Cycle Time</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {kpis.avg_resolution_cycle_seconds}s
            </span>
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400">Instant AI</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
            <span>Manual Benchmark:</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">{kpis.manual_benchmark_days} Business Days</span>
          </div>
          <div className="mt-2 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center">
            <Zap className="h-3 w-3 mr-1" />
            <span>{kpis.efficiency_gain_pct}% acceleration vs human review</span>
          </div>
        </div>

        {/* KPI 4: Pending Approvals Gate */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Human Governance</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {kpis.awaiting_approval_count}
            </span>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">Awaiting Sign-off</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
            <span>Auto-Approved (&lt;$500):</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">{kpis.resolved_count} items</span>
          </div>
          <div className="mt-2 text-[10px] text-slate-400">
            Safety threshold active: items &ge;$500 require one click
          </div>
        </div>

      </div>

      {/* AI Executive Intelligence Narrative Generator */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                ReportBeacon Executive Resolution Briefing
              </h3>
              <p className="text-xs text-slate-500">
                Live AI-synthesized narrative for operations leadership ({timeframe})
              </p>
            </div>
          </div>
          <button
            onClick={handleGenerateBriefing}
            disabled={generatingReport}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white shadow-xs transition disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${generatingReport ? "animate-spin" : ""}`} />
            <span>{generatingReport ? "Synthesizing..." : "Generate Fresh AI Briefing"}</span>
          </button>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row gap-4 items-start">
          {/* ReportBeacon Character Presenting the Briefing */}
          <div className="flex flex-col items-center flex-shrink-0 pt-1">
            <ReportAgentAvatar className="w-16 h-20" />
            <span className="font-mono text-[9px] font-bold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/80 px-2 py-0.5 rounded-full mt-1 border border-purple-300 dark:border-purple-800">
              ReportBeacon
            </span>
            <span className="text-[9px] text-slate-400 mt-0.5">Report Agent</span>
          </div>

          <div className="flex-1 w-full space-y-3">
            <div className="relative rounded-xl bg-purple-50/70 p-4 border border-purple-100 dark:bg-purple-950/30 dark:border-purple-900/50">
              {/* Pointer indicator towards ReportBeacon */}
              <div className="hidden sm:block absolute -left-2 top-6 w-0 h-0 border-t-6 border-t-transparent border-b-6 border-b-transparent border-r-6 border-r-purple-200 dark:border-r-purple-900" />
              <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                {executiveReport?.executive_summary || (
                  `Operations Intelligence Briefing covering ${timeframe}: 
                  Reconciliation Health is indexed at ${kpis.resolution_rate_pct}%. 
                  The AI Agent fleet audited ${facilities.reduce((acc, f) => acc + f.records_audited, 0) || 47} operational records across scale houses, fleet dispatch manifests, and ERP invoicing. 
                  A total of $${kpis.total_leakage_usd.toLocaleString("en-US", { minimumFractionDigits: 2 })} in discrepancies was detected, with $${kpis.recovered_usd.toLocaleString("en-US", { minimumFractionDigits: 2 })} successfully recovered through automated adjustments. 
                  Average cycle time has been compressed from 4.8 business days to 1.2 seconds with 99.6% efficiency gain.`
                )}
              </p>
            </div>

            {/* Action Items List */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
              <div className="flex items-start space-x-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <Check className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                <div>
                  <strong className="text-slate-900 dark:text-white block font-semibold">Tonnage Reconciliations:</strong>
                  <span className="text-slate-500">TicketHawk verified scale slips #SC-8812 &amp; #SC-110 against driver tickets.</span>
                </div>
              </div>
              <div className="flex items-start space-x-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <Check className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                <div>
                  <strong className="text-slate-900 dark:text-white block font-semibold">Fleet Schedule Realignment:</strong>
                  <span className="text-slate-500">DispatchPulse synchronized truck swap TRK-208 to TRK-104 with zero penalty.</span>
                </div>
              </div>
              <div className="flex items-start space-x-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <Check className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                <div>
                  <strong className="text-slate-900 dark:text-white block font-semibold">Unbilled Haul Capture:</strong>
                  <span className="text-slate-500">BillSentry flagged compactor pull #TKT-9912 ($1,450.00) for immediate billing.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Agents in Action: Performance & Resolution Contribution Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <Bot className="h-4 w-4 text-blue-600" />
              <span>Agents in Action: Resolution Contribution</span>
            </h3>
            <p className="text-xs text-slate-500">
              Performance metrics for each specialized agent in resolving industrial discrepancies
            </p>
          </div>
          <button 
            onClick={() => onNavigateToConsole && onNavigateToConsole("ticket_hawk")}
            className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 font-semibold flex items-center"
          >
            Open Fleet Hub <ArrowRight className="h-3 w-3 ml-1" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          
          {/* Card 1: TicketHawk */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                    <Scale className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white">TicketHawk</h4>
                    <span className="font-mono text-[10px] text-slate-400">TH-01</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950">
                  99.1% Acc
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">
                Resolves gross/tare landfill scale mismatches vs field estimates.
              </p>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Scale Mismatches:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{agentPerf.ticket_hawk?.handled_count ?? 3}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Value Reconciled:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">${(agentPerf.ticket_hawk?.recovered_usd ?? 807).toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div className="mt-3 pt-2 text-[10px] text-emerald-600 font-semibold flex items-center">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse" />
              <span>{agentPerf.ticket_hawk?.status || "Active & Calibrating Scales"}</span>
            </div>
          </div>

          {/* Card 2: DispatchPulse */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                    <Truck className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white">DispatchPulse</h4>
                    <span className="font-mono text-[10px] text-slate-400">DP-02</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950">
                  98.9% Acc
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">
                Synchronizes vehicle swaps &amp; telematics GPS schedule drift.
              </p>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Route Swaps Caught:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{agentPerf.dispatch_pulse?.handled_count ?? 2}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>SLA Penalties Saved:</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">${(agentPerf.dispatch_pulse?.recovered_usd ?? 420).toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div className="mt-3 pt-2 text-[10px] text-blue-600 font-semibold flex items-center">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 mr-1 animate-pulse" />
              <span>{agentPerf.dispatch_pulse?.status || "Active & Tracking Telematics"}</span>
            </div>
          </div>

          {/* Card 3: BillSentry */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
                    <Receipt className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white">BillSentry</h4>
                    <span className="font-mono text-[10px] text-slate-400">BS-03</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950">
                  99.4% Acc
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">
                Detects unbilled container hauls, rate code drift &amp; duplicate invoices.
              </p>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Billing Issues Handled:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{agentPerf.bill_sentry?.handled_count ?? 6}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Revenue Recovered:</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">${(agentPerf.bill_sentry?.recovered_usd ?? 4627).toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div className="mt-3 pt-2 text-[10px] text-amber-600 font-semibold flex items-center">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 mr-1 animate-pulse" />
              <span>{agentPerf.bill_sentry?.status || "Active & Auditing ERP Invoices"}</span>
            </div>
          </div>

          {/* Card 4: DisputeShield */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white">DisputeShield</h4>
                    <span className="font-mono text-[10px] text-slate-400">DS-05</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-950">
                  98.7% Acc
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">
                Resolves customer claims with signed receipts &amp; certified scale proof.
              </p>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Claims Arbitrated:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{agentPerf.dispute_shield?.handled_count ?? 3}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Disputes Settled:</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400">${(agentPerf.dispute_shield?.recovered_usd ?? 415).toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div className="mt-3 pt-2 text-[10px] text-rose-600 font-semibold flex items-center">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500 mr-1 animate-pulse" />
              <span>{agentPerf.dispute_shield?.status || "Active & Customer Proof Ready"}</span>
            </div>
          </div>

          {/* Card 5: ReportBeacon (The Operations Reporting Agent) */}
          <div className="rounded-xl border border-purple-200/80 bg-white p-4 shadow-xs dark:border-purple-900/60 dark:bg-slate-900 flex flex-col justify-between ring-1 ring-purple-500/10">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="p-0.5 rounded-lg bg-purple-50/80 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 flex-shrink-0">
                    <ReportAgentAvatar className="w-8 h-10" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-1">
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white">ReportBeacon</h4>
                      <span className="font-mono text-[9px] font-bold px-1 rounded bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">RB-04</span>
                    </div>
                    <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold block">Report Console Agent</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-purple-700 dark:text-purple-400 px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-950">
                  99.9% Acc
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">
                Powers this Report Console with tenant-wide telemetry, KPIs &amp; automated executive briefings.
              </p>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Records Audited:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{agentPerf.ops_beacon?.handled_count ?? 38}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>KPI Categories:</span>
                  <span className="font-bold text-purple-600 dark:text-purple-400">14 Core Metrics</span>
                </div>
              </div>
            </div>
            <div className="mt-3 pt-2 text-[10px] text-purple-600 font-semibold flex items-center">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-500 mr-1 animate-pulse" />
              <span>Active &amp; Publishing Reports</span>
            </div>
          </div>

        </div>
      </div>

      {/* Facility Resolution Matrix & Exception Class Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Facility Breakdown */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-2">
              <Building2 className="h-4 w-4 text-slate-500" />
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">
                Disposal Facility Resolution Matrix
              </h4>
            </div>
            <span className="text-[11px] text-slate-400">Certified Weighbridges</span>
          </div>
          <div className="mt-3 space-y-2.5">
            {facilities.map((fac, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-xs">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">{fac.name}</div>
                  <div className="text-[11px] text-slate-500">{fac.records_audited} load tickets audited</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-emerald-600 dark:text-emerald-400">
                    +${fac.recovered_usd.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-slate-400">{fac.exceptions_resolved} issues resolved</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Resolution Speed & Benchmark Comparison */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-slate-500" />
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">
                Operational Benchmark: Manual vs Agent Fleet
              </h4>
            </div>
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">99.6% Faster</span>
          </div>
          
          <div className="mt-4 space-y-4">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-700 dark:text-slate-300">Exception Detection Time</span>
                <span className="text-emerald-600">0.8s (AI) vs 3.2 Days (Manual)</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: "98%" }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-700 dark:text-slate-300">Cross-Reconciliation (Scale vs Invoice)</span>
                <span className="text-blue-600">1.2s (AI) vs 4.8 Days (Manual)</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div className="h-full bg-blue-500" style={{ width: "95%" }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-700 dark:text-slate-300">Customer Dispute Evidence Synthesis</span>
                <span className="text-purple-600">2.1s (AI) vs 5.5 Days (Manual)</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div className="h-full bg-purple-500" style={{ width: "92%" }} />
              </div>
            </div>

            <div className="p-3 rounded-lg bg-blue-50/60 dark:bg-blue-950/30 text-xs text-blue-900 dark:text-blue-200 border border-blue-200/60 dark:border-blue-900/40">
              💡 <strong>Human Governance Safeguard:</strong> All auto-resolutions under $500 apply instantly. Exceptions exceeding $500 or impacting multiple accounts require a one-click operational sign-off.
            </div>
          </div>
        </div>

      </div>

      {/* Agents in Action: Live Resolution Feed & Audit Stream */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-2">
              <Zap className="h-4 w-4 text-emerald-500 animate-pulse" />
              <span>Agents in Action: Live Resolution Stream</span>
            </h3>
            <p className="text-xs text-slate-500">
              Real-time audit log of discrepancies resolved by autonomous agents
            </p>
          </div>

          {/* Filter Chips */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
            {["all", "quantity_mismatch", "rate_mismatch", "unbilled_job", "dispatch_discrepancy"].map((ft) => (
              <button
                key={ft}
                onClick={() => setFilterType(ft)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition capitalize ${
                  filterType === ft
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
                }`}
              >
                {ft.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Resolution Items List */}
        <div className="space-y-3">
          {filteredStream.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No matching resolutions in current stream. Click "Run Agent Resolution Sweep" above to process pending items!
            </div>
          ) : (
            filteredStream.map((item, idx) => {
              const isResolved = item.status === "resolved" || item.status === "approved";
              return (
                <div
                  key={item.exception_id || idx}
                  className="p-3.5 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/60 dark:bg-slate-800/50 dark:border-slate-800 transition flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div className="flex items-start space-x-3">
                    <div className="mt-0.5">
                      <span className={`inline-flex items-center justify-center h-8 w-8 rounded-lg bg-${item.agent_color}-100 text-${item.agent_color}-700 dark:bg-${item.agent_color}-950 dark:text-${item.agent_color}-300 font-bold text-xs`}>
                        {item.agent_code}
                      </span>
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-xs text-slate-900 dark:text-white">
                          {item.title}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.2 rounded-full uppercase ${
                          isResolved 
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        }`}>
                          {item.status.replace("_", " ")}
                        </span>
                      </div>
                      
                      <div className="text-[11px] text-slate-600 dark:text-slate-300 flex items-center space-x-2">
                        <span>Agent <strong>{item.agent_name}</strong></span>
                        <span>•</span>
                        <span className="italic">{item.action_taken}</span>
                      </div>

                      <div className="text-[10px] text-slate-400 font-mono">
                        {item.resolved_at ? `Resolved ${new Date(item.resolved_at).toLocaleTimeString()}` : `Detected ${new Date(item.detected_at).toLocaleTimeString()}`}
                      </div>
                    </div>
                  </div>

                  {/* Financial Value & Action Button */}
                  <div className="flex items-center justify-between md:justify-end space-x-4 pl-11 md:pl-0">
                    <div className="text-right">
                      <div className="text-xs font-mono font-extrabold text-slate-900 dark:text-white">
                        ${item.amount.toFixed(2)}
                      </div>
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                        {isResolved ? "Recovered" : "At Risk"}
                      </div>
                    </div>

                    {item.status === "awaiting_approval" && (
                      <button
                        onClick={async () => {
                          try {
                            await api.updateException(item.exception_id, { status: "approved" });
                            await loadData();
                          } catch (e) {
                            console.error(e);
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition"
                      >
                        1-Click Approve
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>

    </div>
  );
}
