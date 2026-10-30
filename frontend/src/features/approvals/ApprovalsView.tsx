"use client";

import React, { useState } from "react";
import { 
  CheckSquare, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Clock, 
  AlertCircle,
  FileCheck
} from "lucide-react";
import { Approval } from "@/types";
import { api } from "@/lib/api/client";

interface ApprovalsViewProps {
  approvals: Approval[];
  onRefresh: () => void;
  onSelectException?: (exceptionId: string) => void;
}

export function ApprovalsView({ approvals, onRefresh, onSelectException }: ApprovalsViewProps) {
  const [filter, setFilter] = useState<string>("all");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const filtered = approvals.filter((appr) => {
    if (filter === "all") return true;
    return appr.decision === filter;
  });

  const handleReview = async (approvalId: string, decision: "approved" | "rejected" | "revision_requested") => {
    try {
      setProcessingId(approvalId);
      await api.reviewApproval(approvalId, decision, "Reviewed from approvals queue");
      onRefresh();
    } catch (e: any) {
      alert(`Approval review failed: ${e.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const getDecisionBadge = (decision: string) => {
    switch (decision) {
      case "approved":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400";
      case "rejected":
        return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-400";
      case "revision_requested":
        return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-400";
      default:
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-400";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <CheckSquare className="h-4 w-4 text-blue-600" />
            <span>Human-in-the-Loop Review Queue</span>
          </h2>
          <p className="text-xs text-slate-500">
            Operations manager decision queue for agent-proposed resolutions.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {["all", "pending", "approved", "rejected"].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${
                filter === tab
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-400 dark:border-slate-800 dark:bg-slate-900">
            <FileCheck className="mx-auto mb-2 h-8 w-8 text-slate-300" />
            No approvals found for filter &quot;{filter}&quot;.
          </div>
        ) : (
          filtered.map((appr) => {
            const isPending = appr.decision === "pending";
            const snap = appr.proposed_action_snapshot;
            const isProcessing = processingId === appr.id;

            return (
              <div
                key={appr.id}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold capitalize ${getDecisionBadge(appr.decision)}`}>
                        {appr.decision.replace(/_/g, " ")}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Requested: {new Date(appr.created_at).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {snap?.recommended_action || "Operational Resolution Recommendation"}
                    </h3>
                  </div>

                  {snap?.proposed_amount && (
                    <div className="rounded-lg bg-blue-50 px-3 py-1 text-right dark:bg-blue-950/60">
                      <div className="text-[10px] text-blue-600 font-semibold uppercase">Proposed Value</div>
                      <div className="font-mono text-sm font-bold text-blue-900 dark:text-blue-200">
                        ${snap.proposed_amount.toFixed(2)}
                      </div>
                    </div>
                  )}
                </div>

                {snap?.explanation && (
                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 p-3 rounded-lg dark:bg-slate-800/40">
                    {snap.explanation}
                  </p>
                )}

                {appr.reviewer_comment && (
                  <div className="mt-2 text-xs text-slate-500 italic">
                    Reviewer note: &quot;{appr.reviewer_comment}&quot;
                  </div>
                )}

                {isPending && (
                  <div className="mt-4 flex items-center justify-end space-x-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                    <button
                      onClick={() => handleReview(appr.id, "approved")}
                      disabled={isProcessing}
                      className="flex items-center space-x-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Approve</span>
                    </button>

                    <button
                      onClick={() => handleReview(appr.id, "revision_requested")}
                      disabled={isProcessing}
                      className="flex items-center space-x-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span>Request Revision</span>
                    </button>

                    <button
                      onClick={() => handleReview(appr.id, "rejected")}
                      disabled={isProcessing}
                      className="flex items-center space-x-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 transition disabled:opacity-50 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-300"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      <span>Reject</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
