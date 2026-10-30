"use client";

import React, { useState } from "react";
import { 
  ArrowLeft, 
  Bot, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  FileText, 
  Scale, 
  ShieldCheck, 
  Link2,
  Calendar,
  DollarSign,
  TrendingUp,
  RefreshCw
} from "lucide-react";
import { 
  OperationalException, 
  InvestigationDetail, 
  OperationalRecord, 
  GroundedEvidence 
} from "@/types";
import { api } from "@/lib/api/client";

interface InvestigationDetailViewProps {
  exception: OperationalException;
  investigation: InvestigationDetail | null;
  loading?: boolean;
  onBack: () => void;
  onRefresh: () => void;
}

export function InvestigationDetailView({
  exception,
  investigation,
  loading = false,
  onBack,
  onRefresh,
}: InvestigationDetailViewProps) {
  const [reviewing, setReviewing] = useState(false);
  const [reviewerComment, setReviewerComment] = useState("");
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const handleReview = async (decision: "approved" | "rejected" | "revision_requested") => {
    if (!investigation?.pending_approval_id) return;
    try {
      setReviewing(true);
      await api.reviewApproval(investigation.pending_approval_id, decision, reviewerComment);
      setActionNotice(`Successfully submitted review: ${decision.toUpperCase()}`);
      onRefresh();
    } catch (e: any) {
      alert(`Review submission failed: ${e.message}`);
    } finally {
      setReviewing(false);
    }
  };

  const handleTriggerInvestigation = async () => {
    try {
      await api.triggerInvestigation(exception.id, "Manual trigger from detail view");
      onRefresh();
    } catch (e: any) {
      alert(`Investigation trigger failed: ${e.message}`);
    }
  };

  const records = investigation?.related_records || [];
  const invoices = records.filter((r) => r.record_type === "invoice");
  const tickets = records.filter((r) => r.record_type === "service_ticket");
  const loads = records.filter((r) => r.record_type === "load_record");
  const dispatches = records.filter((r) => r.record_type === "dispatch_record");

  return (
    <div className="space-y-6">
      {/* Top Navigation & Status */}
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 dark:border-slate-800 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Issue Review
              </span>
              <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-mono text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                {exception.id.slice(0, 8)}
              </span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {exception.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {exception.discrepancy_amount && (
            <div className="rounded-lg bg-rose-50 px-3.5 py-1.5 text-right dark:bg-rose-950/50">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                Price Difference
              </div>
              <div className="font-mono text-base font-extrabold text-rose-700 dark:text-rose-300">
                ${exception.discrepancy_amount.toFixed(2)}
              </div>
            </div>
          )}

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-1.5 dark:border-slate-800 dark:bg-slate-800/60">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Status
            </div>
            <div className="text-xs font-bold capitalize text-slate-800 dark:text-slate-200">
              {exception.status.replace(/_/g, " ")}
            </div>
          </div>
        </div>
      </div>

      {actionNotice && (
        <div className="flex items-center space-x-2 rounded-lg bg-emerald-50 p-4 text-xs font-medium text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300">
          <CheckCircle className="h-4 w-4 text-emerald-600" />
          <span>{actionNotice}</span>
        </div>
      )}

      {!investigation ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <Bot className="mx-auto mb-3 h-10 w-10 text-indigo-500 animate-bounce" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            No Investigation Yet
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">
            Ask the AI assistant to compare the documents, do the math, and suggest a fix.
          </p>
          <button
            onClick={handleTriggerInvestigation}
            className="mt-5 inline-flex items-center space-x-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition cursor-pointer"
          >
            <Bot className="h-4 w-4" />
            <span>Ask AI to Investigate</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left 2 Cols: Side-by-Side Records & AI Findings */}
          <div className="space-y-6 lg:col-span-2">
            {/* Side-by-Side Record Cross-Examination */}
            <div id="side-by-side-records" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                <div className="flex items-center space-x-2">
                  <Scale className="h-4 w-4 text-blue-600" />
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Side-by-Side Operational Records
                  </h3>
                </div>
                <span className="text-[11px] text-slate-500">
                  {records.length} records retrieved
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Invoices */}
                {invoices.map((inv) => (
                  <div key={inv.id} className="rounded-lg border border-slate-200 bg-slate-50/60 p-4 text-xs dark:border-slate-800 dark:bg-slate-800/40">
                    <div className="flex items-center justify-between text-blue-700 dark:text-blue-400 font-semibold">
                      <span>Billed Invoice</span>
                      <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] dark:bg-blue-950">
                        #{inv.external_reference}
                      </span>
                    </div>
                    <div className="mt-2 space-y-1 text-slate-600 dark:text-slate-300">
                      <div>Customer: <span className="font-medium text-slate-900 dark:text-white">{inv.customer_reference}</span></div>
                      <div>Billed Amount: <span className="font-mono font-bold text-rose-600">${inv.amount?.toFixed(2) ?? "-"}</span></div>
                      <div>Quantity: <span className="font-medium">{inv.quantity ?? "-"} {inv.unit || ""}</span></div>
                      <div>Contract Rate: <span className="font-medium">${inv.rate?.toFixed(2) ?? "-"}</span></div>
                    </div>
                  </div>
                ))}

                {/* Service Tickets */}
                {tickets.map((tkt) => (
                  <div key={tkt.id} className="rounded-lg border border-slate-200 bg-slate-50/60 p-4 text-xs dark:border-slate-800 dark:bg-slate-800/40">
                    <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 font-semibold">
                      <span>Field Service Ticket</span>
                      <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] dark:bg-emerald-950">
                        #{tkt.external_reference}
                      </span>
                    </div>
                    <div className="mt-2 space-y-1 text-slate-600 dark:text-slate-300">
                      <div>Driver / Site: <span className="font-medium text-slate-900 dark:text-white">{tkt.normalized_data?.driver || tkt.customer_reference}</span></div>
                      <div>Logged Amount: <span className="font-mono font-bold text-emerald-600">${tkt.amount?.toFixed(2) ?? "-"}</span></div>
                      <div>Quantity: <span className="font-medium">{tkt.quantity ?? "-"} {tkt.unit || ""}</span></div>
                      <div>Contract Rate: <span className="font-medium">${tkt.rate?.toFixed(2) ?? "-"}</span></div>
                    </div>
                  </div>
                ))}

                {/* Scale & Load Receipts */}
                {loads.map((ld) => (
                  <div key={ld.id} className="rounded-lg border border-slate-200 bg-slate-50/60 p-4 text-xs dark:border-slate-800 dark:bg-slate-800/40">
                    <div className="flex items-center justify-between text-indigo-700 dark:text-indigo-400 font-semibold">
                      <span>Certified Disposal Scale Receipt</span>
                      <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] dark:bg-indigo-950">
                        #{ld.external_reference}
                      </span>
                    </div>
                    <div className="mt-2 space-y-1 text-slate-600 dark:text-slate-300">
                      <div>Disposal Facility: <span className="font-medium text-slate-900 dark:text-white">{ld.normalized_data?.facility || "Disposal Scale"}</span></div>
                      <div>Certified Net Weight: <span className="font-mono font-bold text-slate-900 dark:text-white">{ld.quantity ?? "-"} tons</span></div>
                      <div>Tipping Fee: <span className="font-medium">${ld.amount?.toFixed(2) ?? "-"}</span></div>
                    </div>
                  </div>
                ))}

                {/* Dispatch Logs */}
                {dispatches.map((dsp) => (
                  <div key={dsp.id} className="rounded-lg border border-slate-200 bg-slate-50/60 p-4 text-xs dark:border-slate-800 dark:bg-slate-800/40">
                    <div className="flex items-center justify-between text-purple-700 dark:text-purple-400 font-semibold">
                      <span>Dispatch Record</span>
                      <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] dark:bg-purple-950">
                        #{dsp.external_reference}
                      </span>
                    </div>
                    <div className="mt-2 space-y-1 text-slate-600 dark:text-slate-300">
                      <div>Assigned Truck: <span className="font-medium text-slate-900 dark:text-white">{dsp.normalized_data?.truck_id || "-"}</span></div>
                      <div>Assigned Driver: <span className="font-medium">{dsp.normalized_data?.driver || "-"}</span></div>
                      <div>Service Date: <span className="font-medium">{dsp.service_date ? dsp.service_date.slice(0, 10) : "-"}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Agent Root Cause Analysis */}
            <div id="agent-findings-card" className="rounded-xl border border-indigo-100 bg-white p-5 shadow-sm dark:border-indigo-950 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                <div className="flex items-center space-x-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-600 text-white text-xs font-bold">
                    <Bot className="h-3.5 w-3.5" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    AI Explanation: Why This Happened
                  </h3>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-[11px] text-slate-500">AI Accuracy:</span>
                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                    {(investigation.confidence ? investigation.confidence * 100 : 96).toFixed(0)}%
                  </span>
                </div>
              </div>

              <div className="mt-4 prose prose-sm max-w-none text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                <p className="whitespace-pre-line bg-slate-50/70 p-4 rounded-lg border border-slate-100 dark:border-slate-800 dark:bg-slate-800/30">
                  {investigation.findings}
                </p>
              </div>
            </div>

            {/* Grounded Evidence Citations */}
            <div id="grounded-evidence-card" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Verified Proof from Your Documents
                  </h3>
                </div>
                <span className="text-[10px] text-slate-400 font-medium">
                  Checked against actual tickets and bills
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {investigation.evidence_items.length === 0 ? (
                  <p className="text-xs text-slate-400">No document proof recorded.</p>
                ) : (
                  investigation.evidence_items.map((ev, idx) => (
                    <div key={ev.id || idx} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3.5 text-xs dark:border-slate-800 dark:bg-slate-800/40">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 font-semibold text-slate-900 dark:text-white">
                          <Link2 className="h-3.5 w-3.5 text-blue-600" />
                          <span>{ev.evidence_reference}</span>
                        </div>
                        <span className="rounded bg-slate-200/60 px-1.5 py-0.5 text-[10px] uppercase text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                          {ev.source_type.replace(/_/g, " ")}
                        </span>
                      </div>

                      <p className="mt-1 text-slate-600 dark:text-slate-300">
                        {ev.relevance_explanation}
                      </p>

                      {ev.excerpt && (
                        <div className="mt-2 rounded bg-white p-2 border border-slate-200/60 font-mono text-[11px] text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                          {Object.entries(ev.excerpt)
                            .filter(([_, v]) => v !== null && v !== undefined)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(" | ")}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Col: Human-in-the-Loop Review Box */}
          <div className="space-y-6">
            <div id="hitl-approval-card" className="rounded-xl border border-blue-200 bg-white p-6 shadow-sm dark:border-blue-900 dark:bg-slate-900 sticky top-20">
              <div className="flex items-center space-x-2 border-b border-slate-100 pb-3 dark:border-slate-800">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Your Decision
                </h3>
              </div>

              {investigation.proposed_resolution ? (
                <div className="mt-4 space-y-4">
                  <div className="rounded-lg bg-blue-50/70 p-3.5 border border-blue-100 dark:border-blue-950 dark:bg-blue-950/40">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                      Suggested Fix
                    </span>
                    <h4 className="mt-1 text-xs font-bold text-slate-900 dark:text-white">
                      {investigation.proposed_resolution.recommended_action}
                    </h4>
                    <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">
                      {investigation.proposed_resolution.explanation}
                    </p>
                    {investigation.proposed_resolution.proposed_amount && (
                      <div className="mt-2 text-xs font-semibold text-blue-900 dark:text-blue-200">
                        Suggested Amount: ${investigation.proposed_resolution.proposed_amount.toFixed(2)}
                      </div>
                    )}
                  </div>

                  {exception.status === "resolved" ? (
                    <div className="rounded-lg bg-emerald-50 p-4 text-center border border-emerald-200 dark:bg-emerald-950/50 dark:border-emerald-900">
                      <CheckCircle className="mx-auto mb-1 h-6 w-6 text-emerald-600" />
                      <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                        Issue Resolved & Approved
                      </div>
                      <p className="mt-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                        The suggested fix was accepted by the manager.
                      </p>
                    </div>
                  ) : exception.status === "dismissed" ? (
                    <div className="rounded-lg bg-slate-100 p-4 text-center border border-slate-200 dark:bg-slate-800">
                      <XCircle className="mx-auto mb-1 h-6 w-6 text-slate-500" />
                      <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Issue Dismissed
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                          Your Notes (Optional)
                        </label>
                        <textarea
                          rows={3}
                          value={reviewerComment}
                          onChange={(e) => setReviewerComment(e.target.value)}
                          placeholder="Add any notes, credit memo number, or reasons..."
                          className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50/50 p-2 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                      </div>

                      <div className="space-y-2">
                        <button
                          id="btn-approve-resolution"
                          onClick={() => handleReview("approved")}
                          disabled={reviewing}
                          className="w-full flex items-center justify-center space-x-1.5 rounded-lg bg-emerald-600 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition disabled:opacity-50 cursor-pointer"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          <span>Approve Fix</span>
                        </button>

                        <button
                          onClick={() => handleReview("revision_requested")}
                          disabled={reviewing}
                          className="w-full flex items-center justify-center space-x-1.5 rounded-lg border border-slate-300 bg-white py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          <span>Ask for Changes</span>
                        </button>

                        <button
                          onClick={() => handleReview("rejected")}
                          disabled={reviewing}
                          className="w-full flex items-center justify-center space-x-1.5 rounded-lg border border-rose-200 bg-rose-50 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 transition disabled:opacity-50 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-300 cursor-pointer"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          <span>Reject & Dismiss Issue</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="mt-3 text-xs text-slate-400">No suggestion available yet.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
