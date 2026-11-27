import {
  SwarmWorkflow,
  WorkflowEdgeCondition,
  WorkflowNode,
} from "@/types";
import {
  BarChart3,
  Cpu,
  Database,
  FileSpreadsheet,
  FileText,
  Receipt,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Zap,
} from "lucide-react";

export const NODE_WIDTH = 228;
export const NODE_HEIGHT = 92;
export const CANVAS_WIDTH = 1640;
export const CANVAS_HEIGHT = 820;

export const SAMPLE_LEAK_CSV = [
  "record_type,external_reference,supplier_name,service_date,quantity,unit,rate,amount",
  "service_ticket,PO-9014,Precision Alloys LLC,2026-11-24,500,lbs,14.50,7250.00",
  "load_record,RCV-4410,Precision Alloys LLC,2026-11-25,440,lbs,14.50,6380.00",
  "invoice,INV-88321,Precision Alloys LLC,2026-11-26,500,lbs,17.20,8600.00",
].join("\n");

export const EDGE_CONDITIONS: Array<{ value: WorkflowEdgeCondition; label: string }> = [
  { value: "always", label: "Always Forward" },
  { value: "if_discrepancy_found", label: "If Cost/Qty Leak Found" },
  { value: "if_variance_gt_500", label: "If Impact >= $500 (Hold)" },
  { value: "auto_settle_below_500", label: "If Impact < $500 (Auto-Clear)" },
];

export function getNodeVisuals(node: WorkflowNode) {
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

export function inferAgentAvatarId(label: string): string {
  const lower = label.toLowerCase();
  if (lower.includes("bom")) return "bom_guard";
  if (lower.includes("cost")) return "cost_sentry";
  if (lower.includes("line")) return "line_pulse";
  if (lower.includes("quality")) return "quality_shield";
  return "plant_beacon";
}

export function downloadExportedArtifact(title: string, content: string, format?: string) {
  const ext = format === "csv" ? "csv" : "md";
  const mime = format === "csv" ? "text/csv;charset=utf-8" : "text/markdown;charset=utf-8";
  const safeName =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "faktry-export";
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeName}.${ext}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function computeWorkflowBounds(wf: Pick<SwarmWorkflow, "nodes">): {
  width: number;
  height: number;
} {
  if (!wf.nodes || wf.nodes.length === 0) {
    return { width: 1200, height: 500 };
  }
  const maxX = Math.max(...wf.nodes.map((n) => n.x + NODE_WIDTH + 80));
  const maxY = Math.max(...wf.nodes.map((n) => n.y + NODE_HEIGHT + 80));
  return {
    width: Math.max(1100, maxX),
    height: Math.max(440, maxY),
  };
}
