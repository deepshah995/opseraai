"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Bot, 
  Send, 
  RotateCcw, 
  Scale, 
  Satellite, 
  FileCheck2, 
  Building2, 
  Users2, 
  ArrowRight, 
  Zap, 
  Activity, 
  Radio, 
  ChevronRight,
  BarChart3
} from "lucide-react";
import { AgentDefinition, AgentChatResponse } from "@/types";
import { api } from "@/lib/api/client";

interface AgentFleetStudioProps {
  agents: AgentDefinition[];
  onLaunchConsole?: (agent: AgentDefinition) => void;
  onOpenTutorial?: (agent: AgentDefinition) => void;
  onNavigateToReports?: () => void;
}

// Enterprise Data System definitions that operations agents interact with
const DATA_SYSTEMS = [
  {
    id: "landfill_scales",
    name: "Certified Scale Houses",
    shortName: "Scale Houses",
    icon: Scale,
    color: "emerald",
    description: "Hardware truck weighbridges printing certified gross, tare & net weight slips.",
    activeRecord: "Slip #SC-110 (4.00 net tons)",
    primaryAgentId: "ticket_hawk",
  },
  {
    id: "telematics_gps",
    name: "Fleet GPS & Telematics",
    shortName: "Fleet GPS",
    icon: Satellite,
    color: "blue",
    description: "Samsara / Geotab real-time vehicle GPS pings, engine telemetry & geofence events.",
    activeRecord: "Truck #402 (Sector 4 Route)",
    primaryAgentId: "dispatch_pulse",
  },
  {
    id: "erp_billing",
    name: "AMCS / Enterprise ERP",
    shortName: "ERP & Invoices",
    icon: Building2,
    color: "amber",
    description: "Core financial ledger, customer contracts, standard rates & billing cycles.",
    activeRecord: "INV-9020 (Apex Mfg $1,115.00)",
    primaryAgentId: "bill_sentry",
  },
  {
    id: "driver_work_orders",
    name: "Mobile Driver Work Orders",
    shortName: "Driver Tickets",
    icon: FileCheck2,
    color: "purple",
    description: "Electronic handheld signatures, customer sign-offs & driver field notes.",
    activeRecord: "Ticket #TKT-4410 (Signed 10:42 AM)",
    primaryAgentId: "ticket_hawk",
  },
  {
    id: "customer_portal",
    name: "Customer Dispute Portal",
    shortName: "Customer Portal",
    icon: Users2,
    color: "rose",
    description: "Client email tickets, account inquiries & billing disputes.",
    activeRecord: "Claim #DISP-88 (Tonnage Query)",
    primaryAgentId: "dispute_shield",
  },
  {
    id: "report_console_engine",
    name: "Operations Report Console",
    shortName: "Report Console",
    icon: BarChart3,
    color: "purple",
    description: "Live executive KPI engine, cross-fleet discrepancy telemetry & automated briefing feed.",
    activeRecord: "Executive Briefing Generated",
    primaryAgentId: "ops_beacon",
  },
];

const DEFAULT_FLEET_AGENTS: AgentDefinition[] = [
  {
    id: "ticket_hawk",
    name: "TicketHawk",
    code_name: "TH-01",
    title: "Ticket Discrepancy Agent",
    tagline: "The Field & Scale Guardian: Catching weight variance, tonnage leaks, and unverified service tickets.",
    category: "Ticket & Scale Operations",
    color_theme: "emerald",
    icon_name: "Scale",
    avatar_url: "/agents/ticket_hawk.svg",
    specialization: "Scale receipts vs driver tickets",
    reconciles_records: ["service_ticket", "load_record"],
    exception_types_handled: ["quantity_mismatch"],
    key_metrics: { accuracy_rate: "99.4%", active_status: "Online & Watching" },
    capabilities: [],
    simple_summary: "Reconciles scale receipts vs field driver tickets.",
    full_tutorial: [],
    sample_scenarios: [],
  },
  {
    id: "dispatch_pulse",
    name: "DispatchPulse",
    code_name: "DP-02",
    title: "Dispatch Exception Agent",
    tagline: "The Fleet Sentinel: Synchronizing schedules, vehicle swaps, and telematics GPS route drift.",
    category: "Dispatch & Fleet Logistics",
    color_theme: "blue",
    icon_name: "Truck",
    avatar_url: "/agents/dispatch_pulse.svg",
    specialization: "GPS telematics vs dispatch schedules",
    reconciles_records: ["dispatch_record", "vehicle_gps"],
    exception_types_handled: ["dispatch_discrepancy"],
    key_metrics: { accuracy_rate: "98.9%", active_status: "Online & Watching" },
    capabilities: [],
    simple_summary: "Tracks route drift and vehicle swaps.",
    full_tutorial: [],
    sample_scenarios: [],
  },
  {
    id: "bill_sentry",
    name: "BillSentry",
    code_name: "BS-03",
    title: "Billing Discrepancy Agent",
    tagline: "The Revenue Protector: Stopping unbilled hauls, rate code drift, and duplicate charges.",
    category: "Billing & Revenue Assurance",
    color_theme: "amber",
    icon_name: "Receipt",
    avatar_url: "/agents/bill_sentry.svg",
    specialization: "ERP rate verification & unbilled job capture",
    reconciles_records: ["invoice", "service_ticket"],
    exception_types_handled: ["rate_mismatch", "unbilled_job"],
    key_metrics: { accuracy_rate: "99.4%", active_status: "Online & Watching" },
    capabilities: [],
    simple_summary: "Stops unbilled roll-offs and rate code drift.",
    full_tutorial: [],
    sample_scenarios: [],
  },
  {
    id: "ops_beacon",
    name: "ReportBeacon",
    code_name: "RB-04",
    title: "Report Console Agent",
    tagline: "The Reporting & Analytics Oracle: Synthesizes live fleet telemetry, margin leaks, and executive KPI briefs on the Report Console.",
    category: "Operations Reporting & BI",
    color_theme: "purple",
    icon_name: "BarChart3",
    avatar_url: "/agents/ops_beacon.svg",
    specialization: "Powers the Report Console with automated executive summaries & KPI telemetry",
    reconciles_records: ["invoice", "service_ticket", "load_record", "dispatch_record"],
    exception_types_handled: ["all_operational_exceptions"],
    key_metrics: { accuracy_rate: "99.9%", active_status: "Active & Publishing to Report Console" },
    capabilities: [],
    simple_summary: "Powers the Report Console with live executive briefings.",
    full_tutorial: [],
    sample_scenarios: [],
  },
  {
    id: "dispute_shield",
    name: "DisputeShield",
    code_name: "DS-05",
    title: "Customer Dispute Agent",
    tagline: "The Trust Arbitrator: Resolving client billing disputes with certified proof and polite letters.",
    category: "Customer Dispute Resolution",
    color_theme: "rose",
    icon_name: "ShieldAlert",
    avatar_url: "/agents/dispute_shield.svg",
    specialization: "Customer dispute arbitration & resolution letters",
    reconciles_records: ["invoice", "service_ticket", "customer_account"],
    exception_types_handled: ["customer_disputes"],
    key_metrics: { accuracy_rate: "98.7%", active_status: "Online & Watching" },
    capabilities: [],
    simple_summary: "Solves customer disputes with certified scale proof.",
    full_tutorial: [],
    sample_scenarios: [],
  },
];

interface ChatMessage {
  id: string;
  sender: "user" | "agent";
  text: string;
  mood?: string;
  funnyAction?: string;
  timestamp: string;
}

export function AgentFleetStudio({
  agents,
  onLaunchConsole,
  onOpenTutorial,
  onNavigateToReports,
}: AgentFleetStudioProps) {
  const [selectedAgentId, setSelectedAgentId] = useState<string>("ticket_hawk");
  const [selectedSystemId, setSelectedSystemId] = useState<string | null>(null);
  const [dataFlowActive, setDataFlowActive] = useState(true);

  // Guarantee all 5 agents (especially ReportBeacon / Report Console Agent) are always available
  const rawList = agents && agents.length > 0 ? agents : DEFAULT_FLEET_AGENTS;
  const activeAgentsList = rawList.some((a) => a.id === "ops_beacon")
    ? rawList
    : [...rawList, DEFAULT_FLEET_AGENTS.find((a) => a.id === "ops_beacon")!];
  
  // Interactive Chat State initialized with agent personalities
  const [chatMessages, setChatMessages] = useState<Record<string, ChatMessage[]>>({
    ticket_hawk: [
      {
        id: "th-init",
        sender: "agent",
        text: "*adjusts laser scanning goggles with a soft click*\n\nGreetings! I am TicketHawk (TH-01). I protect your operations from scale discrepancies and weight leaks. Right now I'm reading live scale weights from North Landfill Scale #2. Ask me anything or click a prompt below!",
        mood: "happy",
        funnyAction: "TicketHawk calibrates its optical sensors and scans ticket #SC-110",
        timestamp: "Just now",
      },
    ],
    dispatch_pulse: [
      {
        id: "dp-init",
        sender: "agent",
        text: "*spins radar telemetry tracker and radios on dispatch line*\n\n10-4 good buddy! DispatchPulse (DP-02) reporting for duty! I track all trucks live so drivers don't take unapproved detours or swap routes without dispatch knowing. What's on your radar?",
        mood: "scanning",
        funnyAction: "DispatchPulse activates its radar telemetry array with blinking blue status lights",
        timestamp: "Just now",
      },
    ],
    bill_sentry: [
      {
        id: "bs-init",
        sender: "agent",
        text: "*taps brass precision monocle and audits rate matrices*\n\nGreetings! BillSentry (BS-03) at your service. Unbilled roll-off pickups and expired discount codes make my auditing circuits activate! I ensure every single service rendered turns into collected revenue.",
        mood: "proud",
        funnyAction: "BillSentry stamps a clean 'RATE VERIFIED' on its audit log",
        timestamp: "Just now",
      },
    ],
    ops_beacon: [
      {
        id: "ob-init",
        sender: "agent",
        text: "*stabilizes on telemetry hoverpad and activates Report Console holographic projector*\n\nGreetings leadership! I am ReportBeacon (RB-04), your Operations Reporting & Analytics Agent. I synthesize live data across all operations agents and publish executive dashboards to the Report Console! You can chat with me here or jump directly to the Report Console.",
        mood: "thinking",
        funnyAction: "ReportBeacon projects a floating holographic 3D bar chart synced to the Report Console",
        timestamp: "Just now",
      },
    ],
    dispute_shield: [
      {
        id: "ds-init",
        sender: "agent",
        text: "*buffs polished silver shield and salutes with diplomat pen*\n\nSalutations! DisputeShield (DS-05) here. When an upset customer claims they were overbilled, I pull TicketHawk's certified scale slips, write a courteous letter, and solve the dispute with verified proof!",
        mood: "happy",
        funnyAction: "DisputeShield readies its diplomatic pen and verified evidence log",
        timestamp: "Just now",
      },
    ],
  });

  const [inputMessage, setInputMessage] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const selectedAgent = activeAgentsList.find((a) => a.id === selectedAgentId) || activeAgentsList[0];

  const agentProfile = (selectedAgent as any).agent_profile || (selectedAgent as any).minion_profile || {
    name: selectedAgent.name,
    title: selectedAgent.title,
    color: selectedAgent.color_theme,
    catchphrase: selectedAgent.tagline,
    current_live_action: "Calibrating scale slip #SC-110 against driver ticket...",
    linked_systems: ["Certified Landfill Scales", "Driver Handhelds"],
    personality: "Meticulous, sharp-eyed, equipped with scanning sensors and scale slip analyzer.",
  };

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, selectedAgentId]);

  const handleSendChat = async (userText: string) => {
    if (!userText.trim() || chatLoading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: "user",
      text: userText,
      timestamp: "Now",
    };

    setChatMessages((prev) => ({
      ...prev,
      [selectedAgentId]: [...(prev[selectedAgentId] || []), userMsg],
    }));
    setInputMessage("");
    setChatLoading(true);

    try {
      const res: AgentChatResponse = await api.chatWithAgent(selectedAgentId, userText);
      const agentMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        sender: "agent",
        text: res.response,
        mood: res.avatar_mood,
        funnyAction: res.funny_action,
        timestamp: "Just now",
      };
      setChatMessages((prev) => ({
        ...prev,
        [selectedAgentId]: [...(prev[selectedAgentId] || []), agentMsg],
      }));
    } catch (e: any) {
      const fallbackMsg: ChatMessage = {
        id: `a-err-${Date.now()}`,
        sender: "agent",
        text: `*telemetry indicator flashes* Regarding "${userText}": I am monitoring this live operational pipeline and keeping your records verified!`,
        mood: "happy",
        timestamp: "Just now",
      };
      setChatMessages((prev) => ({
        ...prev,
        [selectedAgentId]: [...(prev[selectedAgentId] || []), fallbackMsg],
      }));
    } finally {
      setChatLoading(false);
    }
  };

  // Render SVG Agent Avatar Character
  const renderAgentAvatar = (agentId: string, isSelected: boolean) => {
    switch (agentId) {
      case "ticket_hawk":
        return (
          <div className="relative flex flex-col items-center">
            {/* TicketHawk SVG Avatar */}
            <svg viewBox="0 0 100 120" className={`w-20 h-24 transition-transform duration-300 ${isSelected ? "scale-110 drop-shadow-xl" : "hover:scale-105"}`}>
              <ellipse cx="50" cy="112" rx="30" ry="6" fill="rgba(0,0,0,0.15)" />
              <rect x="25" y="25" width="50" height="75" rx="25" fill="url(#hawkGradient)" />
              <path d="M 27 55 L 73 55 L 73 90 C 73 97 65 100 50 100 C 35 100 27 97 27 90 Z" fill="#10b981" />
              <rect x="34" y="55" width="6" height="42" fill="#34d399" />
              <rect x="60" y="55" width="6" height="42" fill="#34d399" />
              <rect x="23" y="38" width="54" height="6" fill="#1e293b" rx="2" />
              <circle cx="40" cy="41" r="12" fill="#0f172a" stroke="#cbd5e1" strokeWidth="2.5" />
              <circle cx="60" cy="41" r="12" fill="#0f172a" stroke="#cbd5e1" strokeWidth="2.5" />
              <circle cx="40" cy="41" r="5" fill="#34d399" className={isSelected ? "animate-ping" : ""} />
              <circle cx="60" cy="41" r="5" fill="#34d399" className={isSelected ? "animate-ping" : ""} />
              <circle cx="42" cy="39" r="2" fill="#ffffff" />
              <circle cx="62" cy="39" r="2" fill="#ffffff" />
              <path d="M 43 62 Q 50 67 57 62" stroke="#064e3b" strokeWidth="2" fill="none" strokeLinecap="round" />
              <g transform="translate(68, 70) rotate(15)">
                <rect x="0" y="0" width="16" height="22" rx="2" fill="#ffffff" stroke="#10b981" strokeWidth="1.5" />
                <line x1="3" y1="5" x2="13" y2="5" stroke="#10b981" strokeWidth="1.5" />
                <line x1="3" y1="9" x2="11" y2="9" stroke="#94a3b8" strokeWidth="1" />
                <line x1="3" y1="13" x2="13" y2="13" stroke="#94a3b8" strokeWidth="1" />
              </g>
              <defs>
                <linearGradient id="hawkGradient" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#fef08a" />
                  <stop offset="100%" stopColor="#f59e0b" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        );

      case "dispatch_pulse":
        return (
          <div className="relative flex flex-col items-center">
            {/* DispatchPulse SVG Avatar */}
            <svg viewBox="0 0 100 120" className={`w-20 h-24 transition-transform duration-300 ${isSelected ? "scale-110 drop-shadow-xl" : "hover:scale-105"}`}>
              <ellipse cx="50" cy="112" rx="30" ry="6" fill="rgba(0,0,0,0.15)" />
              <line x1="50" y1="20" x2="50" y2="6" stroke="#3b82f6" strokeWidth="2.5" />
              <circle cx="50" cy="6" r="3.5" fill="#60a5fa" className="animate-ping" />
              <rect x="25" y="25" width="50" height="70" rx="25" fill="url(#pulseGradient)" />
              <path d="M 22 30 Q 50 20 78 30 L 85 36 L 50 34 L 15 36 Z" fill="#1d4ed8" />
              <rect x="30" y="38" width="40" height="15" rx="7.5" fill="#0f172a" stroke="#93c5fd" strokeWidth="2" />
              <circle cx="50" cy="45" r="5" fill="#38bdf8" className={isSelected ? "animate-pulse" : ""} />
              <circle cx="52" cy="43" r="1.5" fill="#ffffff" />
              <rect x="42" y="60" width="16" height="5" rx="2.5" fill="#1e3a8a" />
              <rect x="20" y="92" width="60" height="14" rx="7" fill="#1e293b" />
              <circle cx="30" cy="99" r="4" fill="#64748b" />
              <circle cx="50" cy="99" r="4" fill="#64748b" />
              <circle cx="70" cy="99" r="4" fill="#64748b" />
              <rect x="12" y="65" width="12" height="18" rx="2" fill="#334155" />
              <line x1="15" y1="65" x2="15" y2="58" stroke="#334155" strokeWidth="1.5" />
              <defs>
                <linearGradient id="pulseGradient" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#93c5fd" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        );

      case "bill_sentry":
        return (
          <div className="relative flex flex-col items-center">
            {/* BillSentry SVG Avatar */}
            <svg viewBox="0 0 100 120" className={`w-20 h-24 transition-transform duration-300 ${isSelected ? "scale-110 drop-shadow-xl" : "hover:scale-105"}`}>
              <ellipse cx="50" cy="112" rx="30" ry="6" fill="rgba(0,0,0,0.15)" />
              <rect x="25" y="25" width="50" height="75" rx="25" fill="url(#sentryGradient)" />
              <circle cx="60" cy="42" r="10" fill="#0f172a" stroke="#d97706" strokeWidth="2.5" />
              <circle cx="60" cy="42" r="4" fill="#f59e0b" />
              <path d="M 68 48 L 78 72" stroke="#d97706" strokeWidth="1.5" strokeDasharray="2,2" />
              <circle cx="40" cy="42" r="7" fill="#0f172a" stroke="#64748b" strokeWidth="1.5" />
              <circle cx="40" cy="42" r="3" fill="#cbd5e1" />
              <path d="M 43 58 Q 50 63 57 58" stroke="#78350f" strokeWidth="2" fill="none" />
              <rect x="25" y="70" width="50" height="8" fill="#78350f" />
              <rect x="42" y="67" width="16" height="14" rx="2" fill="#0f172a" stroke="#d97706" strokeWidth="1" />
              <rect x="45" y="69" width="10" height="3" fill="#10b981" />
              <circle cx="20" cy="75" r="8" fill="#fbbf24" stroke="#d97706" strokeWidth="1.5" />
              <text x="18" y="79" fontSize="10" fontWeight="bold" fill="#78350f">$</text>
              <defs>
                <linearGradient id="sentryGradient" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#fde68a" />
                  <stop offset="100%" stopColor="#f59e0b" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        );

      case "ops_beacon":
        return (
          <div className="relative flex flex-col items-center">
            {/* ReportBeacon SVG Avatar - The Operations Reporting Agent */}
            <svg viewBox="0 0 100 120" className={`w-20 h-24 transition-transform duration-300 ${isSelected ? "scale-110 drop-shadow-xl" : "hover:scale-105"}`}>
              {/* Telemetry Hover Pad with thrust glow */}
              <ellipse cx="50" cy="112" rx="28" ry="6" fill="#a855f7" opacity="0.35" className="animate-pulse" />
              <rect x="30" y="102" width="40" height="6" rx="3" fill="#7e22ce" stroke="#c084fc" strokeWidth="1" />
              <circle cx="50" cy="105" r="2" fill="#38bdf8" />
              
              {/* Radar dome & hologram projection rays */}
              <path d="M 38 25 A 12 12 0 0 1 62 25 Z" fill="#c084fc" opacity="0.9" />
              <polygon points="50,22 10,0 90,0" fill="#a855f7" opacity="0.18" className="animate-pulse" />
              <line x1="50" y1="22" x2="50" y2="10" stroke="#c084fc" strokeWidth="2" />
              <circle cx="50" cy="9" r="3.5" fill="#e879f9" className={isSelected ? "animate-ping" : ""} />
              <circle cx="50" cy="9" r="1.5" fill="#ffffff" />
              
              {/* Futuristic Robot Body */}
              <rect x="25" y="25" width="50" height="74" rx="25" fill="url(#beaconGradient)" />
              
              {/* High-tech Analyst Visor with data wave */}
              <rect x="30" y="38" width="40" height="16" rx="8" fill="#0f172a" stroke="#c084fc" strokeWidth="2" />
              <circle cx="43" cy="46" r="3.5" fill="#e879f9" />
              <circle cx="57" cy="46" r="3.5" fill="#e879f9" />
              <line x1="36" y1="46" x2="64" y2="46" stroke="#c084fc" strokeWidth="1" opacity="0.6" strokeDasharray="2,2" />
              
              {/* Happy Robot Mouth */}
              <path d="M 44 59 Q 50 64 56 59" stroke="#581c87" strokeWidth="2" fill="none" strokeLinecap="round" />
              
              {/* Chest Screen: Animated Live Operations Report Bar Chart */}
              <rect x="30" y="66" width="40" height="22" rx="4" fill="#0f172a" stroke="#c084fc" strokeWidth="1.5" />
              <rect x="34" y="78" width="4" height="6" fill="#34d399" />
              <rect x="41" y="73" width="4" height="11" fill="#60a5fa" />
              <rect x="48" y="70" width="4" height="14" fill="#a855f7" />
              <rect x="55" y="75" width="4" height="9" fill="#f59e0b" />
              <rect x="62" y="72" width="4" height="12" fill="#ec4899" />
              
              {/* Right Hand: Floating Holographic Executive Report Tablet */}
              <g transform="translate(73, 58) rotate(10)">
                <rect x="0" y="0" width="16" height="22" rx="3" fill="#1e1b4b" stroke="#a855f7" strokeWidth="1.5" />
                <rect x="3" y="3" width="10" height="2" fill="#38bdf8" />
                <rect x="3" y="7" width="8" height="2" fill="#e879f9" />
                <rect x="3" y="11" width="10" height="2" fill="#34d399" />
                <circle cx="8" cy="17" r="2" fill="#fbbf24" />
              </g>

              <defs>
                <linearGradient id="beaconGradient" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#f3e8ff" />
                  <stop offset="100%" stopColor="#7e22ce" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        );

      case "dispute_shield":
      default:
        return (
          <div className="relative flex flex-col items-center">
            {/* DisputeShield SVG Avatar */}
            <svg viewBox="0 0 100 120" className={`w-20 h-24 transition-transform duration-300 ${isSelected ? "scale-110 drop-shadow-xl" : "hover:scale-105"}`}>
              <ellipse cx="50" cy="112" rx="30" ry="6" fill="rgba(0,0,0,0.15)" />
              <rect x="25" y="25" width="50" height="75" rx="25" fill="url(#shieldGradient)" />
              <polygon points="42,56 46,60 42,64" fill="#0f172a" />
              <polygon points="58,56 54,60 58,64" fill="#0f172a" />
              <circle cx="50" cy="60" r="2.5" fill="#e11d48" />
              <circle cx="40" cy="40" r="6" fill="#0f172a" stroke="#f43f5e" strokeWidth="1.5" />
              <circle cx="60" cy="40" r="6" fill="#0f172a" stroke="#f43f5e" strokeWidth="1.5" />
              <circle cx="41" cy="39" r="2" fill="#ffffff" />
              <circle cx="61" cy="39" r="2" fill="#ffffff" />
              <path d="M 43 49 Q 50 54 57 49" stroke="#9f1239" strokeWidth="2" fill="none" strokeLinecap="round" />
              <g transform="translate(62, 60)">
                <path d="M 0 0 L 22 0 Q 22 18 11 26 Q 0 18 0 0 Z" fill="#ffffff" stroke="#e11d48" strokeWidth="2" />
                <path d="M 4 4 L 18 4 Q 18 15 11 21 Q 4 15 4 4 Z" fill="#ffe4e6" />
                <path d="M 11 6 L 11 18" stroke="#e11d48" strokeWidth="1.5" />
                <path d="M 6 11 L 16 11" stroke="#e11d48" strokeWidth="1.5" />
              </g>
              <line x1="16" y1="65" x2="26" y2="78" stroke="#0f172a" strokeWidth="2" />
              <polygon points="14,63 16,68 18,65" fill="#f59e0b" />
              <defs>
                <linearGradient id="shieldGradient" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#fecdd3" />
                  <stop offset="100%" stopColor="#e11d48" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        );
    }
  };

  const currentChatList = chatMessages[selectedAgentId] || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      
      {/* Studio Header & Atmosphere Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-xs">
              <Bot className="h-4 w-4" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center space-x-2">
              <span>Agent Live Studio</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-semibold border border-blue-200 dark:border-blue-800">
                Live Data Mesh
              </span>
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Meet the 5 autonomous operations agents! See how they tap into enterprise data systems, pass signals to each other, and chat in character.
          </p>
        </div>

        {/* Studio Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDataFlowActive((prev) => !prev)}
            className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
              dataFlowActive
                ? "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800"
                : "bg-white text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
            }`}
          >
            <Radio className={`h-3.5 w-3.5 ${dataFlowActive ? "text-blue-600 animate-pulse" : "text-slate-400"}`} />
            <span>{dataFlowActive ? "Data Packets Flowing" : "Data Flow Paused"}</span>
          </button>
        </div>
      </div>

      {/* Main Studio Arena: Interactive Ecosystem Map */}
      <div className="relative rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50/70 via-white to-slate-50/70 p-6 shadow-xs dark:border-slate-800 dark:from-slate-900 dark:via-slate-850 dark:to-slate-900 overflow-hidden">
        
        {/* Subtle background grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

        {/* Section 1: Enterprise Data Systems Row */}
        <div className="relative z-10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
              <Building2 className="h-3.5 w-3.5 text-blue-500" />
              <span>Connected Enterprise Data Sources & Hardware Terminals</span>
            </span>
            <span className="text-[11px] text-slate-400">Click a data source or agent to inspect live packet streams</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {DATA_SYSTEMS.map((sys) => {
              const Icon = sys.icon;
              const isLinkedToSelected = agentProfile.linked_systems?.some((ls: string) => 
                ls.toLowerCase().includes(sys.shortName.toLowerCase()) || sys.name.toLowerCase().includes(ls.toLowerCase())
              );
              const isManuallySelected = selectedSystemId === sys.id;

              return (
                <div
                  key={sys.id}
                  onClick={() => setSelectedSystemId(isManuallySelected ? null : sys.id)}
                  className={`group relative p-3 rounded-xl border transition-all cursor-pointer ${
                    isManuallySelected || isLinkedToSelected
                      ? "border-blue-500 bg-white shadow-md dark:border-blue-500 dark:bg-slate-800 ring-2 ring-blue-400/20"
                      : "border-slate-200/80 bg-white/80 hover:bg-white dark:border-slate-800 dark:bg-slate-850/80 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <div className={`p-1.5 rounded-lg bg-${sys.color}-50 text-${sys.color}-600 dark:bg-${sys.color}-950/60 dark:text-${sys.color}-400`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                      {sys.shortName}
                    </span>
                  </div>
                  <div className="mt-2 text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    {sys.activeRecord}
                  </div>
                  {/* Glowing data link dot */}
                  <div className="mt-2 flex items-center justify-between text-[9px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                    <span className="flex items-center space-x-1">
                      <span className={`h-1.5 w-1.5 rounded-full bg-emerald-500 ${dataFlowActive ? "animate-ping" : ""}`} />
                      <span>STREAMING</span>
                    </span>
                    <span className="text-slate-400">99.9% sync</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Visual Animated Data Beams (SVG Layer) */}
        <div className="relative py-4 z-10 flex items-center justify-center">
          <div className="flex items-center space-x-2 text-xs font-mono font-semibold text-slate-400 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <Zap className={`h-3 w-3 text-amber-500 ${dataFlowActive ? "animate-bounce" : ""}`} />
            <span>Autonomous Cross-Reconciliation Data Mesh</span>
          </div>
        </div>

        {/* Section 2: The 6 Operations Agents Center Stage */}
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
              <Bot className="h-3.5 w-3.5 text-indigo-500" />
              <span>Specialized Autonomous Operations Agents (Click Any Agent to Chat)</span>
            </span>
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
              Active: {selectedAgent.name} ({selectedAgent.code_name})
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {activeAgentsList.map((agent) => {
              const isSelected = selectedAgentId === agent.id;
              const profile = (agent as any).agent_profile || (agent as any).minion_profile || {
                name: agent.name,
                catchphrase: agent.tagline,
                color: agent.color_theme,
              };

              return (
                <div
                  key={agent.id}
                  onClick={() => setSelectedAgentId(agent.id)}
                  className={`group relative flex flex-col items-center justify-between rounded-xl border p-4 text-center cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? "border-blue-500 bg-white ring-2 ring-blue-500/25 shadow-lg dark:border-blue-500 dark:bg-slate-800"
                      : "border-slate-200/90 bg-white/90 hover:bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-850 shadow-xs"
                  }`}
                >
                  {/* Active Indicator Pin */}
                  {isSelected && (
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-blue-600 text-white font-mono text-[9px] font-bold uppercase shadow-sm flex items-center space-x-1">
                      <span className="h-1 w-1 rounded-full bg-white animate-pulse" />
                      <span>Talking Now</span>
                    </div>
                  )}

                  {/* Agent Character Avatar Animation */}
                  <div className="pt-2 pb-1">
                    {renderAgentAvatar(agent.id, isSelected)}
                  </div>

                  {/* Agent Identifiers */}
                  <div className="w-full space-y-1">
                    <div className="flex items-center justify-center space-x-1.5">
                      <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                        {agent.name}
                      </span>
                    </div>
                    <div className="flex items-center justify-center space-x-1">
                      <span className="font-mono text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                        {agent.code_name}
                      </span>
                      {agent.id === "ops_beacon" ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
                          Report Console Agent
                        </span>
                      ) : (
                        <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {agent.title?.split(" ")[0]} Agent
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 italic line-clamp-2 px-1 pt-1 leading-snug">
                      "{agent.tagline || profile.catchphrase}"
                    </p>
                  </div>

                  {/* Status chip */}
                  <div className="mt-3 w-full pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px]">
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center space-x-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Ready</span>
                    </span>
                    <span className="text-slate-400 group-hover:text-blue-600 font-medium flex items-center">
                      Chat <ChevronRight className="h-3 w-3 ml-0.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Interactive Agent Inspector & Live Chat Dock */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Agent Dossier & Active Data Wiring */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div className="flex items-center space-x-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className={`p-2.5 rounded-xl bg-${selectedAgent.color_theme}-50 text-${selectedAgent.color_theme}-600 dark:bg-${selectedAgent.color_theme}-950/60 dark:text-${selectedAgent.color_theme}-400`}>
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  {selectedAgent.name}
                </h3>
                <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {selectedAgent.code_name}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {selectedAgent.title}
              </p>
            </div>
          </div>

          {/* Current Live Action */}
          <div className="rounded-lg bg-blue-50/70 p-3.5 border border-blue-200/80 dark:bg-blue-950/40 dark:border-blue-900/40 space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-blue-900 dark:text-blue-300 flex items-center space-x-1.5">
              <Activity className="h-3.5 w-3.5 text-blue-600 animate-pulse" />
              <span>What I'm Doing Right Now:</span>
            </div>
            <p className="text-xs text-blue-950 dark:text-blue-100 font-medium leading-relaxed">
              {agentProfile.current_live_action}
            </p>
          </div>

          {/* Active Data Links */}
          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Hardware & Data Systems I Tap Into:
            </div>
            <div className="space-y-1.5">
              {agentProfile.linked_systems?.map((sys: string, sIdx: number) => (
                <div
                  key={sIdx}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200"
                >
                  <div className="flex items-center space-x-2">
                    <Building2 className="h-3.5 w-3.5 text-blue-600" />
                    <span className="font-medium">{sys}</span>
                  </div>
                  <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                    ✓ STREAMING
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Personality & Capabilities */}
          <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1 pt-1">
            <span className="font-bold text-slate-800 dark:text-slate-200 block">Agent Personality:</span>
            <p className="text-slate-500 leading-relaxed">{agentProfile.personality}</p>
          </div>

          {/* Quick Actions */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
            {selectedAgent.id === "ops_beacon" && onNavigateToReports && (
              <button
                onClick={onNavigateToReports}
                className="w-full inline-flex items-center justify-center space-x-2 px-3 py-2 rounded-lg text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-xs transition"
              >
                <BarChart3 className="h-4 w-4" />
                <span>Open Report Console (Created by ReportBeacon) →</span>
              </button>
            )}
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => onOpenTutorial && onOpenTutorial(selectedAgent)}
                className="text-xs text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 font-medium transition"
              >
                View Full Tutorial →
              </button>
              <button
                onClick={() => onLaunchConsole && onLaunchConsole(selectedAgent)}
                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition"
              >
                <span>Launch in Console</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Agent Chat (2 cols) */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 lg:col-span-2 flex flex-col justify-between space-y-4">
          
          {/* Chat Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-2.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Live Chat with {selectedAgent.name}
              </h3>
              <span className="text-[11px] font-mono text-slate-400">
                (Operations & Intelligence Enabled)
              </span>
            </div>
            <button
              onClick={() => {
                setChatMessages((prev) => ({
                  ...prev,
                  [selectedAgentId]: [prev[selectedAgentId][0]],
                }));
              }}
              title="Reset Conversation"
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Chat Conversation Scroll Area */}
          <div className="flex-1 space-y-3.5 overflow-y-auto max-h-[340px] pr-2">
            {currentChatList.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
              >
                {/* Agent Action Caption */}
                {msg.funnyAction && (
                  <span className="text-[10px] italic text-slate-400 mb-1 px-2">
                    {msg.funnyAction}
                  </span>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-xs ${
                    msg.sender === "user"
                      ? "bg-blue-600 text-white rounded-br-none"
                      : "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100 rounded-bl-none border border-slate-200/60 dark:border-slate-700/60"
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.text}</p>
                </div>
                <span className="text-[9px] text-slate-400 mt-1 px-1">
                  {msg.timestamp}
                </span>
              </div>
            ))}

            {chatLoading && (
              <div className="flex items-center space-x-2 text-xs text-slate-400 py-1">
                <span className="h-2 w-2 rounded-full bg-blue-500 animate-bounce" />
                <span>{selectedAgent.name} is processing and typing...</span>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Suggested Operational / Interactive Quick Chips */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Quick Agent Prompts:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                "What are you doing right now?",
                "How do you catch errors?",
                "How do all 5 agents team up?",
                "Tell me an operations joke!",
              ].map((chip, cIdx) => (
                <button
                  key={cIdx}
                  onClick={() => handleSendChat(chip)}
                  disabled={chatLoading}
                  className="rounded-full bg-slate-100 hover:bg-blue-50 hover:text-blue-700 px-2.5 py-1 text-[11px] font-medium text-slate-600 transition dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-750"
                >
                  💡 {chip}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendChat(inputMessage);
              }}
              className="flex items-center space-x-2 pt-1"
            >
              <input
                type="text"
                placeholder={`Ask ${selectedAgent.name} anything about data, hauling, or operations...`}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                disabled={chatLoading}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2 text-xs text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              <button
                type="submit"
                disabled={chatLoading || !inputMessage.trim()}
                className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 transition"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>

        </div>

      </div>

    </div>
  );
}
