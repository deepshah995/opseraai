"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api/client";
import { SwarmBotAvatar, getCompanionMeta } from "@/components/agents/SwarmBotAvatar";
import {
  SwarmRun,
  SwarmWorkflow,
  WorkflowEdge,
  WorkflowEdgeCondition,
  WorkflowNode,
  WorkflowNodeKind,
} from "@/types";
import {
  Activity,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  DollarSign,
  FileSpreadsheet,
  FileText,
  GitBranch,
  Layers,
  Link2,
  Play,
  Plus,
  Receipt,
  RefreshCw,
  Save,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  Zap,
} from "lucide-react";

interface PaletteItem {
  kind: WorkflowNodeKind;
  ref_id: string;
  agent_id?: string;
  label: string;
  subtitle: string;
  group: "Inputs" | "Swarm Agents" | "Safety Gates" | "Outputs";
  defaultConfig: Record<string, any>;
}

const PALETTE_ITEMS: PaletteItem[] = [
  {
    kind: "connector_input",
    ref_id: "google_sheets",
    label: "Google Sheets Input",
    subtitle: "Import receiving slips & POs",
    group: "Inputs",
    defaultConfig: { connector_type: "google_sheets" },
  },
  {
    kind: "connector_input",
    ref_id: "erp_database",
    label: "Manufacturing ERP",
    subtitle: "Sync invoices & work orders",
    group: "Inputs",
    defaultConfig: { connector_type: "erp_database" },
  },
  {
    kind: "agent",
    ref_id: "bom_guard",
    agent_id: "bom_guard",
    label: "BOMGuard (BG-01)",
    subtitle: "Receiving & BOM weight audit",
    group: "Swarm Agents",
    defaultConfig: { tolerance_pct: 0.5 },
  },
  {
    kind: "agent",
    ref_id: "cost_sentry",
    agent_id: "cost_sentry",
    label: "CostSentry (CS-02)",
    subtitle: "3-way PO & invoice cost check",
    group: "Swarm Agents",
    defaultConfig: { check_duplicates: true },
  },
  {
    kind: "agent",
    ref_id: "line_pulse",
    agent_id: "line_pulse",
    label: "LinePulse (LP-03)",
    subtitle: "Machine cell & shift sync",
    group: "Swarm Agents",
    defaultConfig: { monitor_cnc_drift: true },
  },
  {
    kind: "agent",
    ref_id: "quality_shield",
    agent_id: "quality_shield",
    label: "QualityShield (QS-04)",
    subtitle: "QC inspection & NCR draft",
    group: "Swarm Agents",
    defaultConfig: { draft_ncr_notice: true },
  },
  {
    kind: "agent",
    ref_id: "plant_beacon",
    agent_id: "plant_beacon",
    label: "PlantBeacon (PB-05)",
    subtitle: "Plant ROI & savings rollup",
    group: "Swarm Agents",
    defaultConfig: { include_hours_saved: true },
  },
  {
    kind: "approval_gate",
    ref_id: "approval_gate",
    label: "Manager Sign-Off Gate",
    subtitle: "Hold high-dollar actions",
    group: "Safety Gates",
    defaultConfig: { threshold_usd: 500 },
  },
  {
    kind: "connector_output",
    ref_id: "google_docs",
    label: "Google Docs Brief",
    subtitle: "Publish executive ROI & NCR",
    group: "Outputs",
    defaultConfig: { connector_type: "google_docs" },
  },
  {
    kind: "connector_output",
    ref_id: "google_sheets",
    label: "Google Sheets Export",
    subtitle: "Push verified savings rows",
    group: "Outputs",
    defaultConfig: { connector_type: "google_sheets" },
  },
  {
    kind: "connector_output",
    ref_id: "slack_webhook",
    label: "Slack Ops Alert",
    subtitle: "Notify plant & AP channel",
    group: "Outputs",
    defaultConfig: { connector_type: "slack_webhook" },
  },
];

const EDGE_CONDITIONS: Array<{ value: WorkflowEdgeCondition; label: string }> = [
  { value: "always", label: "Always Forward" },
  { value: "if_discrepancy_found", label: "If Cost/Qty Leak Found" },
  { value: "if_variance_gt_500", label: "If Impact >= $500 (Hold)" },
  { value: "auto_settle_below_500", label: "If Impact < $500 (Auto-Clear)" },
];

const NODE_WIDTH = 224;
const NODE_HEIGHT = 82;

function getNodeVisuals(node: WorkflowNode) {
  if (node.kind === "connector_input" || node.kind === "connector_output") {
    if (node.ref_id === "google_sheets") {
      return {
        border: "border-emerald-300",
        bg: "bg-emerald-50/70",
        badge: "bg-emerald-600 text-white",
        icon: FileSpreadsheet,
        tag: node.kind === "connector_input" ? "INPUT" : "OUTPUT",
      };
    }
    if (node.ref_id === "google_docs") {
      return {
        border: "border-blue-300",
        bg: "bg-blue-50/70",
        badge: "bg-blue-600 text-white",
        icon: FileText,
        tag: "OUTPUT",
      };
    }
    if (node.ref_id === "slack_webhook") {
      return {
        border: "border-violet-300",
        bg: "bg-violet-50/70",
        badge: "bg-violet-600 text-white",
        icon: Zap,
        tag: "ALERT",
      };
    }
    return {
      border: "border-slate-300",
      bg: "bg-slate-50",
      badge: "bg-slate-700 text-white",
      icon: Database,
      tag: node.kind === "connector_input" ? "ERP IN" : "EXPORT",
    };
  }

  if (node.kind === "approval_gate") {
    return {
      border: "border-amber-300",
      bg: "bg-amber-50/80",
      badge: "bg-amber-600 text-white",
      icon: ShieldAlert,
      tag: "HUMAN GATE",
    };
  }

  // Manufacturing Agent visuals
  switch (node.ref_id) {
    case "bom_guard":
      return {
        border: "border-emerald-300",
        bg: "bg-white",
        badge: "bg-emerald-600 text-white",
        icon: Scale,
        tag: "AGENT",
      };
    case "cost_sentry":
      return {
        border: "border-amber-300",
        bg: "bg-white",
        badge: "bg-amber-600 text-white",
        icon: Receipt,
        tag: "AGENT",
      };
    case "line_pulse":
      return {
        border: "border-blue-300",
        bg: "bg-white",
        badge: "bg-blue-600 text-white",
        icon: Cpu,
        tag: "AGENT",
      };
    case "quality_shield":
      return {
        border: "border-rose-300",
        bg: "bg-white",
        badge: "bg-rose-600 text-white",
        icon: ShieldCheck,
        tag: "AGENT",
      };
    default:
      return {
        border: "border-indigo-300",
        bg: "bg-white",
        badge: "bg-indigo-600 text-white",
        icon: BarChart3,
        tag: "AGENT",
      };
  }
}

export function SwarmBuilderView({
  onNavigateTab,
}: {
  onNavigateTab?: (tab: string) => void;
}) {
  const [workflows, setWorkflows] = useState<SwarmWorkflow[]>([]);
  const [activeWorkflowId, setActiveWorkflowId] = useState<string | null>(null);
  const [wfName, setWfName] = useState("");
  const [wfDesc, setWfDesc] = useState("");
  const [wfCategory, setWfCategory] = useState("cost_savings");
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [edges, setEdges] = useState<WorkflowEdge[]>([]);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [connectSourceId, setConnectSourceId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<{
    tone: "success" | "error" | "info";
    text: string;
  } | null>(null);

  const [latestRun, setLatestRun] = useState<SwarmRun | null>(null);
  const [runHistory, setRunHistory] = useState<SwarmRun[]>([]);

  // Node drag tracking on the canvas
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [draggingNode, setDraggingNode] = useState<{
    id: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const activeWorkflow = useMemo(
    () => workflows.find((w) => w.id === activeWorkflowId) || null,
    [workflows, activeWorkflowId],
  );

  const selectWorkflow = async (wf: SwarmWorkflow) => {
    setActiveWorkflowId(wf.id);
    setWfName(wf.name);
    setWfDesc(wf.description || "");
    setWfCategory(wf.category || "cost_savings");
    setNodes(wf.nodes || []);
    setEdges(wf.edges || []);
    setSelectedNodeId(wf.nodes?.[0]?.id || null);
    setSelectedEdgeId(null);
    setConnectSourceId(null);
    setConfirmDeleteId(null);
    setLatestRun(null);
    try {
      const hist = await api.listWorkflowRuns(wf.id);
      setRunHistory(hist);
      if (hist.length > 0) {
        setLatestRun(hist[0]);
      }
    } catch {
      setRunHistory([]);
    }
  };

  const loadWorkflows = async (selectId?: string) => {
    try {
      setLoading(true);
      const data = await api.listWorkflows();
      setWorkflows(data);
      const target =
        (selectId ? data.find((w) => w.id === selectId) : null) || data[0];
      if (target) {
        await selectWorkflow(target);
      }
    } catch (err: any) {
      setStatusBanner({
        tone: "error",
        text: err.message || "Failed to load swarm workflows.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkflows();
  }, []);

  // Mouse dragging for nodes inside canvas
  useEffect(() => {
    if (!draggingNode) return;
    const handleMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const rawX = e.clientX - rect.left + canvasRef.current.scrollLeft - draggingNode.offsetX;
      const rawY = e.clientY - rect.top + canvasRef.current.scrollTop - draggingNode.offsetY;
      const snappedX = Math.max(20, Math.min(1080, Math.round(rawX / 10) * 10));
      const snappedY = Math.max(20, Math.min(460, Math.round(rawY / 10) * 10));
      setNodes((prev) =>
        prev.map((n) =>
          n.id === draggingNode.id ? { ...n, x: snappedX, y: snappedY } : n,
        ),
      );
    };
    const handleMouseUp = () => setDraggingNode(null);

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [draggingNode]);

  const addNodeFromPalette = (
    item: PaletteItem,
    coords?: { x: number; y: number },
  ) => {
    const idx = nodes.length;
    const x =
      coords?.x ??
      Math.min(880, 60 + (idx % 4) * 260);
    const y =
      coords?.y ??
      Math.min(380, 60 + Math.floor(idx / 4) * 130);

    const newNode: WorkflowNode = {
      id: `n-${item.ref_id}-${Date.now().toString(36).slice(-4)}`,
      kind: item.kind,
      ref_id: item.ref_id,
      agent_id: item.agent_id || null,
      label: item.label,
      subtitle: item.subtitle,
      x: Math.round(x / 10) * 10,
      y: Math.round(y / 10) * 10,
      config: { ...item.defaultConfig },
    };
    setNodes((prev) => [...prev, newNode]);
    setSelectedNodeId(newNode.id);
    setSelectedEdgeId(null);
    setStatusBanner({
      tone: "info",
      text: `Added "${item.label}" to canvas. Wire it to another block or click Save Workflow.`,
    });
  };

  const handlePaletteDragStart = (
    e: React.DragEvent<HTMLElement>,
    item: PaletteItem,
  ) => {
    e.dataTransfer.setData("application/opsera-node", JSON.stringify(item));
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleCanvasDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData("application/opsera-node");
    if (!raw || !canvasRef.current) return;
    try {
      const item: PaletteItem = JSON.parse(raw);
      const rect = canvasRef.current.getBoundingClientRect();
      const x = Math.max(
        20,
        Math.min(
          1040,
          e.clientX - rect.left + canvasRef.current.scrollLeft - NODE_WIDTH / 2,
        ),
      );
      const y = Math.max(
        20,
        Math.min(
          420,
          e.clientY - rect.top + canvasRef.current.scrollTop - NODE_HEIGHT / 2,
        ),
      );
      addNodeFromPalette(item, { x, y });
    } catch {
      // ignore invalid drag data
    }
  };

  const completeEdgeConnection = (targetId: string) => {
    if (!connectSourceId) return;
    if (connectSourceId === targetId) {
      setConnectSourceId(null);
      return;
    }
    const alreadyExists = edges.some(
      (ed) => ed.source === connectSourceId && ed.target === targetId,
    );
    if (alreadyExists) {
      setConnectSourceId(null);
      setStatusBanner({ tone: "info", text: "Connection already exists between those two blocks." });
      return;
    }
    const newEdge: WorkflowEdge = {
      id: `e-${Date.now().toString(36).slice(-5)}`,
      source: connectSourceId,
      target: targetId,
      condition: "always",
      label: "Always Forward",
    };
    setEdges((prev) => [...prev, newEdge]);
    setSelectedEdgeId(newEdge.id);
    setSelectedNodeId(null);
    setConnectSourceId(null);
    setStatusBanner({ tone: "success", text: "Blocks connected! Edit routing rules on the right if needed." });
  };

  const handleCreateBlankWorkflow = () => {
    setActiveWorkflowId(null);
    setWfName("Custom Plant Swarm Flow");
    setWfDesc("Designed in the Drag & Drop Orchestrator using Google Antigravity SDK.");
    setWfCategory("cost_savings");
    setNodes([
      {
        id: "n-start-sheet",
        kind: "connector_input",
        ref_id: "google_sheets",
        label: "Google Sheets Input",
        subtitle: "Import receiving & POs",
        x: 60,
        y: 150,
        config: { connector_type: "google_sheets" },
      },
      {
        id: "n-start-agent",
        kind: "agent",
        ref_id: "cost_sentry",
        agent_id: "cost_sentry",
        label: "CostSentry (CS-02)",
        subtitle: "3-way PO & invoice cost check",
        x: 380,
        y: 150,
        config: { check_duplicates: true },
      },
    ]);
    setEdges([
      {
        id: "e-start",
        source: "n-start-sheet",
        target: "n-start-agent",
        condition: "always",
        label: "Incoming Rows",
      },
    ]);
    setSelectedNodeId("n-start-agent");
    setSelectedEdgeId(null);
    setLatestRun(null);
    setRunHistory([]);
    setStatusBanner({
      tone: "info",
      text: "Started a new custom workflow. Drag more blocks from the left, wire them, then click Save.",
    });
  };

  const persistCurrentWorkflow = async (): Promise<SwarmWorkflow | null> => {
    if (!wfName.trim() || nodes.length === 0) {
      setStatusBanner({
        tone: "error",
        text: "Please provide a workflow name and keep at least one block on the canvas.",
      });
      return null;
    }
    setSaving(true);
    try {
      const estAgents = nodes.filter((n) => n.kind === "agent").length;
      const payload = {
        name: wfName.trim(),
        description: wfDesc.trim(),
        category: wfCategory,
        nodes,
        edges,
        estimated_cost_savings_usd: Math.max(850, estAgents * 1450),
        estimated_hours_saved_monthly: Math.max(12, estAgents * 16),
      };

      let saved: SwarmWorkflow;
      if (activeWorkflowId) {
        saved = await api.updateWorkflow(activeWorkflowId, payload);
        setWorkflows((prev) => prev.map((w) => (w.id === saved.id ? saved : w)));
      } else {
        saved = await api.createWorkflow(payload);
        setWorkflows((prev) => [saved, ...prev]);
        setActiveWorkflowId(saved.id);
      }
      setStatusBanner({
        tone: "success",
        text: `Saved workflow "${saved.name}" cleanly.`,
      });
      return saved;
    } catch (err: any) {
      setStatusBanner({
        tone: "error",
        text: err.message || "Failed to save workflow.",
      });
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleRunWorkflow = async () => {
    setRunning(true);
    setStatusBanner(null);
    try {
      const saved = await persistCurrentWorkflow();
      if (!saved) {
        setRunning(false);
        return;
      }
      const runResult = await api.runWorkflow(saved.id, false);
      setLatestRun(runResult);
      setRunHistory((prev) => [runResult, ...prev]);
      // refresh workflow list summary
      const updatedList = await api.listWorkflows();
      setWorkflows(updatedList);
      setStatusBanner({
        tone: "success",
        text: `Swarm finished! Identified $${runResult.total_cost_savings_usd.toLocaleString()} in cost savings and saved ${runResult.total_hours_saved} hrs.`,
      });
    } catch (err: any) {
      setStatusBanner({
        tone: "error",
        text: err.message || "Workflow execution failed.",
      });
    } finally {
      setRunning(false);
    }
  };

  const handleDeleteWorkflow = async (id: string) => {
    try {
      await api.deleteWorkflow(id);
      const remaining = workflows.filter((w) => w.id !== id);
      setWorkflows(remaining);
      setConfirmDeleteId(null);
      if (remaining.length > 0) {
        await selectWorkflow(remaining[0]);
      } else {
        handleCreateBlankWorkflow();
      }
      setStatusBanner({ tone: "success", text: "Workflow deleted." });
    } catch (err: any) {
      setStatusBanner({ tone: "error", text: err.message || "Could not delete workflow." });
    }
  };

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null;
  const selectedEdge = edges.find((ed) => ed.id === selectedEdgeId) || null;

  const deleteSelectedNode = () => {
    if (!selectedNode) return;
    setNodes((prev) => prev.filter((n) => n.id !== selectedNode.id));
    setEdges((prev) =>
      prev.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id),
    );
    setSelectedNodeId(null);
  };

  const deleteSelectedEdge = () => {
    if (!selectedEdge) return;
    setEdges((prev) => prev.filter((e) => e.id !== selectedEdge.id));
    setSelectedEdgeId(null);
  };

  const paletteGroups: Array<PaletteItem["group"]> = [
    "Inputs",
    "Swarm Agents",
    "Safety Gates",
    "Outputs",
  ];

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Header Control Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
            <div className="h-10 w-10 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0">
              <GitBranch className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 shrink-0 whitespace-nowrap">
                  <Sparkles className="h-3 w-3" />
                  Google Antigravity SDK
                </span>
              </div>
              <input
                type="text"
                value={wfName}
                onChange={(e) => setWfName(e.target.value)}
                placeholder="Workflow Name..."
                aria-label="Workflow Name"
                className="w-full font-semibold text-base text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-600 focus:outline-none px-1 py-0.5"
              />
              <textarea
                rows={2}
                value={wfDesc}
                onChange={(e) => setWfDesc(e.target.value)}
                placeholder="Describe what cost or time saving this swarm flow automates..."
                aria-label="Workflow Description"
                className="w-full text-xs text-slate-500 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-blue-500 focus:outline-none px-1 py-0.5 resize-none leading-snug"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCreateBlankWorkflow}
              className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              New Flow
            </button>

            <button
              type="button"
              onClick={persistCurrentWorkflow}
              disabled={saving}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 text-slate-800 bg-white hover:bg-slate-50 disabled:opacity-50 flex items-center gap-1.5"
            >
              {saving ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Save
            </button>

            <button
              type="button"
              onClick={handleRunWorkflow}
              disabled={running || nodes.length === 0}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 hover:bg-slate-800 text-white disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
            >
              {running ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
              {running ? "Running Swarm..." : "Run Flow Now"}
            </button>
          </div>
        </div>

        {/* Saved Templates / Flows Selector Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Saved Flows:
            </span>
            {loading ? (
              <span className="text-xs text-slate-400">Loading templates...</span>
            ) : (
              workflows.map((wf) => {
                const isSelected = wf.id === activeWorkflowId;
                return (
                  <button
                    key={wf.id}
                    type="button"
                    onClick={() => selectWorkflow(wf)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    <Layers className="h-3 w-3 opacity-80" />
                    <span className="truncate max-w-[200px]">{wf.name}</span>
                  </button>
                );
              })
            )}
          </div>

          {activeWorkflow && !activeWorkflow.is_template && (
            <div className="flex items-center gap-2">
              {confirmDeleteId === activeWorkflow.id ? (
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-rose-700 font-medium">Delete flow?</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteWorkflow(activeWorkflow.id)}
                    className="px-2 py-1 rounded bg-rose-600 text-white font-medium hover:bg-rose-700"
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(null)}
                    className="px-2 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(activeWorkflow.id)}
                  className="text-xs text-slate-500 hover:text-rose-600 flex items-center gap-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Flow
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Inline Feedback Banner */}
      {statusBanner && (
        <div
          className={`px-4 py-2.5 rounded-lg border text-xs font-medium flex items-center justify-between gap-3 ${
            statusBanner.tone === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : statusBanner.tone === "error"
                ? "bg-rose-50 border-rose-200 text-rose-800"
                : "bg-blue-50 border-blue-200 text-blue-800"
          }`}
        >
          <span>{statusBanner.text}</span>
          {onNavigateTab && statusBanner.tone === "success" && (
            <button
              type="button"
              onClick={() => onNavigateTab("connectors")}
              className="underline font-semibold shrink-0"
            >
              View Synced Apps &rarr;
            </button>
          )}
        </div>
      )}

      {/* Main 3-Column Builder Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* LEFT: Block Palette */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 p-3.5 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Building Blocks
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Drag onto the canvas or click + to add.
            </p>
          </div>

          <div className="space-y-3 max-h-[470px] overflow-y-auto pr-1">
            {paletteGroups.map((group) => (
              <div key={group} className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {group}
                </p>
                {PALETTE_ITEMS.filter((p) => p.group === group).map((item) => (
                  <div
                    key={`${item.kind}-${item.ref_id}`}
                    draggable
                    onDragStart={(e) => handlePaletteDragStart(e, item)}
                    className="group flex items-center justify-between gap-2 p-2 rounded-lg border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-blue-300 cursor-grab active:cursor-grabbing transition-all"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {item.kind === "agent" && (
                        <SwarmBotAvatar agentId={item.ref_id} mood="happy" size="xs" />
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate">
                          {item.label}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate">
                          {item.kind === "agent"
                            ? `${getCompanionMeta(item.ref_id).nickname} · ${item.subtitle}`
                            : item.subtitle}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => addNodeFromPalette(item)}
                      title={`Add ${item.label}`}
                      className="p-1 rounded bg-white border border-slate-200 text-slate-600 hover:bg-slate-900 hover:text-white shrink-0"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* CENTER: Drag-and-Drop Canvas */}
        <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-3.5 py-2.5 border-b border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-slate-600">
              <span className="font-semibold text-slate-800">Orchestration Canvas</span>
              <span className="text-slate-400">·</span>
              <span>{nodes.length} blocks, {edges.length} links</span>
            </div>
            {connectSourceId ? (
              <div className="flex items-center gap-2 bg-blue-600 text-white px-2.5 py-1 rounded-md text-[11px] font-medium">
                <span>Click any target block to complete wire...</span>
                <button
                  type="button"
                  onClick={() => setConnectSourceId(null)}
                  className="underline font-bold"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <span className="text-[11px] text-slate-500">
                Drag blocks to arrange · Click <Link2 className="h-3 w-3 inline" /> to connect
              </span>
            )}
          </div>

          <div
            ref={canvasRef}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "copy";
            }}
            onDrop={handleCanvasDrop}
            onClick={() => {
              setSelectedNodeId(null);
              setSelectedEdgeId(null);
            }}
            className="relative h-[500px] overflow-auto bg-[#f8fafc] select-none"
            style={{
              backgroundImage:
                "radial-gradient(#cbd5e1 1px, transparent 1px)",
              backgroundSize: "18px 18px",
            }}
          >
            <div className="relative min-w-[1180px] min-h-[500px]">
              {/* SVG Edge Layer */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                viewBox="0 0 1180 500"
              >
                <defs>
                  <marker
                    id="arrow-slate"
                    viewBox="0 0 10 10"
                    refX="9"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#64748b" />
                  </marker>
                  <marker
                    id="arrow-blue"
                    viewBox="0 0 10 10"
                    refX="9"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#2563eb" />
                  </marker>
                </defs>

                {edges.map((edge) => {
                  const src = nodes.find((n) => n.id === edge.source);
                  const tgt = nodes.find((n) => n.id === edge.target);
                  if (!src || !tgt) return null;

                  const x1 = src.x + NODE_WIDTH;
                  const y1 = src.y + NODE_HEIGHT / 2;
                  const x2 = tgt.x;
                  const y2 = tgt.y + NODE_HEIGHT / 2;
                  const dx = Math.max(55, Math.abs(x2 - x1) * 0.45);
                  const pathD = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
                  const isEdgeSel = edge.id === selectedEdgeId;

                  return (
                    <g key={edge.id}>
                      <path
                        d={pathD}
                        fill="none"
                        stroke={isEdgeSel ? "#2563eb" : "#64748b"}
                        strokeWidth={isEdgeSel ? 3 : 2}
                        strokeDasharray={edge.condition === "always" ? undefined : "5 4"}
                        markerEnd={isEdgeSel ? "url(#arrow-blue)" : "url(#arrow-slate)"}
                      />
                    </g>
                  );
                })}
              </svg>

              {/* Clickable Edge Condition Pills */}
              {edges.map((edge) => {
                const src = nodes.find((n) => n.id === edge.source);
                const tgt = nodes.find((n) => n.id === edge.target);
                if (!src || !tgt) return null;
                const midX = (src.x + NODE_WIDTH + tgt.x) / 2;
                const midY = (src.y + NODE_HEIGHT / 2 + tgt.y + NODE_HEIGHT / 2) / 2;
                const isEdgeSel = edge.id === selectedEdgeId;
                return (
                  <button
                    key={`pill-${edge.id}`}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedEdgeId(edge.id);
                      setSelectedNodeId(null);
                    }}
                    style={{
                      left: `${midX}px`,
                      top: `${midY}px`,
                      transform: "translate(-50%, -50%)",
                    }}
                    className={`absolute z-10 px-2 py-0.5 rounded-full text-[10px] font-medium border shadow-xs transition-colors ${
                      isEdgeSel
                        ? "bg-blue-600 text-white border-blue-700"
                        : "bg-white text-slate-600 border-slate-300 hover:border-blue-400"
                    }`}
                  >
                    {edge.label || edge.condition.replace(/_/g, " ")}
                  </button>
                );
              })}

              {/* Node Cards */}
              {nodes.map((node) => {
                const visuals = getNodeVisuals(node);
                const Icon = visuals.icon;
                const isSelected = node.id === selectedNodeId;
                const isWiringSource = node.id === connectSourceId;

                return (
                  <div
                    key={node.id}
                    style={{
                      left: `${node.x}px`,
                      top: `${node.y}px`,
                      width: `${NODE_WIDTH}px`,
                      height: `${NODE_HEIGHT}px`,
                    }}
                    onMouseDown={(e) => {
                      if ((e.target as HTMLElement).closest("button")) return;
                      e.stopPropagation();
                      if (connectSourceId && connectSourceId !== node.id) {
                        completeEdgeConnection(node.id);
                        return;
                      }
                      setSelectedNodeId(node.id);
                      setSelectedEdgeId(null);
                      const rect = (
                        e.currentTarget as HTMLDivElement
                      ).getBoundingClientRect();
                      setDraggingNode({
                        id: node.id,
                        offsetX: e.clientX - rect.left,
                        offsetY: e.clientY - rect.top,
                      });
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (connectSourceId && connectSourceId !== node.id) {
                        completeEdgeConnection(node.id);
                        return;
                      }
                      setSelectedNodeId(node.id);
                      setSelectedEdgeId(null);
                    }}
                    className={`absolute z-20 rounded-xl border-2 p-2.5 shadow-sm transition-shadow cursor-move ${visuals.bg} ${
                      isSelected
                        ? "border-blue-600 ring-2 ring-blue-100 shadow-md"
                        : isWiringSource
                          ? "border-indigo-600 ring-2 ring-indigo-100"
                          : visuals.border
                    } ${
                      connectSourceId && connectSourceId !== node.id
                        ? "hover:ring-2 hover:ring-blue-400 cursor-pointer"
                        : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {node.kind === "agent" ? (
                          <SwarmBotAvatar
                            agentId={node.agent_id || node.ref_id}
                            mood={running ? "scanning" : "happy"}
                            size="xs"
                          />
                        ) : (
                          <div className={`p-1.5 rounded-lg shrink-0 ${visuals.badge}`}>
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block leading-none mb-0.5">
                            {node.kind === "agent"
                              ? getCompanionMeta(node.agent_id || node.ref_id).nickname
                              : visuals.tag}
                          </span>
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {node.label}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        title="Connect this block to another block"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConnectSourceId(
                            isWiringSource ? null : node.id,
                          );
                        }}
                        className={`p-1 rounded border text-[10px] font-semibold shrink-0 ${
                          isWiringSource
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white text-slate-500 border-slate-200 hover:text-blue-600 hover:border-blue-300"
                        }`}
                      >
                        <Link2 className="h-3 w-3" />
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-1.5">
                      {node.subtitle || "Configured block"}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT: Inspector Panel */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Block &amp; Rule Inspector
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Click any block or connection line to customize.
            </p>
          </div>

          {selectedNode ? (
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Display Label
                </label>
                <input
                  type="text"
                  value={selectedNode.label}
                  onChange={(e) =>
                    setNodes((prev) =>
                      prev.map((n) =>
                        n.id === selectedNode.id ? { ...n, label: e.target.value } : n,
                      ),
                    )
                  }
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Task Description
                </label>
                <input
                  type="text"
                  value={selectedNode.subtitle || ""}
                  onChange={(e) =>
                    setNodes((prev) =>
                      prev.map((n) =>
                        n.id === selectedNode.id ? { ...n, subtitle: e.target.value } : n,
                      ),
                    )
                  }
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>

              {selectedNode.kind === "approval_gate" && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Manager Approval Threshold (USD)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={50}
                    value={Number(selectedNode.config?.threshold_usd ?? 500)}
                    onChange={(e) => {
                      const val = Number(e.target.value || 0);
                      setNodes((prev) =>
                        prev.map((n) =>
                          n.id === selectedNode.id
                            ? { ...n, config: { ...n.config, threshold_usd: val } }
                            : n,
                        ),
                      );
                    }}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Variances at or above this amount wait for 1-click manager approval.
                  </p>
                </div>
              )}

              {selectedNode.ref_id === "bom_guard" && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Weight Variance Tolerance (%)
                  </label>
                  <input
                    type="number"
                    min={0.1}
                    max={10}
                    step={0.1}
                    value={Number(selectedNode.config?.tolerance_pct ?? 0.5)}
                    onChange={(e) => {
                      const val = Number(e.target.value || 0.5);
                      setNodes((prev) =>
                        prev.map((n) =>
                          n.id === selectedNode.id
                            ? { ...n, config: { ...n.config, tolerance_pct: val } }
                            : n,
                        ),
                      );
                    }}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setConnectSourceId(selectedNode.id)}
                  className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 flex items-center gap-1"
                >
                  <Link2 className="h-3.5 w-3.5" />
                  Connect Outbound
                </button>
                <button
                  type="button"
                  onClick={deleteSelectedNode}
                  className="px-2.5 py-1.5 text-xs font-medium rounded-lg text-rose-600 hover:bg-rose-50 flex items-center gap-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </button>
              </div>
            </div>
          ) : selectedEdge ? (
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Routing Rule
                </label>
                <select
                  value={selectedEdge.condition}
                  onChange={(e) => {
                    const cond = e.target.value as WorkflowEdgeCondition;
                    const found = EDGE_CONDITIONS.find((c) => c.value === cond);
                    setEdges((prev) =>
                      prev.map((ed) =>
                        ed.id === selectedEdge.id
                          ? { ...ed, condition: cond, label: found?.label || ed.label }
                          : ed,
                      ),
                    );
                  }}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-blue-500"
                >
                  {EDGE_CONDITIONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Link Label
                </label>
                <input
                  type="text"
                  value={selectedEdge.label || ""}
                  onChange={(e) =>
                    setEdges((prev) =>
                      prev.map((ed) =>
                        ed.id === selectedEdge.id ? { ...ed, label: e.target.value } : ed,
                      ),
                    )
                  }
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>
              <button
                type="button"
                onClick={deleteSelectedEdge}
                className="w-full px-3 py-1.5 text-xs font-medium rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 flex items-center justify-center gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove Connection
              </button>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-400 space-y-2">
              <Activity className="h-6 w-6 mx-auto opacity-60" />
              <p>Select any block or connection line on the canvas to configure its thresholds.</p>
            </div>
          )}

          {/* Monthly Impact Estimate */}
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Projected Plant Impact
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                <p className="text-[10px] text-emerald-700 font-medium">Est. Cost Saved</p>
                <p className="text-sm font-bold text-emerald-900">
                  $
                  {(
                    activeWorkflow?.estimated_cost_savings_usd ??
                    Math.max(850, nodes.filter((n) => n.kind === "agent").length * 1450)
                  ).toLocaleString()}
                  /mo
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200">
                <p className="text-[10px] text-blue-700 font-medium">Time Saved</p>
                <p className="text-sm font-bold text-blue-900">
                  {activeWorkflow?.estimated_hours_saved_monthly ??
                    Math.max(12, nodes.filter((n) => n.kind === "agent").length * 16)}{" "}
                  hrs/mo
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Execution Results & Artifacts */}
      {latestRun && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Latest Swarm Execution — {latestRun.workflow_name}
                </h3>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  {latestRun.sdk}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">{latestRun.orchestrator_summary}</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-emerald-600" />
                <div>
                  <p className="text-[10px] font-semibold uppercase text-emerald-700">
                    Cost Savings Found
                  </p>
                  <p className="text-sm font-bold text-emerald-900">
                    ${latestRun.total_cost_savings_usd.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="px-3 py-2 rounded-lg bg-blue-50 border border-blue-200 flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-[10px] font-semibold uppercase text-blue-700">
                    Time Saved
                  </p>
                  <p className="text-sm font-bold text-blue-900">
                    {latestRun.total_hours_saved} hrs ({Math.round(latestRun.total_time_saved_minutes)} min)
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Step-by-Step Pipeline Output */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {latestRun.steps.map((step, i) => (
              <div
                key={`${step.node_id}-${i}`}
                className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold text-slate-500">
                    STEP {i + 1} · {step.kind.replace(/_/g, " ").toUpperCase()}
                  </span>
                  {step.kind === "agent" ? (
                    <SwarmBotAvatar agentId={step.label.toLowerCase().includes("bom") ? "bom_guard" : step.label.toLowerCase().includes("cost") ? "cost_sentry" : step.label.toLowerCase().includes("line") ? "line_pulse" : step.label.toLowerCase().includes("quality") ? "quality_shield" : "plant_beacon"} mood="proud" size="xs" />
                  ) : (
                    <ArrowRight className="h-3 w-3 text-slate-400" />
                  )}
                </div>
                <p className="text-xs font-bold text-slate-900 truncate">{step.label}</p>
                <p className="text-[11px] text-slate-600 leading-relaxed">{step.summary}</p>
                <div className="flex items-center justify-between pt-1 text-[10px] font-semibold text-slate-500">
                  <span className="text-emerald-700">
                    {step.cost_savings_usd > 0 ? `+$${step.cost_savings_usd.toFixed(0)} saved` : "Verified"}
                  </span>
                  <span>{step.time_saved_minutes} min saved</span>
                </div>
              </div>
            ))}
          </div>

          {latestRun.exported_artifacts && latestRun.exported_artifacts.length > 0 && (
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <p className="text-xs font-bold text-slate-700">
                Output Artifacts Produced
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {latestRun.exported_artifacts.map((art, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border border-blue-200 bg-blue-50/40 text-xs space-y-1"
                  >
                    <p className="font-bold text-slate-900">{art.title}</p>
                    {art.preview && (
                      <p className="text-slate-600 whitespace-pre-wrap">{art.preview}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {runHistory.length > 1 && (
            <p className="text-[11px] text-slate-400">
              Showing latest run · {runHistory.length} saved executions recorded for this workflow.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
