"use client";

import React, { useState } from "react";
import { 
  AlertTriangle, 
  Search, 
  Filter, 
  Bot, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  XCircle,
  Sparkles
} from "lucide-react";
import { OperationalException, ExceptionSeverity, ExceptionStatus, ExceptionType } from "@/types";

interface ExceptionListViewProps {
  exceptions: OperationalException[];
  loading?: boolean;
  onSelectException: (exceptionId: string) => void;
  onTriggerInvestigation: (exceptionId: string) => void;
  investigatingId?: string | null;
}

export function ExceptionListView({
  exceptions,
  loading = false,
  onSelectException,
  onTriggerInvestigation,
  investigatingId = null,
}: ExceptionListViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const filtered = exceptions.filter((exc) => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchTitle = exc.title.toLowerCase().includes(term);
      const matchDesc = exc.description.toLowerCase().includes(term);
      if (!matchTitle && !matchDesc) return false;
    }
    if (severityFilter !== "all" && exc.severity !== severityFilter) return false;
    if (statusFilter !== "all" && exc.status !== statusFilter) return false;
    if (typeFilter !== "all" && exc.exception_type !== typeFilter) return false;
    return true;
  });

  const getSeverityBadge = (severity: ExceptionSeverity) => {
    switch (severity) {
      case "critical":
        return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-900";
      case "high":
        return "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/60 dark:text-orange-400 dark:border-orange-900";
      case "medium":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-900";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
    }
  };

  const getStatusBadge = (status: ExceptionStatus) => {
    switch (status) {
      case "open":
        return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-400";
      case "investigating":
        return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-400 animate-pulse";
      case "awaiting_approval":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-400";
      case "resolved":
      case "approved":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400";
      case "dismissed":
      case "rejected":
        return "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400";
      default:
        return "bg-slate-50 text-slate-700";
    }
  };

  const getAssignedAgent = (type: ExceptionType) => {
    switch (type) {
      case "quantity_mismatch":
        return { name: "TicketHawk", code: "TH-01", badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800" };
      case "dispatch_discrepancy":
        return { name: "DispatchPulse", code: "DP-02", badge: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800" };
      case "rate_mismatch":
      case "unbilled_job":
      case "duplicate_billing":
      default:
        return { name: "BillSentry", code: "BS-03", badge: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800" };
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters Header */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:flex-row md:items-center md:justify-between">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            id="search-exceptions"
            type="text"
            placeholder="Search exceptions by customer, ticket, or reference..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-4 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Severity */}
          <select
            id="filter-severity"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="investigating">Investigating</option>
            <option value="awaiting_approval">Waiting for Approval</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </select>

          {/* Type */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="all">All Problem Types</option>
            <option value="rate_mismatch">Wrong Price or Rate</option>
            <option value="quantity_mismatch">Weight or Quantity Difference</option>
            <option value="unbilled_job">Job Not Billed</option>
            <option value="duplicate_billing">Billed Twice</option>
            <option value="dispatch_discrepancy">Schedule Difference</option>
          </select>
        </div>
      </div>

      {/* Exception Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
              <tr>
                <th className="py-3 pl-4 pr-3">Priority</th>
                <th className="px-3 py-3">Issue & Details</th>
                <th className="px-3 py-3">Difference ($)</th>
                <th className="px-3 py-3">Category</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Date Found</th>
                <th className="py-3 pl-3 pr-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <AlertTriangle className="mx-auto mb-2 h-6 w-6 text-slate-300" />
                    No exceptions found matching filters.
                  </td>
                </tr>
              ) : (
                filtered.map((exc, idx) => {
                  const isCurrentInvestigating = investigatingId === exc.id;
                  return (
                    <tr
                      key={exc.id}
                      id={idx === 0 ? "first-exception-row" : undefined}
                      className="group transition hover:bg-slate-50/70 dark:hover:bg-slate-800/40 cursor-pointer"
                      onClick={() => onSelectException(exc.id)}
                    >
                      {/* Severity */}
                      <td className="py-3.5 pl-4 pr-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getSeverityBadge(
                            exc.severity
                          )}`}
                        >
                          {exc.severity}
                        </span>
                      </td>

                      {/* Title & Desc */}
                      <td className="px-3 py-3.5 max-w-md">
                        <div className="font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 transition">
                          {exc.title}
                        </div>
                        <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-500 dark:text-slate-400">
                          {exc.description}
                        </p>
                      </td>

                      {/* Discrepancy Amount */}
                      <td className="px-3 py-3.5 whitespace-nowrap">
                        {exc.discrepancy_amount ? (
                          <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                            ${exc.discrepancy_amount.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono">-</span>
                        )}
                      </td>

                      {/* Category & Assigned Agent */}
                      <td className="px-3 py-3.5 whitespace-nowrap">
                        <div className="flex items-center space-x-1.5">
                          <span className={`inline-flex items-center space-x-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold ${getAssignedAgent(exc.exception_type).badge}`}>
                            <Bot className="h-2.5 w-2.5" />
                            <span>{getAssignedAgent(exc.exception_type).name}</span>
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${getStatusBadge(
                            exc.status
                          )}`}
                        >
                          {exc.status.replace(/_/g, " ")}
                        </span>
                      </td>

                      {/* Detected Date */}
                      <td className="px-3 py-3.5 whitespace-nowrap text-slate-400">
                        {new Date(exc.detected_at).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                        })}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 pl-3 pr-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            id={idx === 0 ? "btn-investigate-first" : undefined}
                            onClick={() => onTriggerInvestigation(exc.id)}
                            disabled={isCurrentInvestigating}
                            className="flex items-center space-x-1.5 rounded-lg bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition disabled:opacity-50 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-900 cursor-pointer shadow-sm"
                            title={`Run ${getAssignedAgent(exc.exception_type).name} to resolve this issue`}
                          >
                            <Bot className={`h-3.5 w-3.5 ${isCurrentInvestigating ? "animate-spin" : ""}`} />
                            <span>{isCurrentInvestigating ? "Analyzing..." : `Run ${getAssignedAgent(exc.exception_type).name}`}</span>
                          </button>

                          <button
                            onClick={() => onSelectException(exc.id)}
                            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
                          >
                            <ArrowRight className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
