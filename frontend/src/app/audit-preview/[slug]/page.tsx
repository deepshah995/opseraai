"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { SwarmBotAvatar } from "@/components/agents/SwarmBotAvatar";
import { SkeletalWorkflowSandbox } from "@/features/agents/SkeletalWorkflowSandbox";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  DollarSign,
  Factory,
  FileSpreadsheet,
  Play,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

interface ProspectAgentPlan {
  agent_id: string;
  agent_name: string;
  code_name: string;
  focus: string;
  workflow_hook: string;
  est_hours_saved_month: number;
}

interface ProspectPreviewFinding {
  issue_title: string;
  agent_name: string;
  exception_type: string;
  estimated_monthly_impact_usd: number;
  reclaimed_hours_month: number;
  source_systems: string[];
  summary: string;
  is_simulated: boolean;
}

interface ProspectPreviewData {
  slug: string;
  domain: string;
  company_name: string;
  subsector: string;
  location: string;
  erp_stack: string[];
  compliance_tags: string[];
  executive_hook: string;
  observed_signals: string[];
  top_opportunities: string[];
  agent_deployments: ProspectAgentPlan[];
  simulated_findings: ProspectPreviewFinding[];
  est_monthly_savings_usd: number;
  est_monthly_hours_saved: number;
  pilot_plan: Array<{ phase: string; detail: string }>;
  simulation_notice: string;
}

export default function ProspectAuditPreviewPage() {
  const params = useParams<{ slug: string }>();
  const slug = typeof params?.slug === "string" ? params.slug : "";

  const [preview, setPreview] = useState<ProspectPreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [simStep, setSimStep] = useState<number>(-1);
  const [simDone, setSimDone] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/previews/${encodeURIComponent(slug)}`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("Custom audit preview not found for this link.");
        }
        return res.json();
      })
      .then((data: ProspectPreviewData) => {
        if (!cancelled) {
          setPreview(data);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message || "Unable to load preview.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const handleRunSimulation = () => {
    if (!preview || preview.agent_deployments.length === 0) return;
    setSimDone(false);
    setSimStep(0);
  };

  useEffect(() => {
    if (!preview || simStep < 0) return;
    if (simStep >= preview.agent_deployments.length) {
      setSimDone(true);
      return;
    }
    const timer = setTimeout(() => {
      setSimStep((prev) => prev + 1);
    }, 650);
    return () => clearTimeout(timer);
  }, [preview, simStep]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex items-center gap-3 text-sm text-slate-700">
          <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
          <span>Loading custom Faktry AI Ops Audit Preview...</span>
        </div>
      </div>
    );
  }

  if (error || !preview) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md bg-white border border-slate-200 rounded-2xl p-7 shadow-xs space-y-4 text-center">
          <Factory className="h-8 w-8 text-slate-700 mx-auto" />
          <h1 className="text-lg font-bold text-slate-900">Audit Preview Unavailable</h1>
          <p className="text-xs text-slate-600 leading-relaxed">
            {error || "This custom manufacturing preview link was not found."} You can still explore
            the full live Faktry AI Manufacturing Operations Swarm workspace below.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg bg-slate-900 hover:bg-slate-800 text-white"
          >
            Open Live Faktry AI Workspace
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  const annualSavings = preview.est_monthly_savings_usd * 12;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white px-4 lg:px-8 h-14 flex items-center justify-between gap-4 sticky top-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-8 w-8 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0">
            <Factory className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-900 truncate">
                Faktry AI Manufacturing
              </span>
              <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                Zero ERP Replacement Sidecar
              </span>
            </div>
            <p className="text-[11px] text-slate-500 truncate">
              14-Day Read-Only Audit Preview · Prepared for {preview.company_name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden md:inline-flex px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
            Simulation Benchmark Mode
          </span>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
          >
            Open Full Live Studio
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Simulation Honest Disclaimer */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-2.5 text-xs text-blue-900">
          <Sparkles className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
          <p>{preview.simulation_notice}</p>
        </div>

        {/* Hero Executive Summary */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-xs space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-2xl space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-medium">
                <span>{preview.subsector}</span>
                <span>•</span>
                <span>{preview.location}</span>
                <span>•</span>
                <span>{preview.domain}</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {preview.company_name}: 14-Day Ops Sidecar Audit Preview
              </h1>
              <p className="text-sm text-slate-600 leading-relaxed">{preview.executive_hook}</p>
            </div>

            <div className="flex flex-col gap-2 shrink-0">
              <button
                type="button"
                onClick={handleRunSimulation}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs"
              >
                <Play className="h-4 w-4" />
                {simStep >= 0 && !simDone
                  ? "Running Swarm Preview..."
                  : "Simulate Faktry AI Sidecar Run"}
              </button>
              <Link
                href="/guide"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                See How Read-Only Ingestion Works
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Connected Read-Only Stack Modeled
              </p>
              <div className="flex flex-wrap gap-1.5">
                {preview.erp_stack.map((sys) => (
                  <span
                    key={sys}
                    className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200"
                  >
                    {sys}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Quality &amp; Compliance Workflows
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(preview.compliance_tags.length > 0
                  ? preview.compliance_tags
                  : ["Shop-Floor Traceability", "Vendor PO Audit"]
                ).map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-800 text-xs font-medium border border-indigo-200"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Simulated Benchmark KPIs */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>Illustrative Monthly Cost Recovery</span>
              <DollarSign className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">
              ${preview.est_monthly_savings_usd.toLocaleString()}/mo
            </p>
            <p className="text-xs text-emerald-700 mt-1 font-medium">
              ~${annualSavings.toLocaleString()}/yr annualized benchmark
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>Estimated Engineering &amp; QA Hours Saved</span>
              <Clock className="h-4 w-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">
              {preview.est_monthly_hours_saved} hrs/mo
            </p>
            <p className="text-xs text-blue-700 mt-1 font-medium">
              Across PO audits, scheduling sync &amp; cert packets
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>Approval &amp; ERP Safety Control</span>
              <ShieldCheck className="h-4 w-4 text-indigo-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">100% Read-Only</p>
            <p className="text-xs text-slate-600 mt-1">
              Human manager approval required before any adjustment
            </p>
          </div>
        </section>

        {/* Interactive Skeletal Drag-and-Drop Workflow Orchestration Sandbox */}
        <SkeletalWorkflowSandbox
          companyName={preview.company_name}
          erpStack={preview.erp_stack}
          agentDeployments={preview.agent_deployments}
        />

        {/* Assigned Swarm Agents & Interactive Stepper */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Recommended Faktry AI Agents for {preview.company_name}
              </h2>
              <p className="text-xs text-slate-500">
                Mapped directly from {preview.company_name}&apos;s plant footprint and system signals
              </p>
            </div>
            {simDone && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Simulation Complete — {preview.simulated_findings.length} Sample Checks Flagged
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {preview.agent_deployments.map((ag, idx) => {
              const isRunning = simStep === idx;
              const isFinished = simDone || simStep > idx;
              return (
                <div
                  key={ag.agent_id}
                  className={`rounded-xl border p-4 transition-all flex items-start gap-3.5 ${
                    isRunning
                      ? "border-blue-400 bg-blue-50/40"
                      : isFinished
                      ? "border-emerald-300 bg-emerald-50/30"
                      : "border-slate-200 bg-slate-50/40"
                  }`}
                >
                  <SwarmBotAvatar
                    agentId={ag.agent_id}
                    mood={isRunning ? "scanning" : isFinished ? "proud" : "happy"}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{ag.agent_name}</span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                          {ag.code_name}
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold text-blue-700">
                        ~{ag.est_hours_saved_month} hrs/mo
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-700">{ag.focus}</p>
                    <p className="text-xs text-slate-600 leading-relaxed">{ag.workflow_hook}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Simulated Exceptions Tailored to Plant */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Illustrative Catches Modeled Around Your Stack
              </h2>
              <p className="text-xs text-slate-500">
                Examples of side-by-side discrepancies surfaced before monthly AP/AR or shipment release
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {preview.simulated_findings.map((finding, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-slate-200 p-4 bg-slate-50/60 flex flex-col justify-between gap-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                      <AlertTriangle className="h-3 w-3" />
                      Simulated · {finding.agent_name}
                    </span>
                    <span className="text-xs font-bold text-emerald-700">
                      ${finding.estimated_monthly_impact_usd.toLocaleString()}/mo
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-slate-900 leading-snug">
                    {finding.issue_title}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{finding.summary}</p>
                </div>

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="truncate">{finding.source_systems.join(" ↔ ")}</span>
                  <span className="font-semibold text-slate-700 shrink-0 ml-2">
                    {finding.reclaimed_hours_month} hrs/mo
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Observed Plant Signals & 14-Day Pilot Plan */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
            <h2 className="text-base font-bold text-slate-900">
              Observed Operational Signals Used for This Preview
            </h2>
            <ul className="space-y-2 text-xs text-slate-600 list-disc pl-4">
              {preview.observed_signals.map((sig, i) => (
                <li key={i} className="leading-relaxed">
                  {sig}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xs space-y-4">
            <div>
              <h2 className="text-base font-bold">14-Day Zero-Disruption Pilot Framework</h2>
              <p className="text-xs text-slate-300 mt-1">
                Prove hard dollar recovery on your own exports before deciding on full rollout.
              </p>
            </div>
            <div className="space-y-3">
              {preview.pilot_plan.map((step, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
                  <p className="text-xs font-bold text-emerald-400">{step.phase}</p>
                  <p className="text-xs text-slate-200 mt-1 leading-relaxed">{step.detail}</p>
                </div>
              ))}
            </div>
            <div className="pt-1">
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold"
              >
                Explore Live Interactive Faktry AI Demo
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
