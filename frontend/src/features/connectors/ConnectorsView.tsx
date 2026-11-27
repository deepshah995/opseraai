"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { AppConnector } from "@/types";
import {
  CheckCircle2,
  Copy,
  Database,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Lock,
  Mail,
  MessageSquare,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";

const SAMPLE_SHEET_PASTE = `ticket_number,customer_name,service_date,quantity,unit,rate,amount,notes
PO-8101,Titanium Steel Supply,2026-11-18,10.0,tons,120.00,1200.00,Cold Rolled Coil Batch
PO-8102,Precision Alloy Foundry,2026-11-19,5.5,tons,140.00,770.00,6061 Aluminum Extrusion`;

function isSafeHttpsUrl(url?: string | null): url is string {
  if (!url) return false;
  return url.trim().toLowerCase().startsWith("https://");
}

function getConnectorMeta(type: string) {
  switch (type) {
    case "google_sheets":
      return {
        label: "Google Sheets",
        icon: FileSpreadsheet,
        badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
        iconBg: "bg-emerald-600 text-white",
      };
    case "google_docs":
      return {
        label: "Google Docs",
        icon: FileText,
        badge: "bg-blue-50 text-blue-700 border-blue-200",
        iconBg: "bg-blue-600 text-white",
      };
    case "slack_webhook":
      return {
        label: "Slack Alerts",
        icon: MessageSquare,
        badge: "bg-violet-50 text-violet-700 border-violet-200",
        iconBg: "bg-violet-600 text-white",
      };
    case "email_digest":
      return {
        label: "Email Digest",
        icon: Mail,
        badge: "bg-amber-50 text-amber-700 border-amber-200",
        iconBg: "bg-amber-600 text-white",
      };
    default:
      return {
        label: "Manufacturing ERP",
        icon: Database,
        badge: "bg-slate-100 text-slate-700 border-slate-200",
        iconBg: "bg-slate-800 text-white",
      };
  }
}

export function ConnectorsView() {
  const [connectors, setConnectors] = useState<AppConnector[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  // Add Connector Form
  const [newType, setNewType] = useState<string>("google_sheets");
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newDirection, setNewDirection] = useState<"import" | "export" | "bidirectional">("bidirectional");
  const [newToken, setNewToken] = useState("");

  // Selected Connector Edit & Sync State
  const [editUrl, setEditUrl] = useState("");
  const [editToken, setEditToken] = useState("");
  const [recordType, setRecordType] = useState<
    "service_ticket" | "invoice" | "load_record" | "dispatch_record"
  >("service_ticket");
  const [csvOverride, setCsvOverride] = useState("");
  const [docTitle, setDocTitle] = useState("Plant Cost & Time Savings Executive Brief");
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState(false);
  const [banner, setBanner] = useState<{ tone: "success" | "error" | "info"; text: string } | null>(null);

  const selected = connectors.find((c) => c.id === selectedId) || null;

  const loadConnectors = async (focusId?: string) => {
    try {
      setLoading(true);
      const list = await api.listConnectors();
      setConnectors(list);
      const target = (focusId ? list.find((c) => c.id === focusId) : null) || list[0] || null;
      if (target) {
        setSelectedId(target.id);
        setEditUrl(target.external_url || "");
        setEditToken("");
      }
    } catch (err: any) {
      setBanner({ tone: "error", text: err.message || "Failed to load app connectors." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConnectors();
  }, []);

  const handleSelectConnector = (conn: AppConnector) => {
    setSelectedId(conn.id);
    setEditUrl(conn.external_url || "");
    setEditToken("");
    setConfirmDeleteId(null);
    setBanner(null);
  };

  const handleCreateConnector = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setBanner({ tone: "error", text: "Please enter a name for the connector." });
      return;
    }
    setBusyAction("create");
    setBanner(null);
    try {
      const created = await api.createConnector({
        connector_type: newType,
        name: newName.trim(),
        description: `Connected ${getConnectorMeta(newType).label} integration for manufacturing swarm workflows.`,
        sync_direction: newDirection,
        external_url: newUrl.trim() || undefined,
        credential_token: newToken.trim() || undefined,
      });
      setShowAddForm(false);
      setNewName("");
      setNewUrl("");
      setNewToken("");
      await loadConnectors(created.id);
      setBanner({ tone: "success", text: `Added connector "${created.name}".` });
    } catch (err: any) {
      setBanner({ tone: "error", text: err.message || "Failed to add connector." });
    } finally {
      setBusyAction(null);
    }
  };

  const handleSaveSettings = async () => {
    if (!selected) return;
    setBusyAction("save");
    setBanner(null);
    try {
      const updated = await api.updateConnector(selected.id, {
        external_url: editUrl.trim(),
        ...(editToken.trim() ? { credential_token: editToken.trim() } : {}),
      });
      setConnectors((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setEditToken("");
      setBanner({ tone: "success", text: `Saved connection settings for ${updated.name}.` });
    } catch (err: any) {
      setBanner({ tone: "error", text: err.message || "Failed to save settings." });
    } finally {
      setBusyAction(null);
    }
  };

  const handleSync = async (mode: "import" | "export") => {
    if (!selected) return;
    setBusyAction(`sync-${mode}`);
    setBanner(null);
    try {
      const res = await api.syncConnector(selected.id, {
        mode,
        record_type: recordType,
        csv_override: mode === "import" && csvOverride.trim() ? csvOverride : undefined,
        use_live_fetch: true,
        document_title: selected.connector_type === "google_docs" ? docTitle : undefined,
      });
      setConnectors((prev) =>
        prev.map((c) => (c.id === res.connector.id ? res.connector : c)),
      );
      if (mode === "import") {
        setBanner({
          tone: "success",
          text: `Imported ${res.sync_result.imported_count ?? 0} rows (${res.sync_result.new_exceptions_detected ?? 0} new cost/qty discrepancies flagged).`,
        });
      } else {
        setBanner({
          tone: "success",
          text:
            selected.connector_type === "google_docs"
              ? `Published brief "${res.sync_result.title}" — ready to copy or download.`
              : `Exported ${res.sync_result.rows_exported ?? 0} verified savings & issue rows.`,
        });
      }
    } catch (err: any) {
      setBanner({ tone: "error", text: err.message || "Connector sync failed." });
    } finally {
      setBusyAction(null);
    }
  };

  const handleDelete = async (id: string) => {
    setBusyAction("delete");
    try {
      await api.deleteConnector(id);
      setConfirmDeleteId(null);
      await loadConnectors();
      setBanner({ tone: "info", text: "Connector removed." });
    } catch (err: any) {
      setBanner({ tone: "error", text: err.message || "Delete failed." });
    } finally {
      setBusyAction(null);
    }
  };

  const handleCopyContent = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    } catch {
      setBanner({ tone: "error", text: "Clipboard copy blocked by browser permissions." });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="hero-aura rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-800 mb-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Two-Way Workspace Sync
          </span>
          <h2 className="font-display text-lg font-bold text-slate-950">App Connectors Hub</h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Connect Google Sheets, Google Docs, your Manufacturing ERP, and Slack so your Faktry AI
            Swarm reads live floor data and publishes reports automatically.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => loadConnectors(selectedId || undefined)}
            className="px-3.5 py-2 text-xs font-semibold rounded-full border border-slate-200 text-slate-700 bg-white hover:border-slate-300 hover:bg-slate-50 flex items-center gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setShowAddForm((prev) => !prev)}
            className="px-4 py-2 text-xs font-semibold rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add App Connector
          </button>
        </div>
      </div>

      {banner && (
        <div
          className={`px-4 py-3 rounded-lg border text-xs font-medium ${
            banner.tone === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : banner.tone === "error"
                ? "bg-rose-50 border-rose-200 text-rose-800"
                : "bg-blue-50 border-blue-200 text-blue-800"
          }`}
        >
          {banner.text}
        </div>
      )}

      {/* Add Connector Panel */}
      {showAddForm && (
        <form
          onSubmit={handleCreateConnector}
          className="bg-white rounded-xl border border-blue-200 p-5 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900">Connect a New Application</h3>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">App Type</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
              >
                <option value="google_sheets">Google Sheets (Spreadsheets)</option>
                <option value="google_docs">Google Docs (Briefs &amp; NCRs)</option>
                <option value="erp_database">Manufacturing ERP / SQL</option>
                <option value="slack_webhook">Slack Channel Webhook</option>
                <option value="email_digest">Email Ops Digest</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Connector Name
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={
                  newType === "google_sheets"
                    ? "e.g. Shift A Receiving Sheet"
                    : newType === "google_docs"
                      ? "e.g. Weekly Plant ROI Doc"
                      : "e.g. Plant Ops Notification"
                }
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {newType === "google_sheets"
                  ? "Google Sheet URL (Optional)"
                  : newType === "google_docs"
                    ? "Google Doc URL (Optional)"
                    : "Endpoint / Webhook URL (HTTPS)"}
              </label>
              <input
                type="url"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder={
                  newType === "google_sheets"
                    ? "https://docs.google.com/spreadsheets/d/..."
                    : newType === "google_docs"
                      ? "https://docs.google.com/document/d/..."
                      : "https://..."
                }
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Direction &amp; Credential (Masked)
              </label>
              <div className="flex gap-2">
                <select
                  value={newDirection}
                  onChange={(e) => setNewDirection(e.target.value as any)}
                  className="px-2 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value="bidirectional">Two-Way</option>
                  <option value="import">Import Only</option>
                  <option value="export">Export Only</option>
                </select>
                <input
                  type="password"
                  value={newToken}
                  onChange={(e) => setNewToken(e.target.value)}
                  placeholder="Optional token/key"
                  className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busyAction === "create"}
              className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
            >
              {busyAction === "create" ? "Saving..." : "Save Connector"}
            </button>
          </div>
        </form>
      )}

      {/* Main 2-Column Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left List */}
        <div className="lg:col-span-5 space-y-3">
          {loading ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-xs text-slate-400">
              Loading app connectors...
            </div>
          ) : (
            connectors.map((conn) => {
              const meta = getConnectorMeta(conn.connector_type);
              const Icon = meta.icon;
              const isSelected = conn.id === selectedId;
              return (
                <button
                  key={conn.id}
                  type="button"
                  onClick={() => handleSelectConnector(conn)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    isSelected
                      ? "bg-white border-blue-500 ring-2 ring-blue-100 shadow-sm"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-2 rounded-lg shrink-0 ${meta.iconBg}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{conn.name}</p>
                        <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">
                          {conn.description || meta.label}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${
                        conn.status === "connected"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-slate-100 text-slate-600 border-slate-200"
                      }`}
                    >
                      {conn.status === "connected" ? "Connected" : "Ready"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-3 pt-2.5 border-t border-slate-100">
                    <span className="font-medium capitalize">
                      Mode: {conn.sync_direction}
                    </span>
                    <span>
                      {conn.records_synced > 0
                        ? `${conn.records_synced} synced`
                        : "Not synced yet"}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Right Detail & Sync Workspace */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          {selected ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getConnectorMeta(selected.connector_type).badge}`}
                  >
                    {getConnectorMeta(selected.connector_type).label}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mt-1.5">
                    {selected.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">{selected.description}</p>
                </div>

                <div className="flex items-center gap-2">
                  {isSafeHttpsUrl(selected.external_url) && (
                    <a
                      href={selected.external_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 flex items-center gap-1"
                    >
                      Open App <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {confirmDeleteId === selected.id ? (
                    <div className="flex items-center gap-1.5 text-xs">
                      <button
                        type="button"
                        onClick={() => handleDelete(selected.id)}
                        className="px-2 py-1 rounded bg-rose-600 text-white font-semibold"
                      >
                        Confirm Remove
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2 py-1 rounded bg-slate-100 text-slate-700"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(selected.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                      title="Delete Connector"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Connection URL & Masked Credentials */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    {selected.connector_type === "google_sheets"
                      ? "Google Sheets URL (https://docs.google.com/spreadsheets/d/...)"
                      : selected.connector_type === "google_docs"
                        ? "Google Docs URL (https://docs.google.com/document/d/...)"
                        : "Endpoint / Webhook HTTPS URL"}
                  </label>
                  <input
                    type="url"
                    value={editUrl}
                    onChange={(e) => setEditUrl(e.target.value)}
                    placeholder="Paste URL here..."
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <Lock className="h-3 w-3 text-slate-500" />
                    Service Token / Webhook Secret{" "}
                    {selected.has_credentials && selected.secret_preview && (
                      <span className="text-emerald-700 font-mono">
                        ({selected.secret_preview})
                      </span>
                    )}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={editToken}
                      onChange={(e) => setEditToken(e.target.value)}
                      placeholder={
                        selected.has_credentials
                          ? "Enter new token to rotate..."
                          : "Optional OAuth / API key"
                      }
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={handleSaveSettings}
                      disabled={busyAction === "save"}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 shrink-0"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>

              {/* GOOGLE SHEETS ACTIONS */}
              {selected.connector_type === "google_sheets" && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">
                          Import Receiving Slips, POs, or Invoices from Google Sheets
                        </h4>
                        <p className="text-[11px] text-slate-600">
                          Fetches your linked public Google Sheet CSV or imports pasted sheet rows
                          and runs Swarm anomaly detection automatically.
                        </p>
                      </div>
                      <select
                        value={recordType}
                        onChange={(e) => setRecordType(e.target.value as any)}
                        className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-medium"
                      >
                        <option value="service_ticket">Material Work Orders &amp; POs</option>
                        <option value="load_record">Receiving Dock Scale Slips</option>
                        <option value="invoice">Supplier &amp; Customer Invoices</option>
                        <option value="dispatch_record">Production Cell Schedules</option>
                      </select>
                    </div>

                    <textarea
                      rows={4}
                      value={csvOverride}
                      onChange={(e) => setCsvOverride(e.target.value)}
                      placeholder="Optional: Paste CSV rows copied directly from Google Sheets (or leave empty to sync from Sheet URL / Manufacturing Sample)..."
                      className="w-full p-2.5 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-500"
                    />

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setCsvOverride(SAMPLE_SHEET_PASTE)}
                        className="text-xs font-medium text-emerald-700 hover:underline"
                      >
                        Insert Sample Manufacturing Sheet Rows
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSync("import")}
                        disabled={busyAction === "sync-import"}
                        className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        {busyAction === "sync-import" ? "Importing..." : "Import Sheet Data"}
                      </button>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">
                        Export Cost Savings &amp; Audit Exceptions to Google Sheets
                      </h4>
                      <p className="text-[11px] text-slate-600">
                        Generates a clean CSV ready to open directly inside Google Sheets or Excel.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSync("export")}
                        disabled={busyAction === "sync-export"}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 flex items-center gap-1.5"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Generate Export
                      </button>
                      {selected.last_sync_summary?.mode === "export" && (
                        <button
                          type="button"
                          onClick={() =>
                            api.downloadConnectorExport(selected.id, "plant_cost_savings_sheet.csv")
                          }
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 flex items-center gap-1.5"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download .CSV
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* GOOGLE DOCS ACTIONS */}
              {selected.connector_type === "google_docs" && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 space-y-3">
                    <h4 className="text-xs font-bold text-slate-900">
                      Publish Executive Cost Savings &amp; Supplier NCR Brief to Google Docs
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      <input
                        type="text"
                        value={docTitle}
                        onChange={(e) => setDocTitle(e.target.value)}
                        placeholder="Google Doc Brief Title..."
                        className="flex-1 min-w-[240px] px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => handleSync("export")}
                        disabled={busyAction === "sync-export"}
                        className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        {busyAction === "sync-export" ? "Generating..." : "Publish Brief Now"}
                      </button>
                    </div>
                  </div>

                  {selected.last_sync_summary?.content && (
                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                      <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">
                          Latest Brief Preview ({selected.last_sync_summary.title})
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              handleCopyContent(String(selected.last_sync_summary?.content || ""))
                            }
                            className="px-2.5 py-1 text-[11px] font-medium rounded border border-slate-300 bg-white hover:bg-slate-100 flex items-center gap-1"
                          >
                            {copiedText ? (
                              <>
                                <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Copied
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" /> Copy for Google Docs
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              api.downloadConnectorExport(selected.id, "plant_savings_brief.md")
                            }
                            className="px-2.5 py-1 text-[11px] font-medium rounded border border-slate-300 bg-white hover:bg-slate-100 flex items-center gap-1"
                          >
                            <Download className="h-3 w-3" /> Download .MD
                          </button>
                        </div>
                      </div>
                      <pre className="p-3.5 text-xs text-slate-700 bg-white whitespace-pre-wrap max-h-60 overflow-y-auto font-sans leading-relaxed">
                        {String(selected.last_sync_summary.content)}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {/* ERP / SLACK / EMAIL ACTIONS */}
              {selected.connector_type !== "google_sheets" &&
                selected.connector_type !== "google_docs" && (
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                    <h4 className="text-xs font-bold text-slate-900">
                      Test &amp; Sync Integration
                    </h4>
                    <p className="text-xs text-slate-600">
                      Verify live connectivity and synchronize manufacturing operational records
                      or outbound exception alerts.
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        handleSync(selected.sync_direction === "import" ? "import" : "export")
                      }
                      disabled={busyAction !== null}
                      className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 hover:bg-slate-800 text-white flex items-center gap-1.5"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Run Connector Sync Check
                    </button>
                  </div>
                )}

              {/* Last Sync Metadata */}
              {selected.last_synced_at && (
                <p className="text-[11px] text-slate-400">
                  Last synced: {new Date(selected.last_synced_at).toLocaleString()} · Total items synced:{" "}
                  {selected.records_synced}
                </p>
              )}
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-slate-400">
              Select an integration on the left to configure Google Sheets, Google Docs, or ERP sync.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
