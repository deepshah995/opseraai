"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { SwarmBotAvatar } from "@/components/agents/SwarmBotAvatar";
import {
  CheckCircle2,
  Database,
  FileCheck2,
  FileSpreadsheet,
  GitBranch,
  Link2,
  Play,
  Plus,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

export interface SandboxAgentHint {
  agent_id: string;
  agent_name: string;
  code_name: string;
  focus: string;
}

interface SkeletalWorkflowSandboxProps {
  companyName: string;
  erpStack: string[];
  agentDeployments: SandboxAgentHint[];
}

type BlockKind = "input" | "agent" | "gate" | "output";

interface SandboxNode {
  id: string;
  kind: BlockKind;
  refId: string;
  title: string;
  subtitle: string;
  agentId?: string;
  badgeText: string;
  x: number;
  y: number;
}

interface SandboxEdge {
  id: string;
  source: string;
  target: string;
  label: string;
}

interface PaletteBlueprint {
  kind: BlockKind;
  refId: string;
  title: string;
  subtitle: string;
  agentId?: string;
  badgeText: string;
}

const CANVAS_W = 1020;
const CANVAS_H = 440;
const NODE_W = 196;
const NODE_H = 78;

const KIND_STYLES: Record<
  BlockKind,
  { card: string; pill: string; iconBg: string }
> = {
  input: {
    card: "bg-emerald-50/75 border-emerald-300",
    pill: "bg-emerald-700 text-white",
    iconBg: "bg-emerald-600 text-white",
  },
  agent: {
    card: "bg-white border-blue-300",
    pill: "bg-blue-700 text-white",
    iconBg: "bg-blue-600 text-white",
  },
  gate: {
    card: "bg-amber-50/85 border-amber-300",
    pill: "bg-amber-600 text-white",
    iconBg: "bg-amber-500 text-white",
  },
  output: {
    card: "bg-indigo-50/75 border-indigo-300",
    pill: "bg-indigo-700 text-white",
    iconBg: "bg-indigo-600 text-white",
  },
};

const PALETTE_GROUPS: Array<{ heading: string; items: PaletteBlueprint[] }> = [
  {
    heading: "1. Read-Only Inputs",
    items: [
      {
        kind: "input",
        refId: "erp_csv",
        title: "ERP / Plant CSV",
        subtitle: "Read-only export feed",
        badgeText: "DATA IN",
      },
      {
        kind: "input",
        refId: "scale_log",
        title: "Receiving & Dock Log",
        subtitle: "Weights & packing slips",
        badgeText: "DATA IN",
      },
    ],
  },
  {
    heading: "2. AI Agents",
    items: [
      {
        kind: "agent",
        refId: "bom_guard",
        agentId: "bom_guard",
        title: "Materials Agent",
        subtitle: "Checks weights vs. POs",
        badgeText: "BOMGuard",
      },
      {
        kind: "agent",
        refId: "cost_sentry",
        agentId: "cost_sentry",
        title: "Billing Agent",
        subtitle: "Flags overcharges & leaks",
        badgeText: "CostSentry",
      },
      {
        kind: "agent",
        refId: "line_pulse",
        agentId: "line_pulse",
        title: "Schedule Agent",
        subtitle: "Syncs shifts & floor runs",
        badgeText: "LinePulse",
      },
      {
        kind: "agent",
        refId: "quality_shield",
        agentId: "quality_shield",
        title: "Quality Agent",
        subtitle: "Bundles QA & claim proof",
        badgeText: "QualityShield",
      },
      {
        kind: "agent",
        refId: "plant_beacon",
        agentId: "plant_beacon",
        title: "Summary Agent",
        subtitle: "Weekly savings digest",
        badgeText: "PlantBeacon",
      },
    ],
  },
  {
    heading: "3. Approval & Outputs",
    items: [
      {
        kind: "gate",
        refId: "approval_gate",
        title: "Manager Sign-Off",
        subtitle: "Holds items for review",
        badgeText: "CONTROL",
      },
      {
        kind: "output",
        refId: "roi_brief",
        title: "Friday ROI Brief",
        subtitle: "Email & Docs summary",
        badgeText: "OUTPUT",
      },
      {
        kind: "output",
        refId: "sheet_export",
        title: "Clean Exception Sheet",
        subtitle: "Ready-to-post CSV",
        badgeText: "OUTPUT",
      },
    ],
  },
];

function agentTitleFromHint(hint: SandboxAgentHint | undefined, fallbackTitle: string): {
  agentId: string;
  title: string;
  badgeText: string;
  subtitle: string;
} {
  if (!hint) {
    return {
      agentId: "bom_guard",
      title: fallbackTitle,
      badgeText: "BOMGuard",
      subtitle: "Side-by-side spreadsheet check",
    };
  }
  const cleanTitle = hint.agent_name.includes("Agent")
    ? hint.agent_name
    : `${hint.agent_name} Agent`;
  return {
    agentId: hint.agent_id || "bom_guard",
    title: cleanTitle,
    badgeText: hint.code_name || "AI Agent",
    subtitle: hint.focus || "Automated check",
  };
}

function buildStarterGraph(
  companyName: string,
  erpStack: string[],
  agentDeployments: SandboxAgentHint[]
): { nodes: SandboxNode[]; edges: SandboxEdge[] } {
  const primaryErp = erpStack[0] || "ERP / Shop Sheets";
  const a1 = agentTitleFromHint(agentDeployments[0], "Materials Agent");
  const a2 = agentTitleFromHint(
    agentDeployments[1] || {
      agent_id: "cost_sentry",
      agent_name: "Billing Agent",
      code_name: "CostSentry",
      focus: "Flags price creep & unbilled jobs",
    },
    "Billing Agent"
  );

  const nodes: SandboxNode[] = [
    {
      id: "starter-in",
      kind: "input",
      refId: "erp_csv",
      title: primaryErp,
      subtitle: `Read-only export (${companyName.split(" ")[0]})`,
      badgeText: "DATA IN",
      x: 26,
      y: 178,
    },
    {
      id: "starter-ag-1",
      kind: "agent",
      refId: a1.agentId,
      agentId: a1.agentId,
      title: a1.title,
      subtitle: a1.subtitle,
      badgeText: a1.badgeText,
      x: 278,
      y: 72,
    },
    {
      id: "starter-ag-2",
      kind: "agent",
      refId: a2.agentId,
      agentId: a2.agentId,
      title: a2.title,
      subtitle: a2.subtitle,
      badgeText: a2.badgeText,
      x: 278,
      y: 284,
    },
    {
      id: "starter-gate",
      kind: "gate",
      refId: "approval_gate",
      title: "Manager Sign-Off",
      subtitle: "Nothing changes without OK",
      badgeText: "HUMAN GATE",
      x: 540,
      y: 178,
    },
    {
      id: "starter-out",
      kind: "output",
      refId: "roi_brief",
      title: "Weekly ROI Brief",
      subtitle: "Email / Google Docs summary",
      badgeText: "OUTPUT",
      x: 794,
      y: 178,
    },
  ];

  const edges: SandboxEdge[] = [
    {
      id: "e-1",
      source: "starter-in",
      target: "starter-ag-1",
      label: "Receiving Feed",
    },
    {
      id: "e-2",
      source: "starter-in",
      target: "starter-ag-2",
      label: "Billing & Shifts",
    },
    {
      id: "e-3",
      source: "starter-ag-1",
      target: "starter-gate",
      label: "Verified Flags",
    },
    {
      id: "e-4",
      source: "starter-ag-2",
      target: "starter-gate",
      label: "Cost Alerts",
    },
    {
      id: "e-5",
      source: "starter-gate",
      target: "starter-out",
      label: "Approved Pack",
    },
  ];

  return { nodes, edges };
}

function defaultEdgeLabel(src?: SandboxNode, tgt?: SandboxNode): string {
  if (!src || !tgt) return "Handoff";
  if (src.kind === "input") return "CSV Rows";
  if (tgt.kind === "gate") return "For Approval";
  if (src.kind === "gate") return "Approved";
  if (tgt.kind === "output") return "Export Brief";
  return "Next Step";
}

function renderNodeIcon(node: SandboxNode) {
  if (node.kind === "agent") {
    return (
      <SwarmBotAvatar
        agentId={node.agentId || node.refId}
        mood="happy"
        size="xs"
      />
    );
  }
  const styles = KIND_STYLES[node.kind];
  if (node.kind === "input") {
    return (
      <div className={`p-1.5 rounded-lg shrink-0 ${styles.iconBg}`}>
        {node.refId === "scale_log" ? (
          <FileSpreadsheet className="h-3.5 w-3.5" />
        ) : (
          <Database className="h-3.5 w-3.5" />
        )}
      </div>
    );
  }
  if (node.kind === "gate") {
    return (
      <div className={`p-1.5 rounded-lg shrink-0 ${styles.iconBg}`}>
        <ShieldAlert className="h-3.5 w-3.5" />
      </div>
    );
  }
  return (
    <div className={`p-1.5 rounded-lg shrink-0 ${styles.iconBg}`}>
      <FileCheck2 className="h-3.5 w-3.5" />
    </div>
  );
}

export function SkeletalWorkflowSandbox({
  companyName,
  erpStack,
  agentDeployments,
}: SkeletalWorkflowSandboxProps) {
  const starter = useMemo(
    () => buildStarterGraph(companyName, erpStack, agentDeployments),
    [companyName, erpStack, agentDeployments]
  );

  const [nodes, setNodes] = useState<SandboxNode[]>(starter.nodes);
  const [edges, setEdges] = useState<SandboxEdge[]>(starter.edges);

  const [draggingNode, setDraggingNode] = useState<{
    id: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const [draftWire, setDraftWire] = useState<{
    sourceId: string;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    startClientX: number;
    startClientY: number;
  } | null>(null);

  const [connectSourceId, setConnectSourceId] = useState<string | null>(null);
  const [hoverTargetId, setHoverTargetId] = useState<string | null>(null);
  const [statusNote, setStatusNote] = useState<string>(
    "Drag any card, pull a green connector wire to another block, or drop new AI Agents from the left."
  );

  // Skeletal dry-run animation state
  const [traceSequence, setTraceSequence] = useState<string[]>([]);
  const [traceIndex, setTraceIndex] = useState<number>(-1);
  const [traceFinished, setTraceFinished] = useState<boolean>(false);

  const canvasInnerRef = useRef<HTMLDivElement | null>(null);
  const nodesRef = useRef<SandboxNode[]>(nodes);
  const hoverTargetRef = useRef<string | null>(null);
  nodesRef.current = nodes;

  useEffect(() => {
    setNodes(starter.nodes);
    setEdges(starter.edges);
    setTraceSequence([]);
    setTraceIndex(-1);
    setTraceFinished(false);
  }, [starter]);

  const toCanvasPoint = (clientX: number, clientY: number) => {
    const rect = canvasInnerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 100, y: 100 };
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  // Smooth drag positioning of workflow cards
  useEffect(() => {
    if (!draggingNode) return;
    const onMove = (e: MouseEvent) => {
      const pt = toCanvasPoint(e.clientX, e.clientY);
      const nextX = Math.max(
        14,
        Math.min(CANVAS_W - NODE_W - 14, Math.round((pt.x - draggingNode.offsetX) / 8) * 8)
      );
      const nextY = Math.max(
        14,
        Math.min(CANVAS_H - NODE_H - 14, Math.round((pt.y - draggingNode.offsetY) / 8) * 8)
      );
      setNodes((prev) =>
        prev.map((n) => (n.id === draggingNode.id ? { ...n, x: nextX, y: nextY } : n))
      );
    };
    const onUp = () => {
      setDraggingNode(null);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [draggingNode]);

  const createConnector = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) {
      setConnectSourceId(null);
      return;
    }
    const duplicate = edges.some(
      (ed) => ed.source === sourceId && ed.target === targetId
    );
    if (duplicate) {
      setConnectSourceId(null);
      setStatusNote("Those two blocks are already connected.");
      return;
    }
    const srcNode = nodesRef.current.find((n) => n.id === sourceId);
    const tgtNode = nodesRef.current.find((n) => n.id === targetId);
    const newEdge: SandboxEdge = {
      id: `edge-${Date.now().toString(36).slice(-5)}-${Math.random().toString(36).slice(2, 5)}`,
      source: sourceId,
      target: targetId,
      label: defaultEdgeLabel(srcNode, tgtNode),
    };
    setEdges((prev) => [...prev, newEdge]);
    setConnectSourceId(null);
    setTraceIndex(-1);
    setTraceFinished(false);
    setStatusNote(
      `Connected "${srcNode?.title || "Step"}" → "${tgtNode?.title || "Step"}". Click Preview Flow Handoff to trace it.`
    );
  };

  // Drag-to-connect Bezier wire handling
  useEffect(() => {
    if (!draftWire) return;
    const onMove = (e: MouseEvent) => {
      const pt = toCanvasPoint(e.clientX, e.clientY);
      const hit = nodesRef.current.find(
        (n) =>
          n.id !== draftWire.sourceId &&
          pt.x >= n.x - 16 &&
          pt.x <= n.x + NODE_W + 10 &&
          pt.y >= n.y - 10 &&
          pt.y <= n.y + NODE_H + 10
      );
      if (hit) {
        hoverTargetRef.current = hit.id;
        setHoverTargetId(hit.id);
        setDraftWire((prev) =>
          prev ? { ...prev, x2: hit.x, y2: hit.y + NODE_H / 2 } : null
        );
      } else {
        hoverTargetRef.current = null;
        setHoverTargetId(null);
        setDraftWire((prev) => (prev ? { ...prev, x2: pt.x, y2: pt.y } : null));
      }
    };
    const onUp = (e: MouseEvent) => {
      const targetId = hoverTargetRef.current;
      const movedPx = Math.hypot(
        e.clientX - draftWire.startClientX,
        e.clientY - draftWire.startClientY
      );
      if (targetId) {
        createConnector(draftWire.sourceId, targetId);
      } else if (movedPx < 6) {
        setConnectSourceId((prev) =>
          prev === draftWire.sourceId ? null : draftWire.sourceId
        );
        setStatusNote(
          "Wiring mode active — now click any target block (or its left circle) to finish the connection."
        );
      }
      hoverTargetRef.current = null;
      setHoverTargetId(null);
      setDraftWire(null);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftWire?.sourceId, draftWire?.startClientX, draftWire?.startClientY]);

  const addBlock = (bp: PaletteBlueprint, coords?: { x: number; y: number }) => {
    const idx = nodes.length;
    const rawX = coords ? coords.x : 40 + (idx % 4) * 230;
    const rawY = coords ? coords.y : 50 + (Math.floor(idx / 4) % 3) * 125;
    const clampedX = Math.max(14, Math.min(CANVAS_W - NODE_W - 14, Math.round(rawX / 8) * 8));
    const clampedY = Math.max(14, Math.min(CANVAS_H - NODE_H - 14, Math.round(rawY / 8) * 8));

    const created: SandboxNode = {
      id: `n-${bp.refId}-${Date.now().toString(36).slice(-4)}-${idx}`,
      kind: bp.kind,
      refId: bp.refId,
      agentId: bp.agentId,
      title: bp.title,
      subtitle: bp.subtitle,
      badgeText: bp.badgeText,
      x: clampedX,
      y: clampedY,
    };
    setNodes((prev) => [...prev, created]);
    setTraceIndex(-1);
    setTraceFinished(false);
    setStatusNote(
      `Added "${bp.title}" to the canvas. Drag from another block's green dot to connect it.`
    );
  };

  const handlePaletteDragStart = (
    e: React.DragEvent<HTMLElement>,
    bp: PaletteBlueprint
  ) => {
    e.dataTransfer.setData("application/faktry-sandbox-node", JSON.stringify(bp));
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleCanvasDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData("application/faktry-sandbox-node");
    if (!raw) return;
    try {
      const bp: PaletteBlueprint = JSON.parse(raw);
      const pt = toCanvasPoint(e.clientX, e.clientY);
      addBlock(bp, { x: pt.x - NODE_W / 2, y: pt.y - NODE_H / 2 });
    } catch {
      // ignore invalid drag payload
    }
  };

  const removeNode = (nodeId: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    setEdges((prev) =>
      prev.filter((ed) => ed.source !== nodeId && ed.target !== nodeId)
    );
    if (connectSourceId === nodeId) setConnectSourceId(null);
    setTraceIndex(-1);
    setTraceFinished(false);
  };

  const removeEdge = (edgeId: string) => {
    setEdges((prev) => prev.filter((ed) => ed.id !== edgeId));
    setTraceIndex(-1);
    setTraceFinished(false);
  };

  const handleResetStarter = () => {
    const fresh = buildStarterGraph(companyName, erpStack, agentDeployments);
    setNodes(fresh.nodes);
    setEdges(fresh.edges);
    setConnectSourceId(null);
    setTraceSequence([]);
    setTraceIndex(-1);
    setTraceFinished(false);
    setStatusNote("Restored starter orchestrated workflow for " + companyName + ".");
  };

  const handleClearCanvas = () => {
    setNodes([]);
    setEdges([]);
    setConnectSourceId(null);
    setTraceSequence([]);
    setTraceIndex(-1);
    setTraceFinished(false);
    setStatusNote("Canvas cleared — drag or click any block from the left tray to build from scratch.");
  };

  const handlePreviewSkeletalFlow = () => {
    if (nodes.length === 0) {
      setStatusNote("Add at least one block onto the canvas first.");
      return;
    }
    const incomingCount = new Map<string, number>();
    const outgoingMap = new Map<string, string[]>();
    nodes.forEach((n) => {
      incomingCount.set(n.id, 0);
      outgoingMap.set(n.id, []);
    });
    edges.forEach((ed) => {
      if (incomingCount.has(ed.target) && outgoingMap.has(ed.source)) {
        incomingCount.set(ed.target, (incomingCount.get(ed.target) || 0) + 1);
        outgoingMap.get(ed.source)!.push(ed.target);
      }
    });

    const roots = nodes
      .filter((n) => (incomingCount.get(n.id) || 0) === 0)
      .sort((a, b) => a.x - b.x)
      .map((n) => n.id);
    const seedQueue = roots.length > 0 ? roots : [nodes[0].id];

    const visited = new Set<string>();
    const ordered: string[] = [];
    const queue = [...seedQueue];
    while (queue.length > 0) {
      const curr = queue.shift()!;
      if (visited.has(curr)) continue;
      visited.add(curr);
      ordered.push(curr);
      for (const nxt of outgoingMap.get(curr) || []) {
        if (!visited.has(nxt)) queue.push(nxt);
      }
    }

    setTraceSequence(ordered);
    setTraceFinished(false);
    setTraceIndex(0);
    setStatusNote(
      `Tracing ${ordered.length} connected block${ordered.length === 1 ? "" : "s"} in skeletal preview mode...`
    );
  };

  useEffect(() => {
    if (traceIndex < 0 || traceSequence.length === 0) return;
    if (traceIndex >= traceSequence.length) {
      setTraceFinished(true);
      setStatusNote(
        `Skeletal handoff complete across ${traceSequence.length} connected steps (layout preview only — zero live ERP changes).`
      );
      return;
    }
    const timer = setTimeout(() => {
      setTraceIndex((prev) => prev + 1);
    }, 520);
    return () => clearTimeout(timer);
  }, [traceIndex, traceSequence]);

  const activeNodeId =
    traceIndex >= 0 && traceIndex < traceSequence.length
      ? traceSequence[traceIndex]
      : null;
  const completedNodeIds = useMemo(() => {
    if (traceFinished) return new Set(traceSequence);
    if (traceIndex <= 0) return new Set<string>();
    return new Set(traceSequence.slice(0, traceIndex));
  }, [traceFinished, traceIndex, traceSequence]);

  return (
    <section
      id="workflow-orchestration-sandbox"
      className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4"
    >
      {/* Beginner-friendly orchestration header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-bold text-emerald-800">
              <GitBranch className="h-3.5 w-3.5" />
              Interactive Orchestration Sandbox
            </span>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-semibold text-slate-600">
              Skeletal Preview · No Live Writes
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900">
            See How Workflow Orchestration Connects Your AI Agents
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            New to workflow orchestration? Think of it as linking individual AI specialists
            into a relay race: one reads your spreadsheets, the next checks for billing or
            schedule issues, and a manager approves before anything leaves the plant.{" "}
            <span className="font-semibold text-slate-800">
              Try dragging blocks around, dropping new agents from the tray, or wiring the
              green{" "}
              <span className="inline-block px-1 rounded bg-emerald-100 text-emerald-800">
                ● Out
              </span>{" "}
              handle to any block&apos;s left{" "}
              <span className="inline-block px-1 rounded bg-slate-100 text-slate-700">
                ● In
              </span>{" "}
              dot.
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handlePreviewSkeletalFlow}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs"
          >
            <Play className="h-3.5 w-3.5" />
            {traceIndex >= 0 && !traceFinished ? "Tracing Flow..." : "Preview Flow Handoff"}
          </button>
          <button
            type="button"
            onClick={handleResetStarter}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reset Layout
          </button>
          <button
            type="button"
            onClick={handleClearCanvas}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-slate-600 text-xs font-semibold"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear
          </button>
        </div>
      </div>

      {/* Main Split: Left Draggable Palette + Right Skeletal DAG Canvas */}
      <div className="flex flex-col lg:flex-row border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
        {/* Draggable / Clickable Tray */}
        <aside className="w-full lg:w-64 shrink-0 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 p-3.5 space-y-3.5 max-h-[440px] overflow-y-auto">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Drag or Click to Add
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              {nodes.length} blocks · {edges.length} links
            </span>
          </div>

          {PALETTE_GROUPS.map((grp) => (
            <div key={grp.heading} className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {grp.heading}
              </p>
              <div className="space-y-1.5">
                {grp.items.map((item) => (
                  <div
                    key={`${grp.heading}-${item.refId}`}
                    draggable
                    onDragStart={(e) => handlePaletteDragStart(e, item)}
                    className="group flex items-center justify-between gap-2 p-2 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-emerald-400 cursor-grab active:cursor-grabbing transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {item.kind === "agent" ? (
                        <SwarmBotAvatar
                          agentId={item.agentId || item.refId}
                          mood="happy"
                          size="xs"
                        />
                      ) : (
                        <span
                          className={`h-6 w-6 rounded-md flex items-center justify-center shrink-0 text-[10px] font-bold ${KIND_STYLES[item.kind].iconBg}`}
                        >
                          {item.kind === "input"
                            ? "IN"
                            : item.kind === "gate"
                              ? "OK"
                              : "OUT"}
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">
                          {item.title}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate">
                          {item.subtitle}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => addBlock(item)}
                      title={`Add ${item.title} to canvas`}
                      aria-label={`Add ${item.title}`}
                      className="p-1 rounded border border-slate-200 bg-white text-slate-500 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 shrink-0"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </aside>

        {/* Interactive Drag-and-Wire Canvas */}
        <div
          className="flex-1 min-w-0 overflow-x-auto bg-[#f8fafc] select-none"
          style={{
            backgroundImage: "radial-gradient(#cbd5e1 1px, transparent 1px)",
            backgroundSize: "18px 18px",
          }}
        >
          <div
            ref={canvasInnerRef}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "copy";
            }}
            onDrop={handleCanvasDrop}
            onClick={() => setConnectSourceId(null)}
            style={{ width: `${CANVAS_W}px`, height: `${CANVAS_H}px` }}
            className="relative"
          >
            {/* SVG Connector Layer */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
            >
              <defs>
                <marker
                  id="sandbox-arrow-slate"
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
                  id="sandbox-arrow-emerald"
                  viewBox="0 0 10 10"
                  refX="9"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#059669" />
                </marker>
              </defs>

              {edges.map((edge) => {
                const src = nodes.find((n) => n.id === edge.source);
                const tgt = nodes.find((n) => n.id === edge.target);
                if (!src || !tgt) return null;

                const x1 = src.x + NODE_W;
                const y1 = src.y + NODE_H / 2;
                const x2 = tgt.x;
                const y2 = tgt.y + NODE_H / 2;
                const dx = Math.max(48, Math.abs(x2 - x1) * 0.45);
                const d = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

                const isFlowLit =
                  activeNodeId === edge.target ||
                  (completedNodeIds.has(edge.source) && completedNodeIds.has(edge.target));

                return (
                  <path
                    key={edge.id}
                    d={d}
                    fill="none"
                    stroke={isFlowLit ? "#059669" : "#64748b"}
                    strokeWidth={isFlowLit ? 2.6 : 1.8}
                    markerEnd={
                      isFlowLit
                        ? "url(#sandbox-arrow-emerald)"
                        : "url(#sandbox-arrow-slate)"
                    }
                  />
                );
              })}

              {draftWire && (
                <g>
                  <path
                    d={`M ${draftWire.x1} ${draftWire.y1} C ${draftWire.x1 + Math.max(45, Math.abs(draftWire.x2 - draftWire.x1) * 0.45)} ${draftWire.y1}, ${draftWire.x2 - Math.max(45, Math.abs(draftWire.x2 - draftWire.x1) * 0.45)} ${draftWire.y2}, ${draftWire.x2} ${draftWire.y2}`}
                    fill="none"
                    stroke="#059669"
                    strokeWidth={2.4}
                    strokeDasharray="6 4"
                    markerEnd="url(#sandbox-arrow-emerald)"
                  />
                  <circle cx={draftWire.x2} cy={draftWire.y2} r={4.5} fill="#059669" />
                </g>
              )}
            </svg>

            {/* Removable Connector Midpoint Pills */}
            {edges.map((edge) => {
              const src = nodes.find((n) => n.id === edge.source);
              const tgt = nodes.find((n) => n.id === edge.target);
              if (!src || !tgt) return null;
              const midX = (src.x + NODE_W + tgt.x) / 2;
              const midY = (src.y + tgt.y) / 2 + NODE_H / 2;
              return (
                <button
                  key={`pill-${edge.id}`}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeEdge(edge.id);
                  }}
                  title="Click to remove this connector"
                  style={{
                    left: `${midX}px`,
                    top: `${midY}px`,
                    transform: "translate(-50%, -50%)",
                  }}
                  className="group/edge absolute z-10 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-slate-300 hover:border-rose-400 hover:bg-rose-50 text-[10px] font-semibold text-slate-600 hover:text-rose-700 shadow-2xs whitespace-nowrap"
                >
                  <span>{edge.label}</span>
                  <X className="h-2.5 w-2.5 opacity-60 group-hover/edge:opacity-100" />
                </button>
              );
            })}

            {/* Empty State Prompt */}
            {nodes.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-white/95 border border-dashed border-slate-300 rounded-xl px-5 py-4 text-center space-y-1.5 shadow-2xs">
                  <Sparkles className="h-5 w-5 text-emerald-600 mx-auto" />
                  <p className="text-xs font-bold text-slate-800">
                    Drop a block here or click + on the left tray
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Or click Reset Layout to restore the starter workflow
                  </p>
                </div>
              </div>
            )}

            {/* Draggable Canvas Nodes */}
            {nodes.map((node) => {
              const visuals = KIND_STYLES[node.kind];
              const isWiringSrc =
                connectSourceId === node.id || draftWire?.sourceId === node.id;
              const isDropTarget = hoverTargetId === node.id;
              const isLitActive = activeNodeId === node.id;
              const isLitDone = completedNodeIds.has(node.id);

              return (
                <div
                  key={node.id}
                  style={{
                    left: `${node.x}px`,
                    top: `${node.y}px`,
                    width: `${NODE_W}px`,
                    height: `${NODE_H}px`,
                  }}
                  onMouseDown={(e) => {
                    if ((e.target as HTMLElement).closest("button")) return;
                    e.stopPropagation();
                    if (connectSourceId && connectSourceId !== node.id) {
                      createConnector(connectSourceId, node.id);
                      return;
                    }
                    const pt = toCanvasPoint(e.clientX, e.clientY);
                    setDraggingNode({
                      id: node.id,
                      offsetX: pt.x - node.x,
                      offsetY: pt.y - node.y,
                    });
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (connectSourceId && connectSourceId !== node.id) {
                      createConnector(connectSourceId, node.id);
                    }
                  }}
                  className={`absolute z-20 rounded-xl border-2 px-2.5 py-2 shadow-xs cursor-move flex flex-col justify-between transition-shadow ${visuals.card} ${
                    isDropTarget
                      ? "ring-2 ring-emerald-400 border-emerald-600 shadow-md"
                      : isLitActive
                        ? "ring-2 ring-blue-400 border-blue-600 shadow-md"
                        : isLitDone
                          ? "border-emerald-500 shadow-sm"
                          : isWiringSrc
                            ? "ring-2 ring-emerald-300 border-emerald-600"
                            : ""
                  }`}
                >
                  {/* Left Input Port */}
                  <button
                    type="button"
                    aria-label={`Input port for ${node.title}`}
                    title="Drop connector wire here"
                    onMouseUp={(e) => {
                      if (draftWire && draftWire.sourceId !== node.id) {
                        e.stopPropagation();
                        createConnector(draftWire.sourceId, node.id);
                        hoverTargetRef.current = null;
                        setHoverTargetId(null);
                        setDraftWire(null);
                      }
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (connectSourceId && connectSourceId !== node.id) {
                        createConnector(connectSourceId, node.id);
                      }
                    }}
                    className={`absolute -left-2.5 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full border-2 flex items-center justify-center z-30 transition-transform ${
                      isDropTarget || (connectSourceId && connectSourceId !== node.id)
                        ? "bg-emerald-600 border-white text-white scale-110 ring-2 ring-emerald-300 cursor-pointer"
                        : "bg-white border-slate-300 text-slate-400 hover:border-emerald-500 hover:text-emerald-600"
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  </button>

                  {/* Right Output Port (Drag to wire!) */}
                  <button
                    type="button"
                    aria-label={`Connect from ${node.title}`}
                    title="Drag to another block to connect (or click then click target)"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setConnectSourceId(null);
                      const x1 = node.x + NODE_W;
                      const y1 = node.y + NODE_H / 2;
                      hoverTargetRef.current = null;
                      setHoverTargetId(null);
                      setDraftWire({
                        sourceId: node.id,
                        x1,
                        y1,
                        x2: x1,
                        y2: y1,
                        startClientX: e.clientX,
                        startClientY: e.clientY,
                      });
                    }}
                    className={`absolute -right-2.5 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full border-2 flex items-center justify-center z-30 cursor-crosshair transition-all ${
                      isWiringSrc
                        ? "bg-emerald-600 border-white text-white scale-110 ring-2 ring-emerald-300"
                        : "bg-white border-emerald-500 text-emerald-600 hover:bg-emerald-600 hover:text-white shadow-2xs"
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  </button>

                  <div className="flex items-start justify-between gap-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      {renderNodeIcon(node)}
                      <div className="min-w-0">
                        <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 leading-none mb-0.5 truncate">
                          {node.badgeText}
                        </span>
                        <p className="text-[11px] font-bold text-slate-900 truncate">
                          {node.title}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        title="Click-to-wire"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConnectSourceId((prev) =>
                            prev === node.id ? null : node.id
                          );
                        }}
                        className={`p-0.5 rounded border ${
                          isWiringSrc
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : "bg-white text-slate-400 border-slate-200 hover:text-emerald-600"
                        }`}
                      >
                        <Link2 className="h-2.5 w-2.5" />
                      </button>
                      <button
                        type="button"
                        title="Remove block"
                        aria-label={`Remove ${node.title}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          removeNode(node.id);
                        }}
                        className="p-0.5 rounded border border-slate-200 bg-white text-slate-400 hover:text-rose-600 hover:border-rose-300"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-1 pt-1">
                    <p className="text-[10px] text-slate-500 truncate">
                      {node.subtitle}
                    </p>
                    {isLitActive ? (
                      <span className="text-[9px] font-bold text-blue-700 shrink-0">
                        Active
                      </span>
                    ) : isLitDone ? (
                      <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Live Skeletal Trace Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
          <span className="truncate">{statusNote}</span>
        </div>
        <span className="text-[11px] font-medium text-slate-500 shrink-0">
          Skeletal UI Demo · Drag blocks &amp; wires freely
        </span>
      </div>
    </section>
  );
}
