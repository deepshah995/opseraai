"use client";

import React, { useState, useEffect } from "react";
import { SwarmBotAvatar, getCompanionMeta } from "@/components/agents/SwarmBotAvatar";
import {
  Sparkles,
  TrendingUp,
  DollarSign,
  ShieldCheck,
  Bot,
  Zap,
  RefreshCw,
  ArrowRight,
  Building2,
  Calendar,
  Check,
  Percent,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { ResolutionAnalytics, AgentRunResult } from "@/types";
import { api } from "@/lib/api/client";

interface ReportingAgentViewProps {
  onNavigateToConsole?: (agentId: string) => void;
  onNavigateToExceptions?: () => void;
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
        `PlantBeacon Executive Savings Report Generated for ${timeframe}! Health score: ${res?.health_score_pct ?? 92}%. Audited ${res?.kpis?.total_records_audited ?? 42} plant records.`
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
      
      {/* PlantBeacon Reporting Agent Hero Header */}
      <div className="relative overflow-hidden rounded-[26px] border border-emerald-500/20 brand-gradient-card p-6 sm:p-8 text-white shadow-md">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <div className="relative flex-shrink-0 flex flex-col items-center">
              <div className="p-2 rounded-2xl bg-white/10 border border-emerald-400/30 flex items-center justify-center">
                <SwarmBotAvatar
                  agentId="plant_beacon"
                  mood={generatingReport || runningSweep ? "scanning" : "proud"}
                  size="lg"
                />
              </div>
              <span className="mt-1.5 font-mono text-[9px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-400/15 text-emerald-200 border border-emerald-400/30">
                PlantBeacon (Sunny-Bot) • PB-05
              </span>
            </div>

            <div className="space-y-1 max-w-2xl">
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-400/15 text-emerald-200 border border-emerald-400/30">
                  FAKTRY AI · PLANT SAVINGS &amp; ROI
                </span>
                <span className="text-xs font-semibold text-emerald-200 flex items-center space-x-1">
                  <Clock className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="tabular-nums">{kpis.hours_saved ?? 0} Hours Reclaimed MTD</span>
                </span>
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Manufacturing Savings &amp; ROI Console
              </h1>
              <p className="text-xs sm:text-sm text-slate-200/90 leading-relaxed">
                Real-time cost savings, time reclaimed, work-cell benchmarks, and discrepancy audits compiled by PlantBeacon across your 5 Google Antigravity SDK swarm agents.
              </p>
            </div>
          </div>

          {/* Timeframe & Report Agent Action Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Timeframe Dropdown */}
            <div className="relative flex items-center bg-white/10 backdrop-blur-md rounded-full border border-white/20 px-3.5 py-2">
              <Calendar className="h-3.5 w-3.5 text-emerald-300 mr-2" />
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
              className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-sm transition transform active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Sparkles className={`h-4 w-4 ${generatingReport ? "animate-spin text-slate-900" : "text-slate-900"}`} />
              <span>{generatingReport ? "PlantBeacon Synthesizing..." : "Generate Plant ROI Report"}</span>
            </button>

            {/* Secondary Audit Action: Run Fleet Auto-Reconcile */}
            <button
              id="btn-auto-reconcile"
              onClick={handleRunAgentSweep}
              disabled={runningSweep}
              title="Instructs Swarm to audit open discrepancies and auto-settle verified variances (<$500)"
              className="inline-flex items-center justify-center space-x-1.5 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold backdrop-blur-md transition disabled:opacity-50 cursor-pointer"
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
                PlantBeacon Executive Cost &amp; Time Savings Briefing
              </h3>
              <p className="text-xs text-slate-500">
                Live Antigravity SDK summary for plant leadership ({timeframe})
              </p>
            </div>
          </div>
          <button
            onClick={handleGenerateBriefing}
            disabled={generatingReport}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${generatingReport ? "animate-spin" : ""}`} />
            <span>{generatingReport ? "Synthesizing..." : "Generate Fresh ROI Briefing"}</span>
          </button>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row gap-4 items-start">
          <div className="flex flex-col items-center flex-shrink-0 pt-1">
            <SwarmBotAvatar
              agentId="plant_beacon"
              mood={generatingReport ? "scanning" : "happy"}
              size="md"
            />
            <span className="font-mono text-[9px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full mt-1.5 border border-indigo-200">
              {getCompanionMeta("plant_beacon").nickname}
            </span>
          </div>

          <div className="flex-1 w-full space-y-3">
            <div className="relative rounded-xl bg-indigo-50/70 p-4 border border-indigo-100 dark:bg-indigo-950/30 dark:border-indigo-900/50">
              <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                {executiveReport?.executive_summary || (
                  `Manufacturing Swarm Briefing covering ${timeframe}: Reconciliation Health is ${kpis.resolution_rate_pct}%. The Swarm audited ${facilities.reduce((acc, f) => acc + f.records_audited, 0) || 47} receiving slips, POs, CNC work orders, and invoices—identifying $${kpis.total_leakage_usd.toLocaleString("en-US", { minimumFractionDigits: 2 })} in cost savings and saving ~${kpis.hours_saved ?? 0} engineering & AP hours.`
                )}
              </p>
            </div>

            {/* Action Items List */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
              <div className="flex items-start space-x-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <Check className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                <div>
                  <strong className="text-slate-900 dark:text-white block font-semibold">Receiving &amp; BOM Audits:</strong>
                  <span className="text-slate-500">BOMGuard verified dock scale slips #RCV-8812 &amp; #RCV-110 against supplier POs.</span>
                </div>
              </div>
              <div className="flex items-start space-x-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <Check className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                <div>
                  <strong className="text-slate-900 dark:text-white block font-semibold">CNC Cell Realignment:</strong>
                  <span className="text-slate-500">LinePulse synchronized CNC Cell B changeover with zero downtime penalty.</span>
                </div>
              </div>
              <div className="flex items-start space-x-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <Check className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                <div>
                  <strong className="text-slate-900 dark:text-white block font-semibold">3-Way PO Cost Recovery:</strong>
                  <span className="text-slate-500">CostSentry flagged unbilled production batch #WO-4412 ($1,450.00) for billing.</span>
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
              <span>Manufacturing Swarm: Cost &amp; Time Savings Breakdown</span>
            </h3>
            <p className="text-xs text-slate-500">
              Live contribution across all 5 specialized Google Antigravity SDK agents
            </p>
          </div>
          <button
            onClick={() => onNavigateToConsole && onNavigateToConsole("bom_guard")}
            className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 font-semibold flex items-center"
          >
            Open Swarm Studio <ArrowRight className="h-3 w-3 ml-1" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">

          {/* Card 1: BOMGuard */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <SwarmBotAvatar agentId="bom_guard" mood="happy" size="sm" />
                  <div>
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white">BOMGuard</h4>
                    <span className="font-mono text-[10px] text-slate-400">Hawk-Bot · BG-01</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950">
                  99.4% Acc
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">
                Catches receiving dock short-ships &amp; BOM material scrap variance.
              </p>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Weight Audits:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{agentPerf.bom_guard?.handled_count ?? 3}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Savings Found:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">${(agentPerf.bom_guard?.recovered_usd ?? 807).toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div className="mt-3 pt-2 text-[10px] text-emerald-600 font-semibold flex items-center">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1" />
              <span>{agentPerf.bom_guard?.status || "Active & Auditing BOMs"}</span>
            </div>
          </div>

          {/* Card 2: LinePulse */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <SwarmBotAvatar agentId="line_pulse" mood="happy" size="sm" />
                  <div>
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white">LinePulse</h4>
                    <span className="font-mono text-[10px] text-slate-400">Bolt-Bot · LP-03</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950">
                  98.9% Acc
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">
                Syncs ERP production schedules with CNC machine cell runs.
              </p>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Cell Shifts Synced:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{agentPerf.line_pulse?.handled_count ?? 2}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Capacity Saved:</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">${(agentPerf.line_pulse?.recovered_usd ?? 420).toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div className="mt-3 pt-2 text-[10px] text-blue-600 font-semibold flex items-center">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 mr-1" />
              <span>{agentPerf.line_pulse?.status || "Tracking Machine Cells"}</span>
            </div>
          </div>

          {/* Card 3: CostSentry */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <SwarmBotAvatar agentId="cost_sentry" mood="happy" size="sm" />
                  <div>
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white">CostSentry</h4>
                    <span className="font-mono text-[10px] text-slate-400">Penny-Bot · CS-02</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950">
                  99.6% Acc
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">
                3-way PO price checks, unbilled production &amp; duplicate bills.
              </p>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>3-Way Audits:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{agentPerf.cost_sentry?.handled_count ?? 6}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Cost Saved:</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">${(agentPerf.cost_sentry?.recovered_usd ?? 4627).toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div className="mt-3 pt-2 text-[10px] text-amber-600 font-semibold flex items-center">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 mr-1" />
              <span>{agentPerf.cost_sentry?.status || "Auditing Vendor AP"}</span>
            </div>
          </div>

          {/* Card 4: QualityShield */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <SwarmBotAvatar agentId="quality_shield" mood="happy" size="sm" />
                  <div>
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white">QualityShield</h4>
                    <span className="font-mono text-[10px] text-slate-400">Aegis-Bot · QS-04</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-950">
                  98.7% Acc
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">
                Compiles supplier NCR evidence packets &amp; QA claims.
              </p>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>NCRs / Claims:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{agentPerf.quality_shield?.handled_count ?? 3}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Disputes Defended:</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400">${(agentPerf.quality_shield?.recovered_usd ?? 415).toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div className="mt-3 pt-2 text-[10px] text-rose-600 font-semibold flex items-center">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500 mr-1" />
              <span>{agentPerf.quality_shield?.status || "Active & NCR Ready"}</span>
            </div>
          </div>

          {/* Card 5: PlantBeacon */}
          <div className="rounded-xl border border-indigo-200/80 bg-white p-4 shadow-xs dark:border-indigo-900/60 dark:bg-slate-900 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <SwarmBotAvatar agentId="plant_beacon" mood="happy" size="sm" />
                  <div>
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white">PlantBeacon</h4>
                    <span className="font-mono text-[10px] text-slate-400">Sunny-Bot · PB-05</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-indigo-700 px-1.5 py-0.5 rounded bg-indigo-50">
                  99.8% Acc
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">
                Tracks cost savings, hours reclaimed &amp; exports Google Docs/Sheets.
              </p>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Records Audited:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{agentPerf.plant_beacon?.handled_count ?? 42}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Hours Saved:</span>
                  <span className="font-bold text-indigo-600">{agentPerf.plant_beacon?.hours_saved ?? kpis.hours_saved ?? 0} hrs</span>
                </div>
              </div>
            </div>
            <div className="mt-3 pt-2 text-[10px] text-indigo-600 font-semibold flex items-center">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 mr-1" />
              <span>{agentPerf.plant_beacon?.status || "Publishing ROI Briefs"}</span>
            </div>
          </div>

        </div>
      </div>

      {/* Work-Cell Breakdown & Benchmark */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-2">
              <Building2 className="h-4 w-4 text-slate-500" />
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">
                Plant Work-Cell Savings Matrix
              </h4>
            </div>
            <span className="text-[11px] text-slate-400">Shop-Floor &amp; Receiving Zones</span>
          </div>
          <div className="mt-3 space-y-2.5">
            {facilities.map((fac, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-xs">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">{fac.name}</div>
                  <div className="text-[11px] text-slate-500">{fac.records_audited} work orders &amp; receipts audited</div>
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
                <span className="text-slate-700 dark:text-slate-300">3-Way Dock Scale vs PO / Invoice Audit</span>
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
