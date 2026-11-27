"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api/client";
import { SwarmBotAvatar, getCompanionMeta } from "@/components/agents/SwarmBotAvatar";
import {
  AppConnector,
  SwarmRun,
  SwarmRunStep,
  SwarmWorkflow,
  WorkflowEdge,
  WorkflowEdgeCondition,
  WorkflowEdgeTrace,
  WorkflowNode,
  WorkflowNodeKind,
} from "@/types";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  downloadExportedArtifact,
  EDGE_CONDITIONS,
  getNodeVisuals,
  inferAgentAvatarId,
  NODE_HEIGHT,
  NODE_WIDTH,
  SAMPLE_LEAK_CSV,
} from "./workflowVisuals";
import { WorkflowPreviewModal } from "./WorkflowPreviewModal";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  DollarSign,
  Download,
  Eye,
  GitBranch,
  Info,
  LayoutGrid,
  Link2,
  Maximize2,
  Minimize2,
  Play,
  Plug,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  ZoomIn,
  ZoomOut,
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

export function SwarmBuilderView({
  onNavigateTab,
  mode = "hub",
  initialWorkflowId = null,
}: {
  onNavigateTab?: (tab: string) => void;
  mode?: "hub" | "create";
  initialWorkflowId?: string | null;
}) {
  const [workflows, setWorkflows] = useState<SwarmWorkflow[]>([]);
  const [connectors, setConnectors] = useState<AppConnector[]>([]);
  const [activeWorkflowId, setActiveWorkflowId] = useState<string | null>(null);
  const [wfName, setWfName] = useState("");
  const [wfDesc, setWfDesc] = useState("");
  const [wfCategory, setWfCategory] = useState("cost_savings");
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [edges, setEdges] = useState<WorkflowEdge[]>([]);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [connectSourceId, setConnectSourceId] = useState<string | null>(null);
  const [hoverTargetNodeId, setHoverTargetNodeId] = useState<string | null>(null);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showInspector, setShowInspector] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [canvasZoom, setCanvasZoom] = useState<number>(0.75);
  const [paletteFilter, setPaletteFilter] = useState<
    "all" | "connectors" | "agents" | "gates_outputs"
  >("all");
  const [expandedArtifactIdx, setExpandedArtifactIdx] = useState<number | null>(0);
  const [copiedArtifactIdx, setCopiedArtifactIdx] = useState<number | null>(null);

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

  // Node & wire drag tracking on the canvas
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const nodesRef = useRef<WorkflowNode[]>([]);
  nodesRef.current = nodes;
  const zoomRef = useRef<number>(canvasZoom);
  zoomRef.current = canvasZoom;
  const hoverTargetRef = useRef<string | null>(null);

  const clientToCanvasCoords = (clientX: number, clientY: number) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const z = zoomRef.current || 1;
    return {
      x: (clientX - rect.left + canvasRef.current.scrollLeft) / z,
      y: (clientY - rect.top + canvasRef.current.scrollTop) / z,
    };
  };

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
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setShowInspector(false);
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
      const [data, connData] = await Promise.all([
        api.listWorkflows(),
        api.listConnectors().catch(() => [] as AppConnector[]),
      ]);
      setWorkflows(data);
      setConnectors(connData);
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
    if (mode === "create") {
      setLoading(true);
      handleCreateBlankWorkflow();
      api
        .listConnectors()
        .then((connData) => setConnectors(connData))
        .catch(() => setConnectors([]))
        .finally(() => setLoading(false));
      return;
    }
    loadWorkflows(initialWorkflowId || undefined);
  }, [mode, initialWorkflowId]);

  // Mouse dragging for nodes inside canvas (zoom-aware)
  useEffect(() => {
    if (!draggingNode) return;
    const handleMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current) return;
      const pt = clientToCanvasCoords(e.clientX, e.clientY);
      const rawX = pt.x - draggingNode.offsetX;
      const rawY = pt.y - draggingNode.offsetY;
      const snappedX = Math.max(
        24,
        Math.min(CANVAS_WIDTH - NODE_WIDTH - 24, Math.round(rawX / 10) * 10),
      );
      const snappedY = Math.max(
        24,
        Math.min(CANVAS_HEIGHT - NODE_HEIGHT - 24, Math.round(rawY / 10) * 10),
      );
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

  const handleAutoTidyLayout = () => {
    if (nodes.length === 0) return;
    const depth = new Map<string, number>();
    nodes.forEach((n) => depth.set(n.id, 0));

    for (let iter = 0; iter < nodes.length; iter++) {
      let changed = false;
      for (const e of edges) {
        const dSrc = depth.get(e.source) ?? 0;
        const dTgt = depth.get(e.target) ?? 0;
        if (dSrc + 1 > dTgt) {
          depth.set(e.target, dSrc + 1);
          changed = true;
        }
      }
      if (!changed) break;
    }

    const columns = new Map<number, WorkflowNode[]>();
    for (const n of nodes) {
      const col = depth.get(n.id) ?? 0;
      const list = columns.get(col) || [];
      list.push(n);
      columns.set(col, list);
    }

    const posMap = new Map<string, { x: number; y: number }>();
    columns.forEach((colNodes, colIdx) => {
      const colSpan = Math.max(1, colNodes.length);
      const totalH = (colSpan - 1) * 150;
      const startY = Math.max(60, Math.round((300 - totalH / 2) / 10) * 10);
      colNodes.forEach((node, rowIdx) => {
        posMap.set(node.id, {
          x: Math.min(CANVAS_WIDTH - NODE_WIDTH - 40, 60 + colIdx * 360),
          y: Math.min(CANVAS_HEIGHT - NODE_HEIGHT - 40, startY + rowIdx * 150),
        });
      });
    });

    setNodes((prev) =>
      prev.map((n) => {
        const p = posMap.get(n.id);
        return p ? { ...n, x: p.x, y: p.y } : n;
      }),
    );
    setStatusBanner({
      tone: "info",
      text: "Auto-arranged blocks left-to-right across the canvas.",
    });
  };

  const createEdgeBetween = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) {
      setConnectSourceId(null);
      return;
    }
    const alreadyExists = edges.some(
      (ed) => ed.source === sourceId && ed.target === targetId,
    );
    if (alreadyExists) {
      setConnectSourceId(null);
      setStatusBanner({ tone: "info", text: "Connection already exists between those two blocks." });
      return;
    }
    const newEdge: WorkflowEdge = {
      id: `e-${Date.now().toString(36).slice(-5)}`,
      source: sourceId,
      target: targetId,
      condition: "always",
      label: "Always Forward",
    };
    setEdges((prev) => [...prev, newEdge]);
    setSelectedEdgeId(newEdge.id);
    setSelectedNodeId(null);
    setConnectSourceId(null);
    setStatusBanner({
      tone: "success",
      text: "Blocks wired! Configure conditional data routing on the right or click Run Flow Now.",
    });
  };

  // Drag-to-connect Bezier wire mouse tracking (zoom-aware)
  useEffect(() => {
    if (!draftWire) return;
    const handleMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current) return;
      const { x: canvasX, y: canvasY } = clientToCanvasCoords(e.clientX, e.clientY);

      const candidate = nodesRef.current.find(
        (n) =>
          n.id !== draftWire.sourceId &&
          canvasX >= n.x - 18 &&
          canvasX <= n.x + NODE_WIDTH + 10 &&
          canvasY >= n.y - 10 &&
          canvasY <= n.y + NODE_HEIGHT + 10,
      );

      if (candidate) {
        hoverTargetRef.current = candidate.id;
        setHoverTargetNodeId(candidate.id);
        setDraftWire((prev) =>
          prev
            ? { ...prev, x2: candidate.x, y2: candidate.y + NODE_HEIGHT / 2 }
            : null,
        );
      } else {
        hoverTargetRef.current = null;
        setHoverTargetNodeId(null);
        setDraftWire((prev) =>
          prev ? { ...prev, x2: canvasX, y2: canvasY } : null,
        );
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      const targetId = hoverTargetRef.current;
      const dist = Math.hypot(
        e.clientX - draftWire.startClientX,
        e.clientY - draftWire.startClientY,
      );

      if (targetId) {
        createEdgeBetween(draftWire.sourceId, targetId);
      } else if (dist < 6) {
        setConnectSourceId((prev) =>
          prev === draftWire.sourceId ? null : draftWire.sourceId,
        );
      } else {
        setStatusBanner({
          tone: "info",
          text: "Release the wire over any block or its left In dot to create a data link.",
        });
      }

      hoverTargetRef.current = null;
      setHoverTargetNodeId(null);
      setDraftWire(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [draftWire?.sourceId, draftWire?.startClientX, draftWire?.startClientY]);

  const startWireDrag = (e: React.MouseEvent, sourceNode: WorkflowNode) => {
    e.stopPropagation();
    e.preventDefault();
    setConnectSourceId(null);
    const x1 = sourceNode.x + NODE_WIDTH;
    const y1 = sourceNode.y + NODE_HEIGHT / 2;
    hoverTargetRef.current = null;
    setHoverTargetNodeId(null);
    setDraftWire({
      sourceId: sourceNode.id,
      x1,
      y1,
      x2: x1,
      y2: y1,
      startClientX: e.clientX,
      startClientY: e.clientY,
    });
  };

  const connectorToPaletteItem = (
    conn: AppConnector,
    directionMode?: "input" | "output",
  ): PaletteItem => {
    const resolvedKind: WorkflowNodeKind =
      directionMode === "input"
        ? "connector_input"
        : directionMode === "output"
          ? "connector_output"
          : conn.sync_direction === "export" ||
              conn.connector_type === "google_docs" ||
              conn.connector_type === "slack_webhook"
            ? "connector_output"
            : "connector_input";
    return {
      kind: resolvedKind,
      ref_id: conn.connector_type,
      label: conn.name,
      subtitle:
        resolvedKind === "connector_input"
          ? "Pull live records from app"
          : "Export reports to app",
      group: resolvedKind === "connector_input" ? "Inputs" : "Outputs",
      defaultConfig: {
        connector_id: conn.id,
        connector_type: conn.connector_type,
        record_type: "all",
        ...(conn.resource_id ? { resource_id: conn.resource_id } : {}),
      },
    };
  };

  const addNodeFromPalette = (
    item: PaletteItem,
    coords?: { x: number; y: number },
  ) => {
    const idx = nodes.length;
    const x =
      coords?.x ??
      Math.min(880, 40 + (idx % 3) * 370);
    const y =
      coords?.y ??
      Math.min(380, 60 + Math.floor(idx / 3) * 140);

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
      text: `Added "${item.label}" to canvas. Drag its right Out dot to connect it into your flow.`,
    });
  };

  const handlePaletteDragStart = (
    e: React.DragEvent<HTMLElement>,
    item: PaletteItem,
  ) => {
    e.dataTransfer.setData("application/faktry-node", JSON.stringify(item));
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleCanvasDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData("application/faktry-node");
    if (!raw || !canvasRef.current) return;
    try {
      const item: PaletteItem = JSON.parse(raw);
      const pt = clientToCanvasCoords(e.clientX, e.clientY);
      const x = Math.max(
        24,
        Math.min(CANVAS_WIDTH - NODE_WIDTH - 24, pt.x - NODE_WIDTH / 2),
      );
      const y = Math.max(
        24,
        Math.min(CANVAS_HEIGHT - NODE_HEIGHT - 24, pt.y - NODE_HEIGHT / 2),
      );
      addNodeFromPalette(item, { x, y });
    } catch {
      // ignore invalid drag data
    }
  };

  const completeEdgeConnection = (targetId: string) => {
    if (!connectSourceId) return;
    createEdgeBetween(connectSourceId, targetId);
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
        x: 40,
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
        x: 410,
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
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setShowInspector(false);
    setLatestRun(null);
    setRunHistory([]);
    setStatusBanner({
      tone: "info",
      text: "Started a fresh custom workflow. Drag blocks from the left panel, wire their Out -> In dots, then Save or Run Flow Now.",
    });
  };

  const applyStarterBlueprint = (blueprint: "invoice_gate" | "receiving_qc") => {
    setActiveWorkflowId(null);
    setSelectedEdgeId(null);
    setLatestRun(null);
    setRunHistory([]);
    if (blueprint === "invoice_gate") {
      setWfName("Supplier Invoice Leak & Approval Swarm");
      setWfDesc("Audits imported POs & invoices, holds impacts >= $500 for manager sign-off, and writes briefs to Google Docs.");
      setWfCategory("cost_savings");
      setNodes([
        {
          id: "n-bp-in",
          kind: "connector_input",
          ref_id: "google_sheets",
          label: "Google Sheets Input",
          subtitle: "PO & invoice sheet",
          x: 50,
          y: 220,
          config: { connector_type: "google_sheets", record_type: "all" },
        },
        {
          id: "n-bp-cs",
          kind: "agent",
          ref_id: "cost_sentry",
          agent_id: "cost_sentry",
          label: "CostSentry (CS-02)",
          subtitle: "3-way PO & invoice check",
          x: 410,
          y: 220,
          config: { check_duplicates: true },
        },
        {
          id: "n-bp-gate",
          kind: "approval_gate",
          ref_id: "approval_gate",
          label: "Manager Sign-Off Gate",
          subtitle: "Hold impact >= $500",
          x: 770,
          y: 130,
          config: { threshold_usd: 500 },
        },
        {
          id: "n-bp-doc",
          kind: "connector_output",
          ref_id: "google_docs",
          label: "Google Docs Brief",
          subtitle: "Publish executive brief",
          x: 1130,
          y: 130,
          config: { connector_type: "google_docs" },
        },
        {
          id: "n-bp-slack",
          kind: "connector_output",
          ref_id: "slack_webhook",
          label: "Slack Ops Alert",
          subtitle: "Auto-cleared notices",
          x: 770,
          y: 320,
          config: { connector_type: "slack_webhook" },
        },
      ]);
      setEdges([
        { id: "e-bp-1", source: "n-bp-in", target: "n-bp-cs", condition: "always", label: "Incoming Rows" },
        { id: "e-bp-2", source: "n-bp-cs", target: "n-bp-gate", condition: "if_variance_gt_500", label: "If Impact >= $500 (Hold)" },
        { id: "e-bp-3", source: "n-bp-gate", target: "n-bp-doc", condition: "always", label: "Escalated Brief" },
        { id: "e-bp-4", source: "n-bp-cs", target: "n-bp-slack", condition: "auto_settle_below_500", label: "If Impact < $500 (Auto-Clear)" },
      ]);
      setSelectedNodeId("n-bp-in");
    } else {
      setWfName("Receiving Weight & Quality NCR Swarm");
      setWfDesc("Checks plant receiving weights with BOMGuard, triggers QualityShield NCR review, and exports savings CSV.");
      setWfCategory("quality");
      setNodes([
        {
          id: "n-rq-in",
          kind: "connector_input",
          ref_id: "erp_database",
          label: "Manufacturing ERP",
          subtitle: "Receiving & work orders",
          x: 50,
          y: 220,
          config: { connector_type: "erp_database", record_type: "all" },
        },
        {
          id: "n-rq-bg",
          kind: "agent",
          ref_id: "bom_guard",
          agent_id: "bom_guard",
          label: "BOMGuard (BG-01)",
          subtitle: "Weight & yield check",
          x: 410,
          y: 220,
          config: { tolerance_pct: 0.5 },
        },
        {
          id: "n-rq-qs",
          kind: "agent",
          ref_id: "quality_shield",
          agent_id: "quality_shield",
          label: "QualityShield (QS-04)",
          subtitle: "Draft NCR dispute",
          x: 770,
          y: 220,
          config: { draft_ncr_notice: true },
        },
        {
          id: "n-rq-sheet",
          kind: "connector_output",
          ref_id: "google_sheets",
          label: "Google Sheets Export",
          subtitle: "Push verified rows",
          x: 1130,
          y: 220,
          config: { connector_type: "google_sheets" },
        },
      ]);
      setEdges([
        { id: "e-rq-1", source: "n-rq-in", target: "n-rq-bg", condition: "always", label: "Receiving Stream" },
        { id: "e-rq-2", source: "n-rq-bg", target: "n-rq-qs", condition: "if_discrepancy_found", label: "If Cost/Qty Leak Found" },
        { id: "e-rq-3", source: "n-rq-qs", target: "n-rq-sheet", condition: "always", label: "Sync Verified Output" },
      ]);
      setSelectedNodeId("n-rq-in");
    }
    setStatusBanner({
      tone: "info",
      text: "Loaded starter blueprint. Customize blocks, wires, or test CSV rows and click Save or Run Flow Now.",
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
      setExpandedArtifactIdx(0);
      setRunHistory((prev) => [runResult, ...prev]);
      // refresh workflow list summary and app connector sync metadata
      const [updatedList, updatedConns] = await Promise.all([
        api.listWorkflows(),
        api.listConnectors().catch(() => connectors),
      ]);
      setWorkflows(updatedList);
      setConnectors(updatedConns);
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

  const runMatchesCanvas = useMemo(() => {
    if (!latestRun) return false;
    const nodeIds = new Set(nodes.map((n) => n.id));
    return latestRun.steps.some((s) => nodeIds.has(s.node_id));
  }, [latestRun, nodes]);

  const edgeTraceById = useMemo(() => {
    const map = new Map<string, WorkflowEdgeTrace>();
    if (!latestRun || !runMatchesCanvas) return map;
    for (const tr of latestRun.sdk_metadata?.edge_traces || []) {
      map.set(tr.edge_id, tr);
    }
    return map;
  }, [latestRun, runMatchesCanvas]);

  const stepByNodeId = useMemo(() => {
    const map = new Map<string, SwarmRunStep>();
    if (!latestRun || !runMatchesCanvas) return map;
    for (const st of latestRun.steps || []) {
      map.set(st.node_id, st);
    }
    return map;
  }, [latestRun, runMatchesCanvas]);

  const handleCopyArtifact = async (idx: number, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedArtifactIdx(idx);
      setTimeout(() => setCopiedArtifactIdx((cur) => (cur === idx ? null : cur)), 2000);
    } catch {
      // clipboard unavailable
    }
  };

  return (
    <div className="space-y-3.5 animate-in fade-in duration-300">
      {/* Slim Calm Studio Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 px-4 py-3 shadow-2xs space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 min-w-0 flex-1">
            <div className="h-8 w-8 rounded-lg bg-slate-950 text-emerald-400 flex items-center justify-center shrink-0">
              <GitBranch className="h-4 w-4" />
            </div>

            <input
              type="text"
              value={wfName}
              onChange={(e) => setWfName(e.target.value)}
              placeholder="Workflow Name..."
              aria-label="Workflow Name"
              className="min-w-[200px] sm:min-w-[260px] max-w-sm font-display font-semibold text-sm sm:text-base text-slate-950 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-600 focus:outline-none px-1 py-0.5"
            />

            {mode === "hub" && (
              <div className="flex items-center gap-1.5">
                <select
                  aria-label="Switch Saved Flow"
                  value={activeWorkflowId || ""}
                  onChange={(e) => {
                    const target = workflows.find((w) => w.id === e.target.value);
                    if (target) selectWorkflow(target);
                  }}
                  disabled={loading}
                  className="max-w-[240px] px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 focus:outline-none focus:border-emerald-600"
                >
                  {loading ? (
                    <option value="">Loading flows...</option>
                  ) : (
                    workflows.map((wf) => (
                      <option key={wf.id} value={wf.id}>
                        {wf.is_template ? `★ ${wf.name}` : wf.name}
                      </option>
                    ))
                  )}
                </select>

                {activeWorkflow && !activeWorkflow.is_template && (
                  confirmDeleteId === activeWorkflow.id ? (
                    <div className="flex items-center gap-1 text-xs">
                      <button
                        type="button"
                        onClick={() => handleDeleteWorkflow(activeWorkflow.id)}
                        className="px-2 py-1 rounded bg-rose-600 text-white font-semibold hover:bg-rose-700"
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
                      title="Delete custom workflow"
                      aria-label="Delete Flow"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )
                )}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setShowHowItWorks((v) => !v)}
              title="Toggle 3-step workflow guide"
              className={`px-2.5 py-1.5 text-xs font-medium rounded-full border flex items-center gap-1 transition-colors ${
                showHowItWorks
                  ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                  : "border-slate-200 text-slate-600 bg-white hover:bg-slate-50"
              }`}
            >
              <Info className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Guide</span>
            </button>

            <button
              type="button"
              onClick={() => setIsPreviewOpen(true)}
              disabled={nodes.length === 0}
              className="px-3 py-1.5 text-xs font-semibold rounded-full border border-slate-200 text-slate-700 bg-white hover:border-emerald-300 hover:bg-emerald-50/40 disabled:opacity-50 flex items-center gap-1.5"
            >
              <Eye className="h-3.5 w-3.5 text-emerald-600" />
              Preview Popup
            </button>

            {mode === "hub" ? (
              <Link
                href="/workflows/new"
                className="px-3 py-1.5 text-xs font-semibold rounded-full border border-emerald-300 text-emerald-800 bg-emerald-50/60 hover:bg-emerald-100 flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                New Workflow Page
              </Link>
            ) : (
              <button
                type="button"
                onClick={handleCreateBlankWorkflow}
                className="px-3 py-1.5 text-xs font-semibold rounded-full border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Reset
              </button>
            )}

            <button
              type="button"
              onClick={persistCurrentWorkflow}
              disabled={saving}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-full border border-slate-200 text-slate-800 bg-white hover:border-emerald-300 disabled:opacity-50 flex items-center gap-1.5"
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
              className="px-3.5 py-1.5 text-xs font-semibold rounded-full bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 flex items-center gap-1.5 shadow-xs transition-colors"
            >
              {running ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
              {running ? "Running..." : "Run Flow Now"}
            </button>
          </div>
        </div>

        {mode === "create" && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-400 mr-1">
                Starter Blueprints:
              </span>
              <button
                type="button"
                onClick={handleCreateBlankWorkflow}
                className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 hover:bg-slate-200"
              >
                2-Step Quick Start
              </button>
              <button
                type="button"
                onClick={() => applyStarterBlueprint("invoice_gate")}
                className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
              >
                Invoice Audit + Approval Gate
              </button>
              <button
                type="button"
                onClick={() => applyStarterBlueprint("receiving_qc")}
                className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 hover:bg-slate-200"
              >
                Receiving &amp; Quality NCR
              </button>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={wfDesc}
                onChange={(e) => setWfDesc(e.target.value)}
                placeholder="Optional workflow summary..."
                aria-label="Workflow Description"
                className="hidden lg:block w-64 text-xs text-slate-500 bg-transparent border-b border-slate-200 focus:border-emerald-500 focus:outline-none px-1 py-0.5"
              />
              {activeWorkflowId && (
                <Link
                  href={`/?workflow=${activeWorkflowId}#builder`}
                  className="text-xs font-semibold text-emerald-700 hover:underline flex items-center gap-1"
                >
                  Saved! Open in Saved Flows &rarr;
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Inline Feedback Banner */}
      {statusBanner && (
        <div
          className={`px-4 py-2 rounded-xl border text-xs font-medium flex items-center justify-between gap-3 ${
            statusBanner.tone === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : statusBanner.tone === "error"
                ? "bg-rose-50 border-rose-200 text-rose-800"
                : "bg-slate-100 border-slate-200 text-slate-700"
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

      {/* Collapsible Flow Guide Drawer */}
      {showHowItWorks && (
        <div className="bg-white rounded-2xl border border-emerald-200 px-4 py-3 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <p className="text-xs font-bold text-slate-900">
                How Data Flows Through Your Swarm
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowHowItWorks(false)}
              className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1"
            >
              Hide
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            <div className="rounded-xl bg-emerald-50/60 border border-emerald-200/80 px-3 py-2">
              <p className="text-[11px] font-bold text-emerald-900">
                1. Drop Blocks from Left Panel
              </p>
              <p className="text-[11px] text-emerald-800/90 mt-0.5 leading-snug">
                Drag a saved Google Sheet, ERP, Agent, or Output onto the canvas. Click any block on the canvas to configure live inputs or paste test CSV rows.
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2">
              <p className="text-[11px] font-bold text-slate-900">
                2. Drag Right Dot (Out) &rarr; Left Dot (In)
              </p>
              <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                Grab any block&apos;s green right port dot and drop it onto the next block&apos;s left dot. Click wire pills to add rules like <span className="font-semibold">Impact &ge; $500</span>.
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2">
              <p className="text-[11px] font-bold text-slate-900">
                3. Run Flow Now &amp; Export Live
              </p>
              <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                Records move downstream along <span className="font-semibold text-emerald-700">green active wires</span>, trigger Agents &amp; Approval Gates, and export reports to Connected Apps.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Calm 2-Column Studio Workspace: LEFT Palette + SPACIOUS Zoomed-Out Canvas (+ Contextual Inspector Drawer) */}
      <div className="flex flex-col lg:flex-row gap-3.5 items-stretch">
        {/* LEFT SIDE: Clean Vertical Blocks & Connectors Panel */}
        <aside className="w-full lg:w-[232px] shrink-0 bg-white rounded-2xl border border-slate-200 p-3 shadow-2xs flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                Blocks &amp; Connectors
              </h3>
              {onNavigateTab && (
                <button
                  type="button"
                  onClick={() => onNavigateTab("connectors")}
                  className="text-[10px] font-semibold text-emerald-700 hover:underline shrink-0"
                >
                  Apps &rarr;
                </button>
              )}
            </div>

            <div className="flex items-center gap-1">
              {[
                { id: "all", label: "All" },
                { id: "connectors", label: "Apps" },
                { id: "agents", label: "Agents" },
                { id: "gates_outputs", label: "Outputs" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() =>
                    setPaletteFilter(
                      tab.id as "all" | "connectors" | "agents" | "gates_outputs",
                    )
                  }
                  className={`flex-1 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
                    paletteFilter === tab.id
                      ? "bg-slate-950 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="space-y-3 max-h-[550px] overflow-y-auto pr-0.5">
              {(paletteFilter === "all" || paletteFilter === "connectors") &&
                connectors.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 px-1">
                      Connected Apps ({connectors.length})
                    </p>
                    {connectors.map((conn) => {
                      const defaultItem = connectorToPaletteItem(conn);
                      const canImport = conn.sync_direction !== "export";
                      const canExport = conn.sync_direction !== "import";
                      return (
                        <div
                          key={`left-conn-${conn.id}`}
                          draggable
                          onDragStart={(e) => handlePaletteDragStart(e, defaultItem)}
                          title={`${conn.name} (${conn.connector_type.replace(/_/g, " ")}) — drag onto canvas`}
                          className="group flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-xl border border-emerald-200/70 bg-emerald-50/35 hover:bg-white hover:border-emerald-400 cursor-grab active:cursor-grabbing transition-all"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Plug className="h-3 w-3 text-emerald-600 shrink-0" />
                            <span className="text-[11px] font-medium text-slate-800 truncate">
                              {conn.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0">
                            {canImport && (
                              <button
                                type="button"
                                onClick={() =>
                                  addNodeFromPalette(connectorToPaletteItem(conn, "input"))
                                }
                                title="Add as Input source"
                                className="px-1 py-0.5 rounded text-[9px] font-bold text-emerald-800 bg-white border border-emerald-200 hover:bg-emerald-600 hover:text-white"
                              >
                                +In
                              </button>
                            )}
                            {canExport && (
                              <button
                                type="button"
                                onClick={() =>
                                  addNodeFromPalette(connectorToPaletteItem(conn, "output"))
                                }
                                title="Add as Output destination"
                                className="px-1 py-0.5 rounded text-[9px] font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-900 hover:text-white"
                              >
                                +Out
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

              {(paletteFilter === "all" || paletteFilter === "agents") && (
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
                    Swarm Agents
                  </p>
                  {PALETTE_ITEMS.filter((p) => p.group === "Swarm Agents").map((item) => (
                    <div
                      key={`left-${item.ref_id}`}
                      draggable
                      onDragStart={(e) => handlePaletteDragStart(e, item)}
                      title={`${getCompanionMeta(item.ref_id).nickname} — ${item.subtitle}`}
                      className="group flex items-center justify-between gap-2 px-2 py-1.5 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-emerald-300 cursor-grab active:cursor-grabbing transition-all"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <SwarmBotAvatar agentId={item.ref_id} mood="happy" size="xs" />
                        <span className="text-[11px] font-semibold text-slate-800 truncate">
                          {item.label}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => addNodeFromPalette(item)}
                        title={`Add ${item.label}`}
                        className="p-0.5 rounded bg-white border border-slate-200 text-slate-500 hover:bg-slate-900 hover:text-white shrink-0"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {(paletteFilter === "all" || paletteFilter === "gates_outputs") && (
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
                    Inputs, Gates &amp; Outputs
                  </p>
                  {PALETTE_ITEMS.filter((p) => p.group !== "Swarm Agents").map((item) => (
                    <div
                      key={`left-${item.kind}-${item.ref_id}`}
                      draggable
                      onDragStart={(e) => handlePaletteDragStart(e, item)}
                      title={item.subtitle}
                      className="group flex items-center justify-between gap-2 px-2 py-1.5 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-emerald-300 cursor-grab active:cursor-grabbing transition-all"
                    >
                      <span className="text-[11px] font-medium text-slate-700 truncate">
                        {item.label}
                      </span>
                      <button
                        type="button"
                        onClick={() => addNodeFromPalette(item)}
                        title={`Add ${item.label}`}
                        className="p-0.5 rounded bg-white border border-slate-200 text-slate-500 hover:bg-slate-900 hover:text-white shrink-0"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <p className="text-[10px] text-slate-400 pt-2 mt-2 border-t border-slate-100 leading-snug">
            Tip: Drag blocks right onto the canvas, then drag right dot &rarr; left dot to wire.
          </p>
        </aside>

        {/* RIGHT / MAIN: Spacious Zoomed-Out Orchestration Canvas (+ Contextual Inspector Drawer) */}
        <div className="flex-1 min-w-0 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
          <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-slate-600">
              <span className="font-semibold text-slate-900">Orchestration Canvas</span>
              <span className="text-slate-400">·</span>
              <span className="tabular-nums text-[11px]">{nodes.length} blocks, {edges.length} links</span>
              {connectSourceId || draftWire ? (
                <div className="ml-2 flex items-center gap-2 bg-emerald-600 text-white px-2.5 py-0.5 rounded-full text-[11px] font-medium">
                  <span>
                    {draftWire
                      ? "Drop wire onto target block's left dot..."
                      : "Click any target block or left In dot to wire..."}
                  </span>
                  {connectSourceId && (
                    <button
                      type="button"
                      onClick={() => setConnectSourceId(null)}
                      className="underline font-bold"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={handleAutoTidyLayout}
                title="Auto-arrange blocks neatly left-to-right"
                className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-[11px] font-semibold text-slate-700 hover:border-emerald-300 hover:text-emerald-700 flex items-center gap-1"
              >
                <LayoutGrid className="h-3 w-3" />
                Tidy
              </button>

              <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white overflow-hidden">
                <button
                  type="button"
                  onClick={() =>
                    setCanvasZoom((z) =>
                      z <= 0.65 ? 0.65 : z === 0.75 ? 0.65 : z === 0.9 ? 0.75 : 0.9,
                    )
                  }
                  title="Zoom out"
                  className="px-1.5 py-1 text-slate-600 hover:bg-slate-50 border-r border-slate-200"
                >
                  <ZoomOut className="h-3 w-3" />
                </button>
                {[0.65, 0.75, 0.9, 1].map((zVal) => (
                  <button
                    key={zVal}
                    type="button"
                    onClick={() => setCanvasZoom(zVal)}
                    className={`px-2 py-1 text-[10px] font-bold tabular-nums transition-colors ${
                      canvasZoom === zVal
                        ? "bg-slate-950 text-white"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {Math.round(zVal * 100)}%
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setCanvasZoom((z) =>
                      z >= 1 ? 1 : z === 0.65 ? 0.75 : z === 0.75 ? 0.9 : 1,
                    )
                  }
                  title="Zoom in"
                  className="px-1.5 py-1 text-slate-600 hover:bg-slate-50 border-l border-slate-200"
                >
                  <ZoomIn className="h-3 w-3" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowInspector((v) => !v)}
                className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold flex items-center gap-1 transition-colors ${
                  showInspector
                    ? "bg-slate-950 text-white border-slate-950"
                    : "bg-white text-slate-700 border-slate-200 hover:border-emerald-300"
                }`}
              >
                {showInspector ? (
                  <>
                    <Minimize2 className="h-3 w-3" />
                    Hide Settings
                  </>
                ) : (
                  <>
                    <Maximize2 className="h-3 w-3" />
                    Block Settings
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Spacious Canvas + Contextual Right Slide-In Settings */}
          <div className="relative flex h-[660px] overflow-hidden">
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
                setShowInspector(false);
              }}
              className="relative flex-1 min-w-0 h-full overflow-auto bg-[#f8fafc] select-none"
              style={{
                backgroundImage:
                  "radial-gradient(#cbd5e1 1px, transparent 1px)",
                backgroundSize: `${Math.round(20 * canvasZoom)}px ${Math.round(20 * canvasZoom)}px`,
              }}
            >
            <div
              style={{
                width: `${CANVAS_WIDTH * canvasZoom}px`,
                height: `${CANVAS_HEIGHT * canvasZoom}px`,
              }}
              className="relative"
            >
              <div
                style={{
                  width: `${CANVAS_WIDTH}px`,
                  height: `${CANVAS_HEIGHT}px`,
                  transform: `scale(${canvasZoom})`,
                  transformOrigin: "top left",
                }}
                className="relative"
              >
                {/* SVG Edge Layer */}
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
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
                    id="arrow-emerald"
                    viewBox="0 0 10 10"
                    refX="9"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#059669" />
                  </marker>
                  <marker
                    id="arrow-muted"
                    viewBox="0 0 10 10"
                    refX="9"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#cbd5e1" />
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
                  const trace = edgeTraceById.get(edge.id);
                  const isTriggered = trace?.triggered === true;
                  const isSkipped = trace?.triggered === false;

                  const stroke = isEdgeSel
                    ? "#0f172a"
                    : isTriggered
                      ? "#059669"
                      : isSkipped
                        ? "#cbd5e1"
                        : "#64748b";
                  const marker = isEdgeSel
                    ? "url(#arrow-slate)"
                    : isTriggered
                      ? "url(#arrow-emerald)"
                      : isSkipped
                        ? "url(#arrow-muted)"
                        : "url(#arrow-slate)";

                  return (
                    <g key={edge.id}>
                      <path
                        d={pathD}
                        fill="none"
                        stroke={stroke}
                        strokeWidth={isEdgeSel ? 3 : isTriggered ? 2.5 : 1.75}
                        strokeDasharray={
                          isSkipped || edge.condition !== "always" ? "6 4" : undefined
                        }
                        markerEnd={marker}
                      />
                    </g>
                  );
                })}

                {/* Live Drag-to-Connect Draft Wire */}
                {draftWire && (
                  <g>
                    <path
                      d={`M ${draftWire.x1} ${draftWire.y1} C ${draftWire.x1 + Math.max(50, Math.abs(draftWire.x2 - draftWire.x1) * 0.45)} ${draftWire.y1}, ${draftWire.x2 - Math.max(50, Math.abs(draftWire.x2 - draftWire.x1) * 0.45)} ${draftWire.y2}, ${draftWire.x2} ${draftWire.y2}`}
                      fill="none"
                      stroke="#059669"
                      strokeWidth={2.5}
                      strokeDasharray="6 4"
                      markerEnd="url(#arrow-emerald)"
                    />
                    <circle cx={draftWire.x2} cy={draftWire.y2} r={4.5} fill="#059669" />
                  </g>
                )}
              </svg>

              {/* Clickable Edge Condition Pills */}
              {edges.map((edge) => {
                const src = nodes.find((n) => n.id === edge.source);
                const tgt = nodes.find((n) => n.id === edge.target);
                if (!src || !tgt) return null;
                const midX = (src.x + NODE_WIDTH + tgt.x) / 2;
                const midY = (src.y + NODE_HEIGHT / 2 + tgt.y + NODE_HEIGHT / 2) / 2;
                const isEdgeSel = edge.id === selectedEdgeId;
                const trace = edgeTraceById.get(edge.id);

                return (
                  <button
                    key={`pill-${edge.id}`}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedEdgeId(edge.id);
                      setSelectedNodeId(null);
                      setShowInspector(true);
                    }}
                    title={trace?.summary || "Click to edit connection rule"}
                    style={{
                      left: `${midX}px`,
                      top: `${midY}px`,
                      transform: "translate(-50%, -50%)",
                    }}
                    className={`absolute z-[25] max-w-[148px] truncate px-2 py-0.5 rounded-full text-[10px] font-medium border shadow-xs transition-colors whitespace-nowrap ${
                      isEdgeSel
                        ? "bg-slate-950 text-white border-slate-950"
                        : trace?.triggered
                          ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                          : trace && !trace.triggered
                            ? "bg-slate-100 text-slate-400 border-slate-200"
                            : "bg-white text-slate-600 border-slate-300 hover:border-emerald-400"
                    }`}
                  >
                    {edge.label || edge.condition.replace(/_/g, " ")}
                    {trace ? (
                      <span className="ml-1 font-bold">
                        ({trace.triggered ? `${trace.items_passed}` : "Skip"})
                      </span>
                    ) : null}
                  </button>
                );
              })}

              {/* Node Cards */}
              {nodes.map((node) => {
                const visuals = getNodeVisuals(node);
                const Icon = visuals.icon;
                const isSelected = node.id === selectedNodeId;
                const isWiringSource =
                  node.id === connectSourceId || draftWire?.sourceId === node.id;
                const isDropWireTarget = hoverTargetNodeId === node.id;
                const nodeStep = stepByNodeId.get(node.id);
                const linkedConn = node.config?.connector_id
                  ? connectors.find((c) => c.id === node.config.connector_id)
                  : undefined;

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
                      const pt = clientToCanvasCoords(e.clientX, e.clientY);
                      setDraggingNode({
                        id: node.id,
                        offsetX: pt.x - node.x,
                        offsetY: pt.y - node.y,
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
                      setShowInspector(true);
                    }}
                    className={`group/node absolute z-20 rounded-xl border-2 px-3 py-2 shadow-sm transition-shadow cursor-move flex flex-col justify-between ${visuals.bg} ${
                      isDropWireTarget
                        ? "border-emerald-600 ring-2 ring-emerald-300 shadow-md"
                        : isSelected
                          ? "border-slate-950 ring-2 ring-emerald-200 shadow-md"
                          : isWiringSource
                            ? "border-emerald-600 ring-2 ring-emerald-100"
                            : nodeStep?.status === "skipped"
                              ? "border-slate-200 opacity-70"
                              : visuals.border
                    } ${
                      connectSourceId && connectSourceId !== node.id
                        ? "hover:ring-2 hover:ring-emerald-400 cursor-pointer"
                        : ""
                    }`}
                  >
                    {/* Left Input Port */}
                    <button
                      type="button"
                      title="Input port — drop wire here to receive upstream data"
                      aria-label={`Input port for ${node.label}`}
                      onMouseUp={(e) => {
                        if (draftWire && draftWire.sourceId !== node.id) {
                          e.stopPropagation();
                          createEdgeBetween(draftWire.sourceId, node.id);
                          hoverTargetRef.current = null;
                          setHoverTargetNodeId(null);
                          setDraftWire(null);
                        }
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (connectSourceId && connectSourceId !== node.id) {
                          completeEdgeConnection(node.id);
                        }
                      }}
                      className={`absolute -left-2.5 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full border-2 flex items-center justify-center z-30 transition-all ${
                        isDropWireTarget || (connectSourceId && connectSourceId !== node.id)
                          ? "bg-emerald-600 border-white text-white scale-125 ring-2 ring-emerald-300 shadow-sm cursor-pointer"
                          : "bg-white border-slate-300 text-slate-400 hover:border-emerald-500 hover:text-emerald-600"
                      }`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    </button>

                    {/* Right Output Port (Drag to wire!) */}
                    <button
                      type="button"
                      title="Drag from here to another block's left In dot (or click)"
                      aria-label={`Output port for ${node.label}`}
                      onMouseDown={(e) => startWireDrag(e, node)}
                      className={`absolute -right-2.5 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full border-2 flex items-center justify-center z-30 cursor-crosshair transition-all ${
                        isWiringSource
                          ? "bg-emerald-600 border-white text-white scale-125 ring-2 ring-emerald-300 shadow-sm"
                          : "bg-white border-emerald-500 text-emerald-600 hover:bg-emerald-600 hover:text-white shadow-2xs"
                      }`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    </button>

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
                              : linkedConn
                                ? `APP · ${linkedConn.name}`
                                : visuals.tag}
                          </span>
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {node.label}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        title="Click-to-connect fallback"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConnectSourceId(
                            connectSourceId === node.id ? null : node.id,
                          );
                        }}
                        className={`p-1 rounded border text-[10px] font-semibold shrink-0 ${
                          isWiringSource
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : "bg-white text-slate-500 border-slate-200 hover:text-emerald-600 hover:border-emerald-300"
                        }`}
                      >
                        <Link2 className="h-3 w-3" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-1.5 pt-1">
                      <p className="text-[10px] text-slate-500 truncate">
                        {node.config?.sample_csv
                          ? "Custom CSV rows loaded"
                          : node.subtitle || "Configured block"}
                      </p>
                      {nodeStep ? (
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                            nodeStep.status === "skipped"
                              ? "bg-slate-200 text-slate-600"
                              : nodeStep.status === "awaiting_approval"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {nodeStep.status === "skipped"
                            ? "Skipped"
                            : nodeStep.status === "awaiting_approval"
                              ? "Held"
                              : nodeStep.cost_savings_usd > 0
                                ? `+$${Math.round(nodeStep.cost_savings_usd)}`
                                : "Done"}
                        </span>
                      ) : node.config?.sample_csv ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 shrink-0">
                          CSV Ready
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
                </div>
              </div>
            </div>

            {/* Contextual Slide-In Inspector Drawer inside Canvas right edge */}
            {showInspector && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="w-[300px] shrink-0 h-full overflow-y-auto border-l border-slate-200 bg-white/95 backdrop-blur-sm p-4 space-y-4 z-30"
              >
                <div className="border-b border-slate-100 pb-2 flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Block &amp; Rule Settings
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Configure selected item or click canvas to close.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowInspector(false)}
                    className="text-[11px] font-semibold text-slate-400 hover:text-slate-700"
                  >
                    Close
                  </button>
                </div>

          {selectedNode ? (
            <div className="space-y-3">
              {selectedNode.kind === "agent" && (
                <div className="flex items-center gap-2.5 p-2 rounded-xl bg-emerald-50/70 border border-emerald-200">
                  <SwarmBotAvatar
                    agentId={selectedNode.agent_id || selectedNode.ref_id}
                    mood="happy"
                    size="xs"
                  />
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-emerald-900 truncate">
                      {getCompanionMeta(selectedNode.agent_id || selectedNode.ref_id).nickname}
                    </p>
                    <p className="text-[10px] text-emerald-800 truncate">
                      {getCompanionMeta(selectedNode.agent_id || selectedNode.ref_id).roleTag}
                    </p>
                  </div>
                </div>
              )}

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
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
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
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
                />
              </div>

              {selectedNode.kind === "connector_input" && (
                <div className="space-y-2.5 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Source App Connector
                    </label>
                    <select
                      value={String(selectedNode.config?.connector_id || "")}
                      onChange={(e) => {
                        const cid = e.target.value;
                        const matched = connectors.find((c) => c.id === cid);
                        setNodes((prev) =>
                          prev.map((n) =>
                            n.id === selectedNode.id
                              ? {
                                  ...n,
                                  ref_id: matched ? matched.connector_type : n.ref_id,
                                  config: {
                                    ...n.config,
                                    connector_id: cid || undefined,
                                    connector_type: matched
                                      ? matched.connector_type
                                      : n.config?.connector_type || n.ref_id,
                                  },
                                }
                              : n,
                          ),
                        );
                      }}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-emerald-600"
                    >
                      <option value="">All Plant Records &amp; Default App Pool</option>
                      {connectors.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.connector_type.replace(/_/g, " ")})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Record Stream Filter
                    </label>
                    <select
                      value={String(selectedNode.config?.record_type || "all")}
                      onChange={(e) => {
                        const rt = e.target.value;
                        setNodes((prev) =>
                          prev.map((n) =>
                            n.id === selectedNode.id
                              ? { ...n, config: { ...n.config, record_type: rt } }
                              : n,
                          ),
                        );
                      }}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-emerald-600"
                    >
                      <option value="all">All Manufacturing Records</option>
                      <option value="service_ticket">Purchase Orders &amp; Work Tickets</option>
                      <option value="load_record">Receiving Slips &amp; Weigh-Ins</option>
                      <option value="invoice">Supplier Invoices</option>
                      <option value="dispatch_record">Production Shift Schedules</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <label className="block text-[11px] font-semibold text-slate-600">
                        Custom Flow CSV Data (Optional)
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setNodes((prev) =>
                            prev.map((n) =>
                              n.id === selectedNode.id
                                ? { ...n, config: { ...n.config, sample_csv: SAMPLE_LEAK_CSV } }
                                : n,
                            ),
                          )
                        }
                        className="text-[10px] font-semibold text-emerald-700 hover:underline"
                      >
                        Load Sample PO Leak CSV
                      </button>
                    </div>
                    <textarea
                      rows={4}
                      value={String(selectedNode.config?.sample_csv || "")}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNodes((prev) =>
                          prev.map((n) =>
                            n.id === selectedNode.id
                              ? { ...n, config: { ...n.config, sample_csv: val } }
                              : n,
                          ),
                        );
                      }}
                      placeholder="Leave blank to stream live plant records, or paste CSV rows here to test custom flow..."
                      className="w-full px-2.5 py-1.5 text-[11px] font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
                    />
                    {selectedNode.config?.sample_csv ? (
                      <button
                        type="button"
                        onClick={() =>
                          setNodes((prev) =>
                            prev.map((n) =>
                              n.id === selectedNode.id
                                ? { ...n, config: { ...n.config, sample_csv: "" } }
                                : n,
                            ),
                          )
                        }
                        className="mt-1 text-[10px] text-slate-500 hover:text-rose-600"
                      >
                        Clear custom CSV (use live DB records)
                      </button>
                    ) : null}
                  </div>
                </div>
              )}

              {selectedNode.kind === "connector_output" && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Destination App Connector
                  </label>
                  <select
                    value={String(selectedNode.config?.connector_id || "")}
                    onChange={(e) => {
                      const cid = e.target.value;
                      const matched = connectors.find((c) => c.id === cid);
                      setNodes((prev) =>
                        prev.map((n) =>
                          n.id === selectedNode.id
                            ? {
                                ...n,
                                ref_id: matched ? matched.connector_type : n.ref_id,
                                config: {
                                  ...n.config,
                                  connector_id: cid || undefined,
                                  connector_type: matched
                                    ? matched.connector_type
                                    : n.config?.connector_type || n.ref_id,
                                },
                              }
                            : n,
                        ),
                      );
                    }}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-emerald-600"
                  >
                    <option value="">Auto-Match by Connector Type</option>
                    {connectors.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.connector_type.replace(/_/g, " ")})
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-500">
                    When connected &amp; triggered, reports write live to this connector&apos;s export buffer.
                  </p>
                </div>
              )}

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
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
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
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
                  />
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setConnectSourceId(selectedNode.id)}
                  className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 flex items-center gap-1"
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
            )}
          </div>
        </div>
      </div>

      {/* Execution Results & Artifacts */}
      {latestRun && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Latest Swarm Execution — {latestRun.workflow_name}
                </h3>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  {latestRun.sdk}
                </span>
                {Array.isArray(latestRun.sdk_metadata?.edge_traces) && (
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {latestRun.sdk_metadata.edge_traces.filter((t) => t.triggered).length}/
                    {latestRun.sdk_metadata.edge_traces.length} wires carried live data
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 mt-1">{latestRun.orchestrator_summary}</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-emerald-600" />
                <div>
                  <p className="text-[10px] font-semibold uppercase text-emerald-700">
                    Cost Savings Found
                  </p>
                  <p className="text-sm font-bold text-emerald-900 tabular-nums">
                    ${latestRun.total_cost_savings_usd.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="px-3 py-2 rounded-xl bg-blue-50 border border-blue-200 flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-[10px] font-semibold uppercase text-blue-700">
                    Time Saved
                  </p>
                  <p className="text-sm font-bold text-blue-900 tabular-nums">
                    {latestRun.total_hours_saved} hrs ({Math.round(latestRun.total_time_saved_minutes)} min)
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Step-by-Step Pipeline Output */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {latestRun.steps.map((step, i) => {
              const isSkipped = step.status === "skipped";
              const isHeld = step.status === "awaiting_approval";
              return (
                <div
                  key={`${step.node_id}-${i}`}
                  className={`p-3 rounded-xl border space-y-1.5 ${
                    isSkipped
                      ? "border-slate-200 bg-slate-50/40 opacity-70"
                      : isHeld
                        ? "border-amber-200 bg-amber-50/40"
                        : "border-slate-200 bg-slate-50/70"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-slate-500">
                      STEP {i + 1} · {step.kind.replace(/_/g, " ").toUpperCase()}
                    </span>
                    {step.kind === "agent" ? (
                      <SwarmBotAvatar
                        agentId={inferAgentAvatarId(step.label)}
                        mood={isSkipped ? "thinking" : "proud"}
                        size="xs"
                      />
                    ) : isHeld ? (
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                    ) : (
                      <ArrowRight className="h-3 w-3 text-slate-400" />
                    )}
                  </div>
                  <p className="text-xs font-bold text-slate-900 truncate">{step.label}</p>
                  <p className="text-[11px] text-slate-600 leading-relaxed">{step.summary}</p>
                  <div className="flex items-center justify-between pt-1 text-[10px] font-semibold text-slate-500">
                    <span
                      className={
                        isSkipped
                          ? "text-slate-400"
                          : isHeld
                            ? "text-amber-700"
                            : "text-emerald-700"
                      }
                    >
                      {isSkipped
                        ? "Skipped (rule not met)"
                        : step.cost_savings_usd > 0
                          ? `+$${step.cost_savings_usd.toFixed(0)} saved`
                          : isHeld
                            ? "Awaiting sign-off"
                            : "Passed downstream"}
                    </span>
                    <span>{step.time_saved_minutes} min</span>
                  </div>
                </div>
              );
            })}
          </div>

          {latestRun.exported_artifacts && latestRun.exported_artifacts.length > 0 && (
            <div className="pt-2 border-t border-slate-100 space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-700">
                  Live Output Payloads Synced ({latestRun.exported_artifacts.length})
                </p>
                {onNavigateTab && (
                  <button
                    type="button"
                    onClick={() => onNavigateTab("connectors")}
                    className="text-[11px] font-semibold text-emerald-700 hover:underline"
                  >
                    Open App Connectors &rarr;
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {latestRun.exported_artifacts.map((art, idx) => {
                  const fullBody = art.content || art.preview || "";
                  const isExpanded = expandedArtifactIdx === idx;
                  return (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/30 text-xs space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                              {art.connector_name || art.connector_type || art.type}
                            </span>
                            {art.format && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                .{art.format === "csv" ? "csv" : "md"}
                              </span>
                            )}
                          </div>
                          <p className="font-bold text-slate-900 mt-1">{art.title}</p>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {fullBody && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleCopyArtifact(idx, fullBody)}
                                title="Copy exported payload"
                                className="px-2 py-1 rounded-md border border-slate-200 bg-white text-[10px] font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1"
                              >
                                {copiedArtifactIdx === idx ? (
                                  <Check className="h-3 w-3 text-emerald-600" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                                {copiedArtifactIdx === idx ? "Copied" : "Copy"}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  downloadExportedArtifact(art.title, fullBody, art.format)
                                }
                                title="Download exported file"
                                className="px-2 py-1 rounded-md border border-slate-200 bg-white text-[10px] font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1"
                              >
                                <Download className="h-3 w-3" />
                                Save
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {art.preview && (
                        <p className="text-slate-600 whitespace-pre-wrap leading-relaxed">
                          {art.preview}
                        </p>
                      )}

                      {art.content && art.content !== art.preview && (
                        <div>
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedArtifactIdx(isExpanded ? null : idx)
                            }
                            className="text-[11px] font-semibold text-emerald-700 hover:underline flex items-center gap-1"
                          >
                            {isExpanded ? "Hide full exported payload" : "View full exported payload"}
                            {isExpanded ? (
                              <ChevronUp className="h-3 w-3" />
                            ) : (
                              <ChevronDown className="h-3 w-3" />
                            )}
                          </button>
                          {isExpanded && (
                            <pre className="mt-2 p-2.5 rounded-lg bg-slate-950 text-slate-100 text-[11px] font-mono overflow-x-auto max-h-48 leading-relaxed">
                              {art.content}
                            </pre>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
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

      <WorkflowPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        workflowName={wfName}
        workflowDescription={wfDesc}
        isTemplate={activeWorkflow?.is_template}
        estimatedCostSavingsUsd={
          activeWorkflow?.estimated_cost_savings_usd ??
          Math.max(850, nodes.filter((n) => n.kind === "agent").length * 1450)
        }
        estimatedHoursSavedMonthly={
          activeWorkflow?.estimated_hours_saved_monthly ??
          Math.max(12, nodes.filter((n) => n.kind === "agent").length * 16)
        }
        nodes={nodes}
        edges={edges}
        connectors={connectors}
        latestRun={latestRun}
        running={running}
        onRunNow={handleRunWorkflow}
      />
    </div>
  );
}
