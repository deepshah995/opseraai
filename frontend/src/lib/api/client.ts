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
    return this.request<AgentRunResult>("/agents/ops_beacon/report", {
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
    return this.request<AgentRunResult>("/agents/dispute_shield/resolve", {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  async chatWithAgent(agentId: string, message: string): Promise<AgentChatResponse> {
    return this.request<AgentChatResponse>(`/agents/${agentId}/chat`, {
      method: "POST",
      body: JSON.stringify({ message }),
    });
  }

  async chatWithMinion(agentId: string, message: string): Promise<AgentChatResponse> {
    return this.chatWithAgent(agentId, message);
  }

  async getResolutionAnalytics(timeframe: string = "Last 30 Days"): Promise<ResolutionAnalytics> {
    return this.request<ResolutionAnalytics>(`/agents/resolution-analytics?timeframe=${encodeURIComponent(timeframe)}`);
  }

  async resolveBatchExceptions(): Promise<BatchResolutionResponse> {
    return this.request<BatchResolutionResponse>("/agents/resolve-batch", {
      method: "POST",
    });
  }
}


export const api = new ApiClient();
