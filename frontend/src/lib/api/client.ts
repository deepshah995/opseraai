import {
  User,
  Organization,
  SourceDocument,
  OperationalRecord,
  OperationalException,
  InvestigationDetail,
  Approval,
  AuditEvent,
  AnalyticsSummary,
  ExceptionStats,
  AgentDefinition,
  AgentRunResult,
  AgentTutorial,
  AgentChatResponse,
  MinionChatResponse,
  ResolutionAnalytics,
  BatchResolutionResponse,
  AppConnector,
  SwarmWorkflow,
  SwarmRun,
  WorkflowNode,
  WorkflowEdge,
} from "@/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

class ApiClient {
  private token: string | null = null;
  private currentOrgId: string = "apex-industrial-tenant-01";

  setToken(token: string) {
    this.token = token;
  }

  setOrganizationId(orgId: string) {
    this.currentOrgId = orgId;
  }

  getOrganizationId(): string {
    return this.currentOrgId;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${BASE_URL}${endpoint}`;
    const headers: Record<string, string> = {
      "X-Tenant-ID": this.currentOrgId,
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }

    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(errorBody.detail || `HTTP ${res.status}: ${res.statusText}`);
    }
    return res.json();
  }

  // --- Analytics ---
  async getAnalyticsSummary(): Promise<AnalyticsSummary> {
    return this.request<AnalyticsSummary>("/analytics/summary");
  }

  // --- Exceptions ---
  async listExceptions(filters?: { status?: string; severity?: string; type?: string }): Promise<OperationalException[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append("status", filters.status);
    if (filters?.severity) params.append("severity", filters.severity);
    if (filters?.type) params.append("exception_type", filters.type);
    const qs = params.toString() ? `?${params.toString()}` : "";
    return this.request<OperationalException[]>(`/exceptions${qs}`);
  }

  async getExceptionStats(): Promise<ExceptionStats> {
    return this.request<ExceptionStats>("/exceptions/stats");
  }

  async runExceptionDetection(): Promise<OperationalException[]> {
    return this.request<OperationalException[]>("/exceptions/detect", { method: "POST" });
  }

  async getException(id: string): Promise<OperationalException> {
    return this.request<OperationalException>(`/exceptions/${id}`);
  }

  async updateException(id: string, updates: { status?: string; severity?: string; assigned_to?: string }): Promise<OperationalException> {
    return this.request<OperationalException>(`/exceptions/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
  }

  // --- Investigations ---
  async triggerInvestigation(exceptionId: string, notes?: string): Promise<InvestigationDetail> {
    return this.request<InvestigationDetail>("/investigations/trigger", {
      method: "POST",
      body: JSON.stringify({ exception_id: exceptionId, user_notes: notes }),
    });
  }

  async getInvestigation(id: string): Promise<InvestigationDetail> {
    return this.request<InvestigationDetail>(`/investigations/${id}`);
  }

  async getInvestigationByException(exceptionId: string): Promise<InvestigationDetail> {
    return this.request<InvestigationDetail>(`/investigations/by-exception/${exceptionId}`);
  }

  // --- Approvals ---
  async listApprovals(decision?: string): Promise<Approval[]> {
    const qs = decision ? `?decision=${decision}` : "";
    return this.request<Approval[]>(`/approvals${qs}`);
  }

  async reviewApproval(approvalId: string, decision: "approved" | "rejected" | "revision_requested", comment?: string): Promise<Approval> {
    return this.request<Approval>(`/approvals/${approvalId}/review`, {
      method: "POST",
      body: JSON.stringify({ decision, reviewer_comment: comment }),
    });
  }

  // --- Records & Ingestion ---
  async listRecords(filters?: { record_type?: string; customer?: string; search?: string }): Promise<OperationalRecord[]> {
    const params = new URLSearchParams();
    if (filters?.record_type) params.append("record_type", filters.record_type);
    if (filters?.customer) params.append("customer", filters.customer);
    if (filters?.search) params.append("search", filters.search);
    const qs = params.toString() ? `?${params.toString()}` : "";
    return this.request<OperationalRecord[]>(`/records${qs}`);
  }

  async previewCsv(file: File, recordType: string = "service_ticket"): Promise<any> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("record_type", recordType);
    return this.request("/records/preview-csv", {
      method: "POST",
      body: formData,
    });
  }

  async commitBatch(recordType: string, records: any[]): Promise<any> {
    return this.request("/records/commit-batch", {
      method: "POST",
      body: JSON.stringify({ record_type: recordType, records }),
    });
  }

  async seedDemoData(reset: boolean = true): Promise<any> {
    return this.request(`/records/seed-demo?reset_existing=${reset}`, { method: "POST" });
  }

  // --- Database / ERP Integration ---
  async testDatabaseConnection(params: {
    system_type: string;
    host?: string;
    port?: number;
    database_name?: string;
    username?: string;
    password?: string;
    use_ssl?: boolean;
  }): Promise<{ success: boolean; message: string; available_tables: string[] }> {
    return this.request("/records/db/test-connection", {
      method: "POST",
      body: JSON.stringify({
        system_type: params.system_type,
        host: params.host || "localhost",
        port: params.port || 5432,
        database_name: params.database_name || "operations_db",
        username: params.username || "ops_user",
        password: params.password || "",
        use_ssl: params.use_ssl || false,
      }),
    });
  }

  async previewDatabaseTable(params: {
    system_type: string;
    table_name: string;
  }): Promise<{
    table_name: string;
    columns: string[];
    sample_rows: any[];
    inferred_mapping: Record<string, string>;
  }> {
    return this.request("/records/db/preview-table", {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  async importFromDatabase(params: {
    system_type: string;
    table_name: string;
    record_type: string;
    column_mapping: Record<string, string>;
    rows?: any[];
  }): Promise<any> {
    return this.request("/records/db/import", {
      method: "POST",
      body: JSON.stringify(params),
    });
  }


  // --- Documents ---
  async listDocuments(): Promise<SourceDocument[]> {
    return this.request<SourceDocument[]>("/documents");
  }

  async uploadDocument(file: File, documentType: string = "invoice_pdf"): Promise<SourceDocument> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("document_type", documentType);
    return this.request<SourceDocument>("/documents/upload", {
      method: "POST",
      body: formData,
    });
  }

  // --- Audit & Orgs ---
  async listAuditEvents(): Promise<AuditEvent[]> {
    return this.request<AuditEvent[]>("/audit");
  }

  async listOrganizations(): Promise<Organization[]> {
    return this.request<Organization[]>("/organizations");
  }

  // --- Specialized AI Agents Fleet ---
  async listAgents(): Promise<AgentDefinition[]> {
    return this.request<AgentDefinition[]>("/agents");
  }

  async getAgentTutorials(): Promise<AgentTutorial[]> {
    return this.request<AgentTutorial[]>("/agents/tutorials");
  }

  async getAgentDetail(agentId: string): Promise<AgentDefinition> {
    return this.request<AgentDefinition>(`/agents/${agentId}`);
  }

  async runAgent(
    agentId: string,
    params: {
      exception_id?: string;
      scenario_id?: string;
      custom_params?: Record<string, any>;
    }
  ): Promise<AgentRunResult> {
    return this.request<AgentRunResult>(`/agents/${agentId}/run`, {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  async generateOpsReport(timeframe: string = "Last 30 Days"): Promise<AgentRunResult> {
    return this.request<AgentRunResult>("/agents/plant_beacon/report", {
      method: "POST",
      body: JSON.stringify({ timeframe }),
    });
  }

  async resolveDispute(params: {
    customer_name: string;
    dispute_claim: string;
    disputed_invoice_ref: string;
    disputed_amount: number;
    exception_id?: string;
  }): Promise<AgentRunResult> {
    return this.request<AgentRunResult>("/agents/quality_shield/resolve", {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  async chatWithAgent(
    agentId: string,
    message: string,
    history: { role: "user" | "assistant"; content: string }[] = [],
  ): Promise<AgentChatResponse> {
    return this.request<AgentChatResponse>(`/agents/${agentId}/chat`, {
      method: "POST",
      body: JSON.stringify({ message, history }),
    });
  }

  async chatWithMinion(
    agentId: string,
    message: string,
    history: { role: "user" | "assistant"; content: string }[] = [],
  ): Promise<AgentChatResponse> {
    return this.chatWithAgent(agentId, message, history);
  }

  async getResolutionAnalytics(timeframe: string = "Last 30 Days"): Promise<ResolutionAnalytics> {
    return this.request<ResolutionAnalytics>(`/agents/resolution-analytics?timeframe=${encodeURIComponent(timeframe)}`);
  }

  async getLLMStatus(): Promise<{ provider: string; model: string; configured: boolean; badge: string; sdk?: string }> {
    return this.request<{ provider: string; model: string; configured: boolean; badge: string; sdk?: string }>("/agents/llm-status");
  }

  async resolveBatchExceptions(): Promise<BatchResolutionResponse> {
    return this.request<BatchResolutionResponse>("/agents/resolve-batch", {
      method: "POST",
    });
  }

  // --- Swarm Orchestration Workflows ---
  async listWorkflows(): Promise<SwarmWorkflow[]> {
    return this.request<SwarmWorkflow[]>("/workflows");
  }

  async createWorkflow(params: {
    name: string;
    description?: string;
    category?: string;
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
    estimated_cost_savings_usd?: number;
    estimated_hours_saved_monthly?: number;
  }): Promise<SwarmWorkflow> {
    return this.request<SwarmWorkflow>("/workflows", {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  async updateWorkflow(
    workflowId: string,
    params: {
      name?: string;
      description?: string;
      category?: string;
      is_active?: boolean;
      nodes?: WorkflowNode[];
      edges?: WorkflowEdge[];
      estimated_cost_savings_usd?: number;
      estimated_hours_saved_monthly?: number;
    },
  ): Promise<SwarmWorkflow> {
    return this.request<SwarmWorkflow>(`/workflows/${workflowId}`, {
      method: "PUT",
      body: JSON.stringify(params),
    });
  }

  async deleteWorkflow(workflowId: string): Promise<void> {
    return this.request<void>(`/workflows/${workflowId}`, {
      method: "DELETE",
    });
  }

  async runWorkflow(workflowId: string, dryRun: boolean = false): Promise<SwarmRun> {
    return this.request<SwarmRun>(`/workflows/${workflowId}/run`, {
      method: "POST",
      body: JSON.stringify({ dry_run: dryRun }),
    });
  }

  async listWorkflowRuns(workflowId: string): Promise<SwarmRun[]> {
    return this.request<SwarmRun[]>(`/workflows/${workflowId}/runs`);
  }

  // --- App Connectors (Google Sheets, Google Docs, ERP, Slack) ---
  async listConnectors(): Promise<AppConnector[]> {
    return this.request<AppConnector[]>("/connectors");
  }

  async createConnector(params: {
    connector_type: string;
    name: string;
    description?: string;
    sync_direction?: "import" | "export" | "bidirectional";
    external_url?: string;
    config?: Record<string, any>;
    credential_token?: string;
  }): Promise<AppConnector> {
    return this.request<AppConnector>("/connectors", {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  async updateConnector(
    connectorId: string,
    params: {
      name?: string;
      description?: string;
      sync_direction?: "import" | "export" | "bidirectional";
      status?: "connected" | "ready" | "paused";
      external_url?: string;
      config?: Record<string, any>;
      credential_token?: string;
    },
  ): Promise<AppConnector> {
    return this.request<AppConnector>(`/connectors/${connectorId}`, {
      method: "PATCH",
      body: JSON.stringify(params),
    });
  }

  async deleteConnector(connectorId: string): Promise<void> {
    return this.request<void>(`/connectors/${connectorId}`, {
      method: "DELETE",
    });
  }

  async syncConnector(
    connectorId: string,
    params: {
      mode: "import" | "export";
      record_type?: "service_ticket" | "invoice" | "load_record" | "dispatch_record";
      csv_override?: string;
      use_live_fetch?: boolean;
      document_title?: string;
    },
  ): Promise<{ connector: AppConnector; sync_result: Record<string, any> }> {
    return this.request<{ connector: AppConnector; sync_result: Record<string, any> }>(
      `/connectors/${connectorId}/sync`,
      {
        method: "POST",
        body: JSON.stringify(params),
      },
    );
  }

  async downloadConnectorExport(connectorId: string, filename: string): Promise<void> {
    const headers: Record<string, string> = {
      "X-Tenant-ID": this.currentOrgId,
    };
    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }
    const res = await fetch(`${BASE_URL}/connectors/${connectorId}/export`, { headers });
    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(errorBody.detail || `Download failed (${res.status})`);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}


export const api = new ApiClient();
