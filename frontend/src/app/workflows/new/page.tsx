"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FaktryLogo } from "@/components/agents/SwarmBotAvatar";
import { SwarmBuilderView } from "@/features/agents/SwarmBuilderView";
import { ArrowLeft, BookOpen, Plug, Sparkles } from "lucide-react";

export default function NewWorkflowPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      {/* Dedicated Full-Width Studio Header */}
      <header className="h-16 border-b border-slate-200/80 bg-white/95 backdrop-blur-md px-4 lg:px-8 flex items-center justify-between gap-4 sticky top-0 z-30">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/#builder"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:border-emerald-300 hover:text-emerald-800 transition-colors shrink-0"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Workflows
          </Link>

          <div className="h-5 w-px bg-slate-200 hidden sm:block" />

          <div className="flex items-center gap-2.5 min-w-0">
            <FaktryLogo className="h-5 w-6 shrink-0" />
            <span className="font-display font-bold text-base text-slate-950 tracking-tight">
              Faktry <span className="text-emerald-600">AI</span>
            </span>
            <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              <Sparkles className="h-3 w-3 text-emerald-600" />
              New Workflow Studio
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/#connectors"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <Plug className="h-3.5 w-3.5 text-emerald-600" />
            App Connectors
          </Link>
          <Link
            href="/#guide"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <BookOpen className="h-3.5 w-3.5 text-slate-500" />
            Guide
          </Link>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Apex Precision Mfg
          </span>
        </div>
      </header>

      <main className="flex-1 w-full max-w-[1640px] mx-auto px-4 lg:px-8 py-5">
        <SwarmBuilderView
          mode="create"
          onNavigateTab={(tab) => router.push(`/#${tab}`)}
        />
      </main>
    </div>
  );
}
