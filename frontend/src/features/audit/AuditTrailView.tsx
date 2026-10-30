"use client";

import React from "react";
import { History, ShieldCheck, UserCheck, Bot, Cpu } from "lucide-react";
import { AuditEvent } from "@/types";

interface AuditTrailViewProps {
  events: AuditEvent[];
}

export function AuditTrailView({ events }: AuditTrailViewProps) {
  const getActorIcon = (actorType: string) => {
    switch (actorType) {
      case "agent":
        return <Bot className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />;
      case "user":
        return <UserCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
      default:
        return <Cpu className="h-4 w-4 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
          <History className="h-4 w-4 text-blue-600" />
          <span>Tamper-Evident Audit Trail</span>
        </h2>
        <p className="text-xs text-slate-500">
          Immutable operational log tracking all automated rule evaluations, agent investigation runs, and human manager decisions.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
              <tr>
                <th className="py-3 pl-4 pr-3">Timestamp</th>
                <th className="px-3 py-3">Actor</th>
                <th className="px-3 py-3">Action Event</th>
                <th className="px-3 py-3">Target Resource</th>
                <th className="py-3 pl-3 pr-4">Event Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {events.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    No audit records logged yet.
                  </td>
                </tr>
              ) : (
                events.map((evt) => (
                  <tr key={evt.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3 pl-4 pr-3 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                      {new Date(evt.created_at).toLocaleString()}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getActorIcon(evt.actor_type)}
                        <span className="font-medium text-slate-900 dark:text-white capitalize">
                          {evt.actor_id || evt.actor_type}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="rounded bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                        {evt.action.replace(/_/g, " ").toUpperCase()}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                      {evt.resource_type}: {evt.resource_id.slice(0, 8)}...
                    </td>
                    <td className="py-3 pl-3 pr-4 text-slate-500 dark:text-slate-400 font-mono text-[11px] max-w-xs truncate">
                      {evt.action_metadata ? JSON.stringify(evt.action_metadata) : "-"}
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
