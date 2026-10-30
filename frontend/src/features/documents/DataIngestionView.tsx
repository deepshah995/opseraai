"use client";

import React, { useState } from "react";
import { 
  FileSpreadsheet, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Database,
  Download,
  UploadCloud,
  Check,
  HelpCircle,
  Server,
  Layers,
  ArrowRight,
  RefreshCw,
  Table,
  CheckCheck
} from "lucide-react";
import { api } from "@/lib/api/client";
import { SourceDocument } from "@/types";
import { 
  TEMPLATES, 
  downloadTemplate, 
  REQUIRED_TEMPLATE_COLUMNS 
} from "@/lib/templates/exportTemplates";

interface DataIngestionViewProps {
  documents: SourceDocument[];
  onRefresh: () => void;
}

export function DataIngestionView({ documents, onRefresh }: DataIngestionViewProps) {
  const [activeTab, setActiveTab] = useState<"csv" | "database" | "pdf">("csv");
  
  // CSV State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [recordType, setRecordType] = useState<string>("service_ticket");
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [commitLoading, setCommitLoading] = useState(false);
  const [commitMessage, setCommitMessage] = useState<string | null>(null);
  const [customMapping, setCustomMapping] = useState<Record<string, string>>({});

  // DB Connector State
  const [dbSystem, setDbSystem] = useState<string>("postgres");
  const [dbHost, setDbHost] = useState<string>("db.internal.apexwaste.com");
  const [dbPort, setDbPort] = useState<number>(5432);
  const [dbName, setDbName] = useState<string>("operations_prod");
  const [dbUser, setDbUser] = useState<string>("ops_reader");
  const [dbPassword, setDbPassword] = useState<string>("••••••••••••");
  const [dbConnecting, setDbConnecting] = useState(false);
  const [dbConnected, setDbConnected] = useState(false);
  const [availableTables, setAvailableTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>("dispatch_tickets");
  const [tablePreviewLoading, setTablePreviewLoading] = useState(false);
  const [tablePreview, setTablePreview] = useState<{
    table_name: string;
    columns: string[];
    sample_rows: any[];
    inferred_mapping: Record<string, string>;
  } | null>(null);
  const [dbImportRecordType, setDbImportRecordType] = useState<string>("service_ticket");
  const [dbMapping, setDbMapping] = useState<Record<string, string>>({});
  const [dbImportLoading, setDbImportLoading] = useState(false);
  const [dbNotice, setDbNotice] = useState<string | null>(null);

  // PDF State
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUploading, setPdfUploading] = useState(false);

  // --- CSV Handlers ---
  const handlePreviewCsv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;
    try {
      setPreviewLoading(true);
      setCommitMessage(null);
      const res = await api.previewCsv(selectedFile, recordType);
      setPreviewData(res);
      // Initialize custom mapping with inferred mapping
      setCustomMapping(res.inferred_mapping || {});
    } catch (err: any) {
      alert(`Preview failed: ${err.message}`);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleUpdateCsvMapping = (rawColumn: string, targetField: string) => {
    setCustomMapping((prev) => {
      const next = { ...prev };
      if (!targetField) {
        delete next[rawColumn];
      } else {
        next[rawColumn] = targetField;
      }
      return next;
    });
  };

  // Check if required columns are satisfied in CSV custom mapping
  const mappedCsvTargetFields = new Set(Object.values(customMapping));
  const hasExternalRef = mappedCsvTargetFields.has("external_reference");
  const hasCustomerRef = mappedCsvTargetFields.has("customer_reference");
  const hasDate = mappedCsvTargetFields.has("service_date");
  const hasFinancial = mappedCsvTargetFields.has("amount") || (mappedCsvTargetFields.has("quantity") && mappedCsvTargetFields.has("rate"));
  const isCsvTemplateValid = hasExternalRef && hasCustomerRef && hasDate && hasFinancial;

  const handleCommitBatch = async () => {
    if (!previewData || !previewData.sample_records) return;
    try {
      setCommitLoading(true);
      const res = await api.commitBatch(recordType, previewData.sample_records);
      setCommitMessage(`Successfully imported ${res.imported_count} records into your operations database (${res.skipped_duplicates_count} duplicates skipped).`);
      setPreviewData(null);
      setSelectedFile(null);
      onRefresh();
    } catch (err: any) {
      alert(`Commit failed: ${err.message}`);
    } finally {
      setCommitLoading(false);
    }
  };

  // --- DB Connector Handlers ---
  const handleTestDbConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setDbConnecting(true);
      setDbNotice(null);
      const res = await api.testDatabaseConnection({
        system_type: dbSystem,
        host: dbHost,
        port: dbPort,
        database_name: dbName,
        username: dbUser,
        password: dbPassword,
      });
      setDbConnected(true);
      setAvailableTables(res.available_tables);
      if (res.available_tables.length > 0) {
        setSelectedTable(res.available_tables[0]);
        // Auto preview first table
        handleFetchTablePreview(res.available_tables[0]);
      }
      setDbNotice(`Connected successfully to ${dbSystem.toUpperCase()} database! Found ${res.available_tables.length} tables.`);
    } catch (err: any) {
      alert(`Database connection test failed: ${err.message}`);
    } finally {
      setDbConnecting(false);
    }
  };

  const handleFetchTablePreview = async (tableName: string) => {
    try {
      setTablePreviewLoading(true);
      const res = await api.previewDatabaseTable({
        system_type: dbSystem,
        table_name: tableName,
      });
      setTablePreview(res);
      setDbMapping(res.inferred_mapping || {});
      
      // Auto-set record type based on table name
      if (tableName.includes("ticket")) setDbImportRecordType("service_ticket");
      else if (tableName.includes("billing") || tableName.includes("invoice")) setDbImportRecordType("invoice");
      else if (tableName.includes("manifest") || tableName.includes("scale")) setDbImportRecordType("load_record");
    } catch (err: any) {
      alert(`Failed to preview table: ${err.message}`);
    } finally {
      setTablePreviewLoading(false);
    }
  };

  const handleUpdateDbMapping = (dbCol: string, targetField: string) => {
    setDbMapping((prev) => {
      const next = { ...prev };
      if (!targetField) delete next[dbCol];
      else next[dbCol] = targetField;
      return next;
    });
  };

  // Check if required columns are satisfied in DB mapping
  const mappedDbTargetFields = new Set(Object.values(dbMapping));
  const hasDbExtRef = mappedDbTargetFields.has("external_reference");
  const hasDbCustRef = mappedDbTargetFields.has("customer_reference");
  const isDbTemplateValid = hasDbExtRef && hasDbCustRef;

  const handleImportFromDb = async () => {
    if (!tablePreview) return;
    try {
      setDbImportLoading(true);
      const res = await api.importFromDatabase({
        system_type: dbSystem,
        table_name: selectedTable,
        record_type: dbImportRecordType,
        column_mapping: dbMapping,
        rows: tablePreview.sample_rows,
      });
      setCommitMessage(`Successfully imported ${res.imported_count} records directly from table "${selectedTable}"!`);
      setTablePreview(null);
      setDbConnected(false);
      setActiveTab("csv");
      onRefresh();
    } catch (err: any) {
      alert(`Import failed: ${err.message}`);
    } finally {
      setDbImportLoading(false);
    }
  };

  // --- PDF Handler ---
  const handlePdfUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfFile) return;
    try {
      setPdfUploading(true);
      await api.uploadDocument(pdfFile, "invoice_pdf");
      setPdfFile(null);
      onRefresh();
      alert("Document uploaded and processed successfully via Document AI extraction adapter!");
    } catch (err: any) {
      alert(`PDF upload failed: ${err.message}`);
    } finally {
      setPdfUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Tab Navigation */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Operational Data & Document Ingestion
          </h2>
          <p className="text-xs text-slate-500">
            Import spreadsheets, connect your database, or download Excel format templates to match your tickets and bills.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-800">
          <button
            id="tab-csv-import"
            onClick={() => setActiveTab("csv")}
            className={`flex items-center space-x-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
              activeTab === "csv"
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
            }`}
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-blue-600" />
            <span>Excel / CSV Importer</span>
          </button>
          <button
            id="tab-db-connect"
            onClick={() => setActiveTab("database")}
            className={`flex items-center space-x-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
              activeTab === "database"
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
            }`}
          >
            <Database className="h-3.5 w-3.5 text-indigo-600" />
            <span>Connect Database / ERP</span>
          </button>
          <button
            id="tab-pdf-docs"
            onClick={() => setActiveTab("pdf")}
            className={`flex items-center space-x-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
              activeTab === "pdf"
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
            }`}
          >
            <FileText className="h-3.5 w-3.5 text-amber-600" />
            <span>PDF Documents ({documents.length})</span>
          </button>
        </div>
      </div>

      {commitMessage && (
        <div className="flex items-center space-x-2 rounded-lg bg-emerald-50 p-4 text-xs font-medium text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 animate-fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{commitMessage}</span>
        </div>
      )}

      {/* TAB 1: SPREADSHEET & CSV IMPORTER WITH TEMPLATE DOWNLOADS */}
      {activeTab === "csv" && (
        <div className="space-y-6">
          {/* Section: Download Standard Templates */}
          <div className="rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-white p-5 shadow-sm dark:border-blue-900/40 dark:bg-slate-900">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-semibold text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                  <Download className="w-3 h-3" />
                  Step 1: Download Format Templates
                </span>
                <h3 className="mt-1.5 text-sm font-bold text-slate-900 dark:text-white">
                  Get the standard format template for your data
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 max-w-2xl">
                  Download a pre-formatted spreadsheet with example rows. Fill it in with your customer tickets, scale receipts, or invoices, and upload it below. Our template checker verifies every column automatically.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0">
                <button
                  onClick={() => downloadTemplate("service_ticket", "excel")}
                  className="flex items-center space-x-1.5 rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-sm transition hover:bg-blue-50 dark:border-blue-700 dark:bg-slate-800 dark:text-blue-300 cursor-pointer"
                  title="Download Excel/CSV template for Service Tickets"
                >
                  <Download className="h-3.5 w-3.5 text-blue-600" />
                  <span>Service Tickets (.csv)</span>
                </button>
                <button
                  onClick={() => downloadTemplate("invoice", "excel")}
                  className="flex items-center space-x-1.5 rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-sm transition hover:bg-blue-50 dark:border-blue-700 dark:bg-slate-800 dark:text-blue-300 cursor-pointer"
                  title="Download Excel/CSV template for Customer Invoices"
                >
                  <Download className="h-3.5 w-3.5 text-blue-600" />
                  <span>Customer Invoices (.csv)</span>
                </button>
                <button
                  onClick={() => downloadTemplate("load_record", "excel")}
                  className="flex items-center space-x-1.5 rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-sm transition hover:bg-blue-50 dark:border-blue-700 dark:bg-slate-800 dark:text-blue-300 cursor-pointer"
                  title="Download Excel/CSV template for Scale Receipts"
                >
                  <Download className="h-3.5 w-3.5 text-blue-600" />
                  <span>Scale Receipts (.csv)</span>
                </button>
                <button
                  onClick={() => downloadTemplate("dispatch_record", "excel")}
                  className="flex items-center space-x-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
                  title="Download Excel/CSV template for Dispatch Logs"
                >
                  <Download className="h-3.5 w-3.5 text-slate-500" />
                  <span>Dispatch Logs (.csv)</span>
                </button>
              </div>
            </div>

            {/* Template Fields Explanations */}
            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-blue-100/80 pt-3 dark:border-blue-900/30 sm:grid-cols-4 text-[11px] text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span><strong>Ticket / Invoice #:</strong> Required</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span><strong>Customer Name:</strong> Required</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span><strong>Service Date:</strong> Required</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span><strong>Amount ($):</strong> Required (or Qty & Rate)</span>
              </div>
            </div>
          </div>

          {/* Section: Upload & Template Conformance Report */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Left Col: Upload File Form */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                Upload Filled Spreadsheet
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Select your filled CSV or Excel export to verify column matching.
              </p>

              <form onSubmit={handlePreviewCsv} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    What type of records are in this file?
                  </label>
                  <select
                    value={recordType}
                    onChange={(e) => setRecordType(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="service_ticket">Service Tickets (Roll-off, Compactor, Grease)</option>
                    <option value="invoice">Customer Invoices & Billing Lines</option>
                    <option value="load_record">Scale / Landfill Disposal Receipts</option>
                    <option value="dispatch_record">Dispatch Route Logs</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Select Spreadsheet File (.csv)
                  </label>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="mt-1 block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-950 dark:file:text-blue-300"
                  />
                  {selectedFile && (
                    <p className="mt-1 text-[11px] text-emerald-600 font-medium">
                      ✓ Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                </div>

                <button
                  id="btn-preview-csv"
                  type="submit"
                  disabled={!selectedFile || previewLoading}
                  className="w-full flex items-center justify-center space-x-1.5 rounded-lg bg-blue-600 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${previewLoading ? "animate-spin" : ""}`} />
                  <span>{previewLoading ? "Checking Format..." : "Check Template Match & Preview"}</span>
                </button>
              </form>

              <div className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-800">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Tip: Need demo data right away?
                </span>
                <p className="mt-1 text-[11px] text-slate-500">
                  Click any template button above to get a ready-to-use CSV with sample data, or click <strong>&quot;Load Demo Data&quot;</strong> in the top bar.
                </p>
              </div>
            </div>

            {/* Right 2 Cols: Template Conformance & Preview Report */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Template Conformance & Mapping Validator
                </h3>
                {previewData && (
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    isCsvTemplateValid 
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                      : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                  }`}>
                    {isCsvTemplateValid ? "✅ 100% Template Match" : "⚠️ Needs Column Assignment"}
                  </span>
                )}
              </div>

              {!previewData ? (
                <div className="rounded-lg border border-dashed border-slate-200 p-12 text-center text-xs text-slate-400 dark:border-slate-800">
                  <FileSpreadsheet className="mx-auto mb-2 h-9 w-9 text-slate-300" />
                  <p className="font-medium text-slate-600 dark:text-slate-400">No file uploaded yet</p>
                  <p className="mt-1 text-[11px]">Select a CSV file on the left to verify if its columns match our template.</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-lg bg-slate-50 p-3 text-center dark:bg-slate-800/50">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Total Rows</div>
                      <div className="text-lg font-bold text-slate-900 dark:text-white">{previewData.total_rows}</div>
                    </div>
                    <div className="rounded-lg bg-emerald-50 p-3 text-center dark:bg-emerald-950/50">
                      <div className="text-[10px] text-emerald-600 uppercase font-semibold">Ready to Import</div>
                      <div className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{previewData.valid_rows_count}</div>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3 text-center dark:bg-slate-800/50">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Columns Matched</div>
                      <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{Object.keys(customMapping).length} / {previewData.detected_columns?.length || 0}</div>
                    </div>
                  </div>

                  {/* Schema Conformance Checklist */}
                  <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/30">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-2 flex items-center justify-between">
                      <span>Column Alignment with Required Template</span>
                      <span className="text-[10px] text-slate-400 font-normal">Ensure all required fields are assigned</span>
                    </h4>

                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      {REQUIRED_TEMPLATE_COLUMNS.map((reqCol) => {
                        // Find which raw column is currently mapped to this target
                        const mappedRawCol = Object.entries(customMapping).find(([_, target]) => target === reqCol.field)?.[0] || "";
                        const isMapped = Boolean(mappedRawCol);

                        return (
                          <div 
                            key={reqCol.field}
                            className={`flex flex-col p-2.5 rounded-lg border text-xs transition ${
                              isMapped 
                                ? "bg-white border-emerald-200 dark:bg-slate-900 dark:border-emerald-900/50" 
                                : reqCol.required 
                                  ? "bg-amber-50/60 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/40"
                                  : "bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                {isMapped ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : reqCol.required ? (
                                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                                ) : (
                                  <span className="w-3.5 h-3.5 text-slate-400 text-center">•</span>
                                )}
                                {reqCol.label}
                              </span>
                              {reqCol.required && (
                                <span className="rounded bg-rose-50 px-1.5 py-0.2 text-[9px] font-bold text-rose-600 dark:bg-rose-950 dark:text-rose-400">
                                  Required
                                </span>
                              )}
                            </div>

                            <p className="mt-0.5 text-[10px] text-slate-400 truncate">{reqCol.description}</p>

                            {/* Dropdown to adjust column match */}
                            <div className="mt-2 flex items-center gap-1.5">
                              <span className="text-[10px] text-slate-400">Column:</span>
                              <select
                                value={mappedRawCol}
                                onChange={(e) => {
                                  const chosenCol = e.target.value;
                                  // Clear previous mapping for this target field
                                  Object.entries(customMapping).forEach(([raw, target]) => {
                                    if (target === reqCol.field) handleUpdateCsvMapping(raw, "");
                                  });
                                  if (chosenCol) {
                                    handleUpdateCsvMapping(chosenCol, reqCol.field);
                                  }
                                }}
                                className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                              >
                                <option value="">-- Not Assigned --</option>
                                {previewData.detected_columns?.map((col: string) => (
                                  <option key={col} value={col}>
                                    {col} {mappedRawCol === col ? "(Current Match)" : ""}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Sample Rows Preview */}
                  {previewData.sample_records && previewData.sample_records.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-2 flex items-center justify-between">
                        <span>Preview of Mapped Records (First {Math.min(previewData.sample_records.length, 3)} rows)</span>
                        <span className="text-[10px] text-slate-400">Ready for reconciliation</span>
                      </h4>

                      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 dark:bg-slate-800/80 text-[10px] font-semibold text-slate-500 uppercase">
                            <tr>
                              <th className="px-3 py-2">Reference #</th>
                              <th className="px-3 py-2">Customer</th>
                              <th className="px-3 py-2">Date</th>
                              <th className="px-3 py-2">Qty</th>
                              <th className="px-3 py-2">Rate</th>
                              <th className="px-3 py-2">Total Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[11px]">
                            {previewData.sample_records.slice(0, 3).map((row: any, i: number) => (
                              <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                                <td className="px-3 py-2 font-mono font-medium text-blue-600 dark:text-blue-400">{row.external_reference || "—"}</td>
                                <td className="px-3 py-2 text-slate-800 dark:text-slate-200 font-medium">{row.customer_reference || "—"}</td>
                                <td className="px-3 py-2 text-slate-500">{row.service_date ? new Date(row.service_date).toLocaleDateString() : "—"}</td>
                                <td className="px-3 py-2 text-slate-600">{row.quantity ? `${row.quantity} ${row.unit || ""}` : "—"}</td>
                                <td className="px-3 py-2 text-slate-600">{row.rate ? `$${Number(row.rate).toFixed(2)}` : "—"}</td>
                                <td className="px-3 py-2 font-bold text-slate-900 dark:text-white">{row.amount ? `$${Number(row.amount).toFixed(2)}` : "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Commit Action */}
                  <div className="flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
                    <div className="text-xs text-slate-500">
                      {isCsvTemplateValid ? (
                        <span className="text-emerald-600 font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Template format matched! Ready to import {previewData.valid_rows_count} records.
                        </span>
                      ) : (
                        <span className="text-amber-600 font-medium flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Please assign all required fields above to proceed with import.
                        </span>
                      )}
                    </div>

                    <button
                      onClick={handleCommitBatch}
                      disabled={commitLoading || previewData.valid_rows_count === 0 || !isCsvTemplateValid}
                      className="flex items-center space-x-1.5 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition disabled:opacity-50 cursor-pointer"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{commitLoading ? "Importing..." : `Import ${previewData.valid_rows_count} Records`}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CONNECT DATABASE OR ERP */}
      {activeTab === "database" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Left Col: Database Connection Configuration */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                Database & ERP Connection
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Connect your operational database or ERP system to sync tickets, invoices, and scale receipts directly.
              </p>

              <form onSubmit={handleTestDbConnection} className="space-y-3.5">
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    System / Database Type
                  </label>
                  <select
                    value={dbSystem}
                    onChange={(e) => setDbSystem(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="postgres">PostgreSQL Database</option>
                    <option value="mysql">MySQL / MariaDB</option>
                    <option value="mssql">Microsoft SQL Server</option>
                    <option value="softpak">Soft-Pak Waste ERP</option>
                    <option value="wasteworks">WasteWorks Landfill & Hauling ERP</option>
                    <option value="quickbooks">QuickBooks Enterprise / Online</option>
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      Host / Server Endpoint
                    </label>
                    <input
                      type="text"
                      value={dbHost}
                      onChange={(e) => setDbHost(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      Port
                    </label>
                    <input
                      type="number"
                      value={dbPort}
                      onChange={(e) => setDbPort(Number(e.target.value))}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Database / Company Name
                  </label>
                  <input
                    type="text"
                    value={dbName}
                    onChange={(e) => setDbName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      Username
                    </label>
                    <input
                      type="text"
                      value={dbUser}
                      onChange={(e) => setDbUser(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      Password / Key
                    </label>
                    <input
                      type="password"
                      value={dbPassword}
                      onChange={(e) => setDbPassword(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={dbConnecting}
                  className="w-full flex items-center justify-center space-x-1.5 rounded-lg bg-indigo-600 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition disabled:opacity-50 cursor-pointer"
                >
                  <Server className="h-3.5 w-3.5" />
                  <span>{dbConnecting ? "Testing Connection..." : "Test Connection & Fetch Tables"}</span>
                </button>
              </form>

              {dbNotice && (
                <div className="mt-4 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300">
                  {dbNotice}
                </div>
              )}
            </div>

            {/* Right 2 Cols: Table Selection, Schema Mapping & Preview */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                Database Schema & Template Matcher
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Select a table to align its columns with the Opsera AI template format before importing.
              </p>

              {!dbConnected ? (
                <div className="rounded-lg border border-dashed border-slate-200 p-12 text-center text-xs text-slate-400 dark:border-slate-800">
                  <Database className="mx-auto mb-2 h-9 w-9 text-slate-300" />
                  <p className="font-medium text-slate-600 dark:text-slate-400">Database not connected</p>
                  <p className="mt-1 text-[11px]">Click &quot;Test Connection &amp; Fetch Tables&quot; on the left to explore your tables and map columns.</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Table Selection Bar */}
                  <div className="flex flex-col gap-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <Table className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Select Database Table:
                      </span>
                      <select
                        value={selectedTable}
                        onChange={(e) => {
                          setSelectedTable(e.target.value);
                          handleFetchTablePreview(e.target.value);
                        }}
                        className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      >
                        {availableTables.map((tbl) => (
                          <option key={tbl} value={tbl}>{tbl}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Map As:
                      </span>
                      <select
                        value={dbImportRecordType}
                        onChange={(e) => setDbImportRecordType(e.target.value)}
                        className="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      >
                        <option value="service_ticket">Service Tickets</option>
                        <option value="invoice">Customer Invoices</option>
                        <option value="load_record">Scale Disposal Receipts</option>
                        <option value="dispatch_record">Dispatch Route Logs</option>
                      </select>
                    </div>
                  </div>

                  {/* Schema Mapping UI */}
                  {tablePreview && (
                    <div className="space-y-4">
                      <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/30">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                            Match Database Columns to Opsera AI Template
                          </h4>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isDbTemplateValid 
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" 
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          }`}>
                            {isDbTemplateValid ? "✅ Required Fields Aligned" : "⚠️ Assign Ticket # and Customer"}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {tablePreview.columns.map((col) => {
                            const currentTarget = dbMapping[col] || "";
                            return (
                              <div key={col} className="flex items-center justify-between rounded border border-slate-200 bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-900">
                                <span className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold truncate max-w-[120px]">
                                  {col}
                                </span>
                                <span className="text-slate-400 text-[10px]">&rarr;</span>
                                <select
                                  value={currentTarget}
                                  onChange={(e) => handleUpdateDbMapping(col, e.target.value)}
                                  className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                                >
                                  <option value="">-- Do Not Import --</option>
                                  <option value="external_reference">Ticket / Invoice # (Required)</option>
                                  <option value="customer_reference">Customer Name (Required)</option>
                                  <option value="service_date">Service Date (Required)</option>
                                  <option value="amount">Total Dollar Amount ($)</option>
                                  <option value="quantity">Quantity / Weight</option>
                                  <option value="rate">Rate per Unit ($)</option>
                                  <option value="status">Status</option>
                                </select>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Live Data Preview */}
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1.5">
                          Live Data Preview from &quot;{selectedTable}&quot; ({tablePreview.sample_rows.length} sample rows)
                        </h4>
                        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 dark:bg-slate-800/80 text-[10px] font-semibold text-slate-500 uppercase">
                              <tr>
                                {tablePreview.columns.slice(0, 6).map((col) => (
                                  <th key={col} className="px-3 py-2 font-mono">
                                    {col}
                                    {dbMapping[col] && (
                                      <span className="block text-indigo-600 dark:text-indigo-400 font-sans font-bold">
                                        &rarr; {dbMapping[col]}
                                      </span>
                                    )}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[11px]">
                              {tablePreview.sample_rows.map((row, i) => (
                                <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                                  {tablePreview.columns.slice(0, 6).map((col) => (
                                    <td key={col} className="px-3 py-2 text-slate-700 dark:text-slate-300">
                                      {String(row[col] ?? "—")}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
                        <span className="text-xs text-slate-500">
                          {isDbTemplateValid 
                            ? "✅ Schema format verified against Opsera AI template."
                            : "⚠️ Please assign columns for Ticket/Invoice # and Customer Name."}
                        </span>

                        <button
                          onClick={handleImportFromDb}
                          disabled={dbImportLoading || !isDbTemplateValid}
                          className="flex items-center space-x-1.5 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition disabled:opacity-50 cursor-pointer"
                        >
                          <Database className="h-4 w-4" />
                          <span>{dbImportLoading ? "Importing from DB..." : `Import Records from "${selectedTable}"`}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PDF INGESTION */}
      {activeTab === "pdf" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">
              Upload PDF Document
            </h3>

            <form onSubmit={handlePdfUpload} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Select Document File (.pdf)
                </label>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                  className="mt-1 block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-950 dark:file:text-indigo-300"
                />
              </div>

              <button
                type="submit"
                disabled={!pdfFile || pdfUploading}
                className="w-full flex items-center justify-center space-x-1.5 rounded-lg bg-indigo-600 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition disabled:opacity-50 cursor-pointer"
              >
                <UploadCloud className="h-3.5 w-3.5" />
                <span>{pdfUploading ? "Extracting Fields..." : "Upload & Run Document AI"}</span>
              </button>
            </form>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
              Ingested Documents Archive
            </h3>

            {documents.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center">No documents uploaded yet.</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {documents.map((doc) => (
                  <div key={doc.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white flex items-center space-x-2">
                        <FileText className="h-3.5 w-3.5 text-blue-600" />
                        <span>{doc.original_filename}</span>
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-400">
                        {(doc.file_size_bytes / 1024).toFixed(1)} KB • Status: <span className="text-emerald-600 font-medium">{doc.processing_status}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <a
                        href={`/api/documents/${doc.id}/download`}
                        className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
                        title="Download Original"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
