"use client";

import React, { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api/client";
import { AgentDefinition, ChatHistoryTurn } from "@/types";
import {
  BotMood,
  SwarmBotAvatar,
  getCompanionMeta,
} from "@/components/agents/SwarmBotAvatar";
import {
  BarChart3,
  BookOpen,
  Clock,
  DollarSign,
  Hand,
  MessageCircle,
  Play,
  RefreshCw,
  Send,
  Sparkles,
  Wrench,
} from "lucide-react";

interface AgentFleetStudioProps {
  agents: AgentDefinition[];
  onLaunchConsole?: (agent: AgentDefinition) => void;
  onOpenTutorial?: (agent: AgentDefinition) => void;
  onNavigateToReports?: () => void;
}

interface ChatMessageItem {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolsUsed?: string[];
  modelLabel?: string;
}

function getThemePill(theme: string) {
  switch (theme) {
    case "emerald":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "amber":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "blue":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "rose":
      return "bg-rose-50 text-rose-700 border-rose-200";
    default:
      return "bg-indigo-50 text-indigo-700 border-indigo-200";
  }
}

export function AgentFleetStudio({
  agents,
  onLaunchConsole,
  onOpenTutorial,
  onNavigateToReports,
}: AgentFleetStudioProps) {
  const [selectedId, setSelectedId] = useState<string>(agents[0]?.id || "bom_guard");
  const [sdkBadge, setSdkBadge] = useState<string>("Google Antigravity SDK");
  const [sdkModel, setSdkModel] = useState<string>("gemini-4-hydrogen");

  const [messagesByAgent, setMessagesByAgent] = useState<Record<string, ChatMessageItem[]>>({});
  const [draftInput, setDraftInput] = useState("");
  const [sending, setSending] = useState(false);
  const [botMoods, setBotMoods] = useState<Record<string, BotMood>>({});
  const [speechOverlay, setSpeechOverlay] = useState<string | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  const selectedAgent =
    agents.find((a) => a.id === selectedId) || agents[0] || null;

  useEffect(() => {
    if (agents.length > 0 && !agents.some((a) => a.id === selectedId)) {
      setSelectedId(agents[0].id);
    }
  }, [agents, selectedId]);

  useEffect(() => {
    api
      .getLLMStatus()
      .then((res) => {
        if (res.badge) setSdkBadge(res.badge);
        if (res.model) setSdkModel(res.model);
      })
      .catch(() => {});
  }, []);

  const currentMessages: ChatMessageItem[] = selectedAgent
    ? messagesByAgent[selectedAgent.id] || [
        {
          id: "welcome",
          role: "assistant",
          content: `Hey there! I'm ${selectedAgent.name} (${getCompanionMeta(selectedAgent.id).nickname})! ${getCompanionMeta(selectedAgent.id).greeting} Ask me about open cost leaks, hours saved, pending approvals, or connected Google Sheets!`,
          modelLabel: "Antigravity Ready",
        },
      ]
    : [];

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentMessages.length, selectedId]);

  const handleHighFive = () => {
    if (!selectedAgent) return;
    const meta = getCompanionMeta(selectedAgent.id);
    setBotMoods((prev) => ({ ...prev, [selectedAgent.id]: "proud" }));
    setSpeechOverlay(meta.quipOnWave);
    setTimeout(() => {
      setBotMoods((prev) => ({ ...prev, [selectedAgent.id]: "happy" }));
    }, 2200);
  };

  const sendMessage = async (textToSend?: string) => {
    const content = (textToSend ?? draftInput).trim();
    if (!content || !selectedAgent || sending) return;

    const userMsg: ChatMessageItem = {
      id: `u-${Date.now()}`,
      role: "user",
      content,
    };
    const prior = messagesByAgent[selectedAgent.id] || [];
    const nextHistory: ChatHistoryTurn[] = prior.slice(-8).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    setMessagesByAgent((prev) => ({
      ...prev,
      [selectedAgent.id]: [...prior, userMsg],
    }));
    if (!textToSend) setDraftInput("");
    setSending(true);
    setBotMoods((prev) => ({ ...prev, [selectedAgent.id]: "scanning" }));
    setSpeechOverlay(null);

    try {
      const reply = await api.chatWithAgent(selectedAgent.id, content, nextHistory);
      const botMsg: ChatMessageItem = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: reply.response,
        toolsUsed: reply.tools_used,
        modelLabel: reply.ai_model,
      };
      setMessagesByAgent((prev) => ({
        ...prev,
        [selectedAgent.id]: [...(prev[selectedAgent.id] || [userMsg]), botMsg],
      }));
      setBotMoods((prev) => ({
        ...prev,
        [selectedAgent.id]: (reply.avatar_mood as BotMood) || "proud",
      }));
      if (reply.funny_action) {
        setSpeechOverlay(reply.funny_action);
      }
      setTimeout(() => {
        setBotMoods((prev) => ({ ...prev, [selectedAgent.id]: "happy" }));
      }, 2400);
    } catch (err: any) {
      const errMsg: ChatMessageItem = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: err.message || "Unable to reach agent service right now.",
      };
      setMessagesByAgent((prev) => ({
        ...prev,
        [selectedAgent.id]: [...(prev[selectedAgent.id] || [userMsg]), errMsg],
      }));
      setBotMoods((prev) => ({ ...prev, [selectedAgent.id]: "alert" }));
    } finally {
      setSending(false);
    }
  };

  if (!selectedAgent) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-xs text-slate-400">
        Loading Manufacturing Agent Swarm...
      </div>
    );
  }

  const companion = getCompanionMeta(selectedAgent.id);
  const currentMood: BotMood = sending
    ? "scanning"
    : botMoods[selectedAgent.id] || "happy";

  return (
    <div className="space-y-4">
      {/* Compact SDK Status Strip */}
      <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2.5 text-xs">
          <span className="inline-flex items-center gap-1.5 font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full">
            <Sparkles className="h-3.5 w-3.5" />
            {sdkBadge}
          </span>
          <span className="text-slate-500">
            Model: <strong className="text-slate-700">{sdkModel}</strong>
          </span>
          <span className="hidden sm:inline text-slate-300">|</span>
          <span className="hidden sm:inline text-slate-500">
            5 Friendly Floor Bots · Read-Only Tenant Guardrails Active
          </span>
        </div>

        {onNavigateToReports && (
          <button
            type="button"
            onClick={onNavigateToReports}
            className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            Open Plant ROI Reports &rarr;
          </button>
        )}
      </div>

      {/* Main Clean 2-Column Studio */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT: Personified 5-Agent Companion Cards */}
        <div className="lg:col-span-5 space-y-2.5">
          {agents.map((ag) => {
            const active = ag.id === selectedAgent.id;
            const meta = getCompanionMeta(ag.id);
            const agMood: BotMood = active
              ? currentMood
              : botMoods[ag.id] || "happy";

            return (
              <button
                key={ag.id}
                type="button"
                onClick={() => {
                  setSelectedId(ag.id);
                  setSpeechOverlay(null);
                }}
                className={`w-full text-left p-4 rounded-xl border transition-all group ${
                  active
                    ? "bg-white border-slate-900 ring-2 ring-slate-200 shadow-sm"
                    : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="transition-transform duration-200 group-hover:-translate-y-0.5">
                      <SwarmBotAvatar agentId={ag.id} mood={agMood} size="md" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-bold text-slate-900 truncate">
                          {ag.name}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${getThemePill(ag.color_theme)}`}
                        >
                          {meta.nickname}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {ag.code_name}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {ag.title}
                      </p>
                    </div>
                  </div>

                  {typeof ag.active_issues_count === "number" && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 shrink-0">
                      {ag.active_issues_count} open
                    </span>
                  )}
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-emerald-700 font-semibold flex items-center gap-1 truncate">
                    <DollarSign className="h-3 w-3 shrink-0" />
                    {ag.key_metrics?.recovered_leakage_mtd ||
                      ag.key_metrics?.revenue_leakage_prevented ||
                      "Cost Audit Ready"}
                  </span>
                  <span className="text-blue-700 font-medium flex items-center gap-1 shrink-0">
                    <Clock className="h-3 w-3" />
                    ~{ag.time_saved_per_task_mins ?? 40}m saved/task
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* RIGHT: Focused Companion Card with Interactive Speech Bubble + Live Chat */}
        <div className="lg:col-span-7 space-y-4">
          {/* Interactive Companion Persona Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="p-1.5 rounded-2xl bg-slate-50 border border-slate-200 shrink-0">
                <SwarmBotAvatar
                  agentId={selectedAgent.id}
                  mood={currentMood}
                  size="lg"
                />
              </div>
              <div className="min-w-0 flex-1 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">
                      {selectedAgent.name}
                    </h3>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${getThemePill(selectedAgent.color_theme)}`}
                    >
                      {companion.nickname} · {companion.roleTag}
                    </span>
                  </div>
                </div>

                {/* Interactive Speech Bubble */}
                <div className="relative rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-xs text-slate-700 leading-relaxed">
                  <span className="font-medium text-slate-800">
                    &ldquo;{speechOverlay || companion.greeting}&rdquo;
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={handleHighFive}
                    className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-amber-200 bg-amber-50/70 text-amber-800 hover:bg-amber-100 flex items-center gap-1 transition-colors"
                    title="Ping this bot companion!"
                >
                  <Hand className="h-3.5 w-3.5" />
                  Say Hi
                </button>
                {onOpenTutorial && (
                  <button
                    type="button"
                    onClick={() => onOpenTutorial(selectedAgent)}
                    className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 flex items-center gap-1"
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    Guide
                  </button>
                )}
                {onLaunchConsole && (
                  <button
                    type="button"
                    onClick={() => onLaunchConsole(selectedAgent)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 flex items-center gap-1.5"
                  >
                    <Play className="h-3.5 w-3.5" />
                    Run Check
                  </button>
                )}
                </div>
              </div>
            </div>

            {(selectedAgent.inputs || selectedAgent.outputs) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {selectedAgent.inputs && (
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Reads From
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedAgent.inputs.map((inp) => (
                        <span
                          key={inp}
                          className="text-[11px] px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700"
                        >
                          {inp}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {selectedAgent.outputs && (
                  <div className="p-3 rounded-lg bg-emerald-50/50 border border-emerald-200">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 mb-1.5">
                      Produces Savings &amp; Outputs
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedAgent.outputs.map((outp) => (
                        <span
                          key={outp}
                          className="text-[11px] px-2 py-0.5 rounded bg-white border border-emerald-200 text-emerald-800 font-medium"
                        >
                          {outp}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Grounded Live Antigravity Chat */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-800">
                  Chat with {selectedAgent.name} ({companion.nickname})
                </span>
              </div>
              <span className="text-[11px] text-slate-500">
                {sending ? "Scanning plant records..." : "Online & Tenant-Scoped"}
              </span>
            </div>

            <div className="p-4 h-72 overflow-y-auto space-y-3 bg-white">
              {currentMessages.map((m) => (
                <div
                  key={m.id}
                  className={`flex items-end gap-2 ${
                    m.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {m.role === "assistant" && (
                    <SwarmBotAvatar
                      agentId={selectedAgent.id}
                      mood="happy"
                      size="xs"
                    />
                  )}
                  <div
                    className={`max-w-[82%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${
                      m.role === "user"
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-800"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{m.content}</p>
                    {m.toolsUsed && m.toolsUsed.length > 0 && (
                      <div className="mt-2 pt-1.5 border-t border-slate-200/80 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500">
                        <Wrench className="h-3 w-3" />
                        <span>Checked: {m.toolsUsed.join(", ")}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex items-center gap-2 justify-start">
                  <SwarmBotAvatar
                    agentId={selectedAgent.id}
                    mood="scanning"
                    size="xs"
                  />
                  <div className="bg-slate-100 text-slate-600 rounded-xl px-3.5 py-2 text-xs flex items-center gap-2">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    {companion.nickname} is checking your plant records...
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Quick Prompt Suggestions */}
            <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/70 flex flex-wrap gap-1.5">
              {[
                "Hey! Give me our open cost savings & hours saved",
                "Which items need manager approval right now?",
                "List our connected Google Sheets & Docs",
              ].map((q) => (
                <button
                  key={q}
                  type="button"
                  disabled={sending}
                  onClick={() => sendMessage(q)}
                  className="text-[11px] px-2.5 py-1 rounded-full border border-slate-200 bg-white hover:border-blue-400 text-slate-700 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Chat Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage();
              }}
              className="p-3 border-t border-slate-200 flex gap-2 bg-white"
            >
              <input
                type="text"
                value={draftInput}
                onChange={(e) => setDraftInput(e.target.value)}
                placeholder={`Say hi or ask ${companion.nickname} about POs, invoices, receiving slips, or savings...`}
                className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={sending || !draftInput.trim()}
                className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                Send
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
