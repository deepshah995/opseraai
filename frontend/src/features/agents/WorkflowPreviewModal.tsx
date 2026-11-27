"use client";

import React, { useEffect, useMemo, useState } from "react";
import { SwarmBotAvatar, getCompanionMeta } from "@/components/agents/SwarmBotAvatar";
import {
  AppConnector,
  SwarmRun,
  SwarmRunStep,
  WorkflowEdge,
  WorkflowEdgeTrace,
  WorkflowNode,
} from "@/types";
import {
  computeWorkflowBounds,
  downloadExportedArtifact,
  getNodeVisuals,
  inferAgentAvatarId,
  NODE_HEIGHT,
  NODE_WIDTH,
} from "./workflowVisuals";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  DollarSign,
  Download,
  GitBranch,
  Play,
  RefreshCw,
  Sparkles,
  X,
} from "lucide-react";

interface WorkflowPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  workflowName: string;
  workflowDescription: string;
  isTemplate?: boolean;
  estimatedCostSavingsUsd: number;
  estimatedHoursSavedMonthly: number;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  connectors: AppConnector[];
  latestRun: SwarmRun | null;
  running: boolean;
  onRunNow: () => Promise<void> | void;
}

export function WorkflowPreviewModal({
  isOpen,
  onClose,
  workflowName,
  workflowDescription,
  isTemplate,
  estimatedCostSavingsUsd,
  estimatedHoursSavedMonthly,
  nodes,
  edges,
  connectors,
  latestRun,
  running,
  onRunNow,
}: WorkflowPreviewModalProps) {
  const [zoom, setZoom] = useState<number>(0.8);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  const bounds = useMemo(() => computeWorkflowBounds({ nodes }), [nodes]);

  const runMatches = useMemo(() => {
    if (!latestRun) return false;
    const ids = new Set(nodes.map((n) => n.id));
    return latestRun.steps.some((s) => ids.has(s.node_id));
  }, [latestRun, nodes]);

  const edgeTraceById = useMemo(() => {
    const map = new Map<string, WorkflowEdgeTrace>();
    if (!latestRun || !runMatches) return map;
    for (const tr of latestRun.sdk_metadata?.edge_traces || []) {
      map.set(tr.edge_id, tr);
    }
    return map;
  }, [latestRun, runMatches]);

  const stepByNodeId = useMemo(() => {
    const map = new Map<string, SwarmRunStep>();
    if (!latestRun || !runMatches) return map;
    for (const st of latestRun.steps || []) {
      map.set(st.node_id, st);
    }
    return map;
  }, [latestRun, runMatches]);

  if (!isOpen) return null;

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null;
  const selectedEdge = edges.find((ed) => ed.id === selectedEdgeId) || null;

  const handleCopy = async (idx: number, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx((cur) => (cur === idx ? null : cur)), 2000);
    } catch {
      // clipboard unavailable
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Preview ${workflowName || "Swarm Workflow"}`}
    >
      <div
        className="w-[95vw] max-w-[1440px] h-[90vh] max-h-[920px] bg-white rounded-3xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 hero-aura flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="h-10 w-10 rounded-xl bg-slate-950 text-emerald-400 flex items-center justify-center shrink-0">
              <GitBranch className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display font-bold text-lg text-slate-950 truncate">
                  {workflowName || "Untitled Swarm Workflow"}
                </h2>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <Sparkles className="h-3 w-3 text-emerald-600" />
                  Google Antigravity SDK
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  {isTemplate ? "Template" : "Custom Flow"} · {nodes.length} blocks · {edges.length} links
                </span>
              </div>
              {workflowDescription && (
                <p className="text-xs text-slate-600 mt-0.5 line-clamp-1">{workflowDescription}</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="hidden md:flex items-center gap-2 mr-1">
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-bold text-emerald-800 tabular-nums">
                Est. ${estimatedCostSavingsUsd.toLocaleString()}/mo
              </span>
              <span className="px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-[11px] font-bold text-blue-800 tabular-nums">
                {estimatedHoursSavedMonthly} hrs/mo saved
              </span>
            </div>

            <div className="inline-flex items-center rounded-full border border-slate-200 bg-white overflow-hidden">
              {[0.65, 0.8, 1].map((z) => (
                <button
                  key={z}
                  type="button"
                  onClick={() => setZoom(z)}
                  className={`px-2.5 py-1 text-[11px] font-bold tabular-nums ${
                    zoom === z ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {Math.round(z * 100)}%
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={onRunNow}
              disabled={running || nodes.length === 0}
              className="px-4 py-2 text-xs font-semibold rounded-full bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
            >
              {running ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
              {running ? "Running..." : "Run Flow Now"}
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close workflow preview popup"
              className="p-2 rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-[#f8fafc]">
          {/* Large Canvas Preview + Selection Readout */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-slate-800">
                Interactive Flow Map — click any block or wire pill to inspect live step metrics
              </span>
              {selectedNode ? (
                <span className="text-[11px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  Selected: <strong>{selectedNode.label}</strong>
                  {stepByNodeId.get(selectedNode.id)
                    ? ` · ${stepByNodeId.get(selectedNode.id)!.summary}`
                    : ""}
                </span>
              ) : selectedEdge ? (
                <span className="text-[11px] font-medium text-slate-800 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full">
                  Wire Rule: <strong>{selectedEdge.label || selectedEdge.condition}</strong>
                  {edgeTraceById.get(selectedEdge.id)
                    ? ` · ${edgeTraceById.get(selectedEdge.id)!.summary}`
                    : ""}
                </span>
              ) : null}
            </div>

            <div
              className="relative h-[440px] overflow-auto bg-[#f8fafc]"
              style={{
                backgroundImage: "radial-gradient(#cbd5e1 1px, transparent 1px)",
                backgroundSize: `${Math.round(20 * zoom)}px ${Math.round(20 * zoom)}px`,
              }}
            >
              <div
                style={{
                  width: `${bounds.width * zoom}px`,
                  height: `${bounds.height * zoom}px`,
                }}
                className="relative"
              >
                <div
                  style={{
                    width: `${bounds.width}px`,
                    height: `${bounds.height}px`,
                    transform: `scale(${zoom})`,
                    transformOrigin: "top left",
                  }}
                  className="relative"
                >
                  <svg
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    viewBox={`0 0 ${bounds.width} ${bounds.height}`}
                  >
                    <defs>
                      <marker
                        id="prev-arrow-slate"
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
                        id="prev-arrow-emerald"
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
                        id="prev-arrow-muted"
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
                      const trace = edgeTraceById.get(edge.id);
                      const isTriggered = trace?.triggered === true;
                      const isSkipped = trace?.triggered === false;
                      const isEdgeSel = edge.id === selectedEdgeId;

                      return (
                        <path
                          key={`prev-edge-${edge.id}`}
                          d={pathD}
                          fill="none"
                          stroke={
                            isEdgeSel
                              ? "#0f172a"
                              : isTriggered
                                ? "#059669"
                                : isSkipped
                                  ? "#cbd5e1"
                                  : "#64748b"
                          }
                          strokeWidth={isEdgeSel ? 3 : isTriggered ? 2.5 : 2}
                          strokeDasharray={
                            isSkipped || edge.condition !== "always" ? "6 4" : undefined
                          }
                          markerEnd={
                            isEdgeSel
                              ? "url(#prev-arrow-slate)"
                              : isTriggered
                                ? "url(#prev-arrow-emerald)"
                                : isSkipped
                                  ? "url(#prev-arrow-muted)"
                                  : "url(#prev-arrow-slate)"
                          }
                        />
                      );
                    })}
                  </svg>

                  {edges.map((edge) => {
                    const src = nodes.find((n) => n.id === edge.source);
                    const tgt = nodes.find((n) => n.id === edge.target);
                    if (!src || !tgt) return null;
                    const midX = (src.x + NODE_WIDTH + tgt.x) / 2;
                    const midY = (src.y + NODE_HEIGHT / 2 + tgt.y + NODE_HEIGHT / 2) / 2;
                    const trace = edgeTraceById.get(edge.id);
                    const isEdgeSel = edge.id === selectedEdgeId;
                    return (
                      <button
                        key={`prev-pill-${edge.id}`}
                        type="button"
                        onClick={() => {
                          setSelectedEdgeId(edge.id);
                          setSelectedNodeId(null);
                        }}
                        style={{
                          left: `${midX}px`,
                          top: `${midY}px`,
                          transform: "translate(-50%, -50%)",
                        }}
                        className={`absolute z-[25] max-w-[155px] truncate px-2 py-0.5 rounded-full text-[10px] font-medium border shadow-xs whitespace-nowrap ${
                          isEdgeSel
                            ? "bg-slate-950 text-white border-slate-950"
                            : trace?.triggered
                              ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                              : trace && !trace.triggered
                                ? "bg-slate-100 text-slate-400 border-slate-200"
                                : "bg-white text-slate-700 border-slate-300 hover:border-emerald-400"
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

                  {nodes.map((node) => {
                    const visuals = getNodeVisuals(node);
                    const Icon = visuals.icon;
                    const nodeStep = stepByNodeId.get(node.id);
                    const isSelected = node.id === selectedNodeId;
                    const linkedConn = node.config?.connector_id
                      ? connectors.find((c) => c.id === node.config.connector_id)
                      : undefined;
                    return (
                      <button
                        key={`prev-node-${node.id}`}
                        type="button"
                        onClick={() => {
                          setSelectedNodeId(node.id);
                          setSelectedEdgeId(null);
                        }}
                        style={{
                          left: `${node.x}px`,
                          top: `${node.y}px`,
                          width: `${NODE_WIDTH}px`,
                          height: `${NODE_HEIGHT}px`,
                        }}
                        className={`text-left absolute z-20 rounded-xl border-2 px-3 py-2 shadow-sm flex flex-col justify-between transition-all ${visuals.bg} ${
                          isSelected
                            ? "border-slate-950 ring-2 ring-emerald-200 shadow-md"
                            : nodeStep?.status === "skipped"
                              ? "border-slate-200 opacity-70"
                              : visuals.border
                        }`}
                      >
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
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Execution Trace & Exported Payloads Inside Popup */}
          {latestRun && runMatches ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <h3 className="text-base font-bold text-slate-900">
                      Execution Trace — {latestRun.workflow_name}
                    </h3>
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
                        {latestRun.total_hours_saved} hrs
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {latestRun.steps.map((step, i) => {
                  const isSkipped = step.status === "skipped";
                  const isHeld = step.status === "awaiting_approval";
                  return (
                    <div
                      key={`prev-step-${step.node_id}-${i}`}
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
                    </div>
                  );
                })}
              </div>

              {latestRun.exported_artifacts && latestRun.exported_artifacts.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                  {latestRun.exported_artifacts.map((art, idx) => {
                    const body = art.content || art.preview || "";
                    return (
                      <div
                        key={`prev-art-${idx}`}
                        className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/30 text-xs space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                              {art.connector_name || art.connector_type || art.type}
                            </span>
                            <p className="font-bold text-slate-900 mt-1">{art.title}</p>
                          </div>
                          {body && (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleCopy(idx, body)}
                                className="px-2 py-1 rounded-md border border-slate-200 bg-white text-[10px] font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1"
                              >
                                {copiedIdx === idx ? (
                                  <Check className="h-3 w-3 text-emerald-600" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                                {copiedIdx === idx ? "Copied" : "Copy"}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  downloadExportedArtifact(art.title, body, art.format)
                                }
                                className="px-2 py-1 rounded-md border border-slate-200 bg-white text-[10px] font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1"
                              >
                                <Download className="h-3 w-3" />
                                Save
                              </button>
                            </div>
                          )}
                        </div>
                        {art.preview && (
                          <p className="text-slate-600 whitespace-pre-wrap leading-relaxed">
                            {art.preview}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
              <span>
                Click <strong>Run Flow Now</strong> above to stream live manufacturing records through this diagram and preview generated outputs here.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
