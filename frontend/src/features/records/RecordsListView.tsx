"use client";

import React, { useState } from "react";
import { Table, Search, Filter, Calendar, DollarSign } from "lucide-react";
import { OperationalRecord } from "@/types";

interface RecordsListViewProps {
  records: OperationalRecord[];
}

export function RecordsListView({ records }: RecordsListViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const filtered = records.filter((r) => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchRef = r.external_reference.toLowerCase().includes(term);
      const matchCust = r.customer_reference.toLowerCase().includes(term);
      if (!matchRef && !matchCust) return false;
    }
    if (typeFilter !== "all" && r.record_type !== typeFilter) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Search and Type Filter */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search records by reference ID or customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-4 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          <option value="all">All Record Types</option>
          <option value="invoice">Invoices</option>
          <option value="service_ticket">Service Tickets</option>
          <option value="load_record">Scale Receipts</option>
          <option value="dispatch_record">Dispatch Records</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
              <tr>
                <th className="py-3 pl-4 pr-3">Record Type</th>
                <th className="px-3 py-3">Reference ID</th>
                <th className="px-3 py-3">Customer Account</th>
                <th className="px-3 py-3">Amount</th>
                <th className="px-3 py-3">Quantity & Rate</th>
                <th className="px-3 py-3">Status</th>
                <th className="py-3 pl-3 pr-4">Service Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No records found matching filters.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3 pl-4 pr-3 whitespace-nowrap">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {r.record_type.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-mono font-semibold text-blue-600 dark:text-blue-400">
                      {r.external_reference}
                    </td>
                    <td className="px-3 py-3 text-slate-900 dark:text-white font-medium">
                      {r.customer_reference}
                    </td>
                    <td className="px-3 py-3 font-mono">
                      {r.amount !== null && r.amount !== undefined ? (
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          ${r.amount.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-slate-600 dark:text-slate-300">
                      {r.quantity ? `${r.quantity} ${r.unit || ""}` : "-"}
                      {r.rate ? ` @ $${r.rate.toFixed(2)}` : ""}
                    </td>
                    <td className="px-3 py-3">
                      <span className="capitalize text-slate-600 dark:text-slate-400">
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 pl-3 pr-4 text-slate-400">
                      {r.service_date ? new Date(r.service_date).toLocaleDateString([], { month: "short", day: "numeric" }) : "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
