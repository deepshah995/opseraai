"use client";

import React from "react";
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  Bot,
  CheckSquare,
  FileUp,
  GitBranch,
  History,
  LayoutDashboard,
  Plug,
  Settings,
  Sparkles,
  Table,
} from "lucide-react";

export type NavTab =
  | "dashboard"
  | "agents"
  | "studio"
  | "builder"
  | "connectors"
  | "guide"
  | "reports"
  | "minions"
  | "exceptions"
  | "approvals"
  | "ingestion"
  | "records"
  | "audit"
  | "settings";

interface SidebarProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  openExceptionsCount?: number;
  pendingApprovalsCount?: number;
}

export function Sidebar({
  currentTab,
  onTabChange,
  openExceptionsCount = 0,
  pendingApprovalsCount = 0,
}: SidebarProps) {
  const sections: Array<{
    title: string;
    items: Array<{
      id: NavTab;
      label: string;
      icon: any;
      badge?: number;
      badgeColor?: string;
    }>;
  }> = [
    {
      title: "Plant Operations",
      items: [
        { id: "dashboard", label: "Overview & ROI", icon: LayoutDashboard },
        {
          id: "exceptions",
          label: "Issues & Cost Leaks",
          icon: AlertTriangle,
          badge: openExceptionsCount,
          badgeColor: "bg-amber-50 text-amber-800 border border-amber-200",
        },
        {
          id: "approvals",
          label: "Needs Approval",
          icon: CheckSquare,
          badge: pendingApprovalsCount,
          badgeColor: "bg-blue-50 text-blue-800 border border-blue-200",
        },
      ],
    },
    {
      title: "Swarm & Automation",
      items: [
        { id: "agents", label: "Swarm Studio", icon: Bot },
        { id: "builder", label: "Drag & Drop Builder", icon: GitBranch },
        { id: "connectors", label: "App Connectors", icon: Plug },
      ],
    },
    {
      title: "Reports & Records",
      items: [
        { id: "reports", label: "Savings Reports", icon: BarChart3 },
        { id: "ingestion", label: "Upload & ERP Sync", icon: FileUp },
        { id: "records", label: "Plant Records", icon: Table },
        { id: "audit", label: "Activity Log", icon: History },
      ],
    },
    {
      title: "Help & System",
      items: [
        { id: "guide", label: "How It Works", icon: BookOpen },
        { id: "settings", label: "Settings", icon: Settings },
      ],
    },
  ];

  return (
    <aside className="w-64 shrink-0 border-r border-slate-200/80 bg-white flex flex-col justify-between min-h-[calc(100vh-4rem)]">
      <div className="p-3.5 space-y-5 overflow-y-auto">
        {sections.map((section) => (
          <div key={section.title} className="space-y-1">
            <p className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {section.title}
            </p>
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive =
                currentTab === item.id ||
                (item.id === "agents" &&
                  (currentTab === "studio" || currentTab === "minions"));
              return (
                <button
                  key={item.id}
                  id={`tour-nav-${item.id}`}
                  type="button"
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-slate-950 text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                  }`}
                >
                  <span className="flex items-center gap-2.5 truncate">
                    <Icon
                      className={`h-4 w-4 shrink-0 ${
                        isActive ? "text-emerald-400" : "text-slate-400"
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full tabular-nums ${
                        isActive
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30"
                          : item.badgeColor
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="p-3.5 border-t border-slate-100">
        <div className="rounded-2xl brand-gradient-card p-3.5 text-white space-y-1.5 shadow-xs">
          <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 text-emerald-200">
            <Sparkles className="h-3 w-3 text-emerald-300" />
            Google Antigravity SDK
          </div>
          <p className="font-display text-xs font-semibold text-white pt-0.5">
            Faktry AI Agent Board
          </p>
          <p className="text-[10px] text-slate-300/90 leading-snug">
            Cost savings, reclaimed hours &amp; human sign-off gates active.
          </p>
        </div>
      </div>
    </aside>
  );
}
