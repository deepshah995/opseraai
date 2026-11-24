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
          badgeColor: "bg-amber-100 text-amber-800",
        },
        {
          id: "approvals",
          label: "Needs Approval",
          icon: CheckSquare,
          badge: pendingApprovalsCount,
          badgeColor: "bg-blue-100 text-blue-800",
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
    <aside className="w-64 shrink-0 border-r border-slate-200 bg-white flex flex-col justify-between min-h-[calc(100vh-3.5rem)]">
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
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-slate-900 text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <span className="flex items-center gap-2.5 truncate">
                    <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-white" : "text-slate-500"}`} />
                    <span className="truncate">{item.label}</span>
                  </span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        isActive ? "bg-white/20 text-white" : item.badgeColor
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

      <div className="p-3.5 border-t border-slate-100 bg-slate-50/70">
        <div className="rounded-lg border border-slate-200 bg-white p-2.5 space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-800">
            <Sparkles className="h-3.5 w-3.5 text-blue-600" />
            Google Antigravity SDK
          </div>
          <p className="text-[10px] text-slate-500">
            Manufacturing Swarm · Cost &amp; Time Optimizer
          </p>
        </div>
      </div>
    </aside>
  );
}
