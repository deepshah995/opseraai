"use client";

import React from "react";
import { 
  LayoutDashboard, 
  AlertTriangle, 
  CheckSquare, 
  FileUp, 
  Table, 
  History, 
  Settings,
  Scale,
  Bot,
  Sparkles,
  BarChart3,
} from "lucide-react";

export type NavTab = 
  | "dashboard" 
  | "agents"
  | "studio"
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
}: SidebarProps) {
  const navItems = [
    {
      id: "dashboard" as NavTab,
      label: "Overview",
      icon: LayoutDashboard,
    },
    {
      id: "agents" as NavTab,
      label: "AI Agents Fleet & Studio",
      icon: Bot,
    },
    {
      id: "reports" as NavTab,
      label: "Report Console",
      icon: BarChart3,
    },
    {
      id: "exceptions" as NavTab,
      label: "Issues List",
      icon: AlertTriangle,
    },
    {
      id: "approvals" as NavTab,
      label: "Needs Approval",
      icon: CheckSquare,
    },
    {
      id: "ingestion" as NavTab,
      label: "Upload Files",
      icon: FileUp,
    },
    {
      id: "records" as NavTab,
      label: "All Records",
      icon: Table,
    },
    {
      id: "audit" as NavTab,
      label: "Activity History",
      icon: History,
    },
    {
      id: "settings" as NavTab,
      label: "Settings",
      icon: Settings,
    },
  ];

  return (
    <aside className="w-60 flex-shrink-0 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="flex h-full flex-col justify-between py-6">
        <div className="px-3">
          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`tab-${item.id}`}
                  onClick={() => onTabChange(item.id)}
                  className={`flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 font-semibold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-white"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`h-4 w-4 ${isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-400"}`} />
                    <span>{item.label}</span>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* System Footnote */}
        <div className="px-5 text-[11px] text-slate-400 dark:text-slate-500">
          <div>Secure & Private Data</div>
          <div className="mt-0.5 text-[10px] text-slate-400">Powered by Google Gemini</div>
        </div>
      </div>
    </aside>
  );
}
