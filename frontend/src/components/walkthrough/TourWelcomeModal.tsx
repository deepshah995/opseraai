"use client";

import React from "react";
import {
  Sparkles,
  Bot,
  Scale,
  CheckCircle,
  FileSpreadsheet,
  ArrowRight,
  X,
  ShieldCheck,
  RefreshCw,
  Database,
} from "lucide-react";

interface TourWelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartTour: () => void;
}

export const TourWelcomeModal: React.FC<TourWelcomeModalProps> = ({
  isOpen,
  onClose,
  onStartTour,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl bg-slate-900 border border-blue-500/30 rounded-3xl shadow-2xl p-6 sm:p-8 text-white overflow-hidden">
        {/* Glow ambient background accents */}
        <div className="absolute -top-24 -right-24 w-56 h-56 rounded-full bg-blue-600/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-56 h-56 rounded-full bg-indigo-600/20 blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title="Skip tour"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 text-[11px] font-mono font-bold tracking-wider uppercase">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            <span>Quick 1-Minute Tour</span>
          </div>

          <h2 className="text-2xl font-bold text-white tracking-tight">
            See How the App Catches Billing & Job Mistakes
          </h2>

          <p className="text-xs text-slate-300 leading-relaxed">
            Take a fast, interactive tour to see how this tool finds billing errors, shows you clear proof, and helps you fix issues with one click.
          </p>
        </div>

        {/* Tour Highlights */}
        <div className="my-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">1. Load Real Examples</div>
              <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">Add sample tickets, disposal receipts, and customer bills with one click.</div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">2. Find Mistakes Fast</div>
              <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">Instantly spots wrong prices, jobs you forgot to bill, or double charges.</div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">3. Smart AI Explanation</div>
              <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">The AI helper explains what went wrong in plain English and shows the exact proof.</div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">4. You Have the Final Say</div>
              <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">The AI never moves money on its own. You review and approve every fix.</div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-white/10">
          <button
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer py-2 px-3"
          >
            I'll Explore on My Own
          </button>

          <button
            onClick={onStartTour}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.02] cursor-pointer"
          >
            <span>Start Quick Tour</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
