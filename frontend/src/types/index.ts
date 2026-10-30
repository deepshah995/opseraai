export type UserRole = "admin" | "operations_manager" | "reviewer";

export interface User {
  id: string;
  organization_id: string;
  email: string;
  display_name: string;
  role: UserRole;
}

export interface Organization {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface SourceDocument {
  id: string;
  organization_id: string;
  uploaded_by?: string;
  document_type: string;
  original_filename: string;
  content_type: string;
  file_size_bytes: number;
  processing_status: "pending" | "processing" | "completed" | "failed";
  extracted_text?: string;
  extraction_metadata?: {
    fields?: Record<string, any>;
    flagged_for_review?: string[];
    extraction_confidence?: number;
    error?: string;
  };
  created_at: string;
  updated_at: string;
}

export type RecordType = "invoice" | "service_ticket" | "dispatch_record" | "load_record" | "customer_account";

export interface OperationalRecord {
  id: string;
  organization_id: string;
  record_type: RecordType;
  external_reference: string;
  customer_reference: string;
  service_date?: string;
  amount?: number;
  quantity?: number;
  unit?: string;
  rate?: number;
  status: string;
  source_document_id?: string;
  normalized_data?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export type ExceptionType =
  | "rate_mismatch"
  | "quantity_mismatch"
  | "unbilled_job"
  | "dispatch_discrepancy"
  | "duplicate_billing";

export type ExceptionSeverity = "low" | "medium" | "high" | "critical";

export type ExceptionStatus =
  | "open"
  | "investigating"
  | "awaiting_approval"
  | "approved"
  | "rejected"
  | "resolved"
  | "dismissed";

export interface OperationalException {
  id: string;
  organization_id: string;
  exception_type: ExceptionType;
  title: string;
  description: string;
  severity: ExceptionSeverity;
  status: ExceptionStatus;
  confidence?: number;
  related_record_ids: string[];
  discrepancy_amount?: number;
  assigned_to?: string;
  detected_at: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface GroundedEvidence {
  id: string;
  organization_id: string;
  investigation_id: string;
  source_type: "record" | "document";
  source_record_id?: string;
  source_document_id?: string;
  evidence_reference: string;
  excerpt?: Record<string, any>;
  relevance_explanation: string;
  created_at: string;
}

export interface ProposedResolution {
  action_type: "credit_memo" | "rebill_invoice" | "dispatch_adjustment" | "dismiss_no_fault";
  recommended_action: string;
  proposed_amount?: number;
  customer_reference?: string;
  affected_reference?: string;
  explanation: string;
}

export interface InvestigationDetail {
  id: string;
  organization_id: string;
  exception_id: string;
  status: "queued" | "in_progress" | "awaiting_review" | "completed" | "failed";
  workflow_version: string;
  findings?: string;
  evidence_summary?: string;
  proposed_resolution?: ProposedResolution;
  confidence?: number;
  started_at: string;
  completed_at?: string;
  error_details?: string;
  evidence_items: GroundedEvidence[];
  related_records: OperationalRecord[];
  pending_approval_id?: string;
}

export interface Approval {
  id: string;
  organization_id: string;
  exception_id: string;
  investigation_id: string;
  requested_by?: string;
  reviewed_by?: string;
  decision: "pending" | "approved" | "rejected" | "revision_requested";
  reviewer_comment?: string;
  proposed_action_snapshot?: ProposedResolution;
  created_at: string;
  reviewed_at?: string;
}

export interface AuditEvent {
  id: string;
  organization_id: string;
  actor_type: "user" | "agent" | "system";
  actor_id?: string;
  action: string;
  resource_type: string;
  resource_id: string;
  action_metadata?: Record<string, any>;
  created_at: string;
}

export interface AnalyticsSummary {
  total_records: number;
  total_exceptions: number;
  open_exceptions: number;
  awaiting_approval: number;
  resolved_exceptions: number;
  at_risk_discrepancy_amount: number;
  average_investigation_confidence: number;
  pending_human_approvals: number;
  reconciliation_health_pct: number;
}

export interface ExceptionStats {
  total_exceptions: number;
  open_count: number;
  investigating_count: number;
  awaiting_approval_count: number;
  resolved_count: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  total_discrepancy_amount: number;
  by_type: Record<string, number>;
}

export interface AgentDefinition {
  id: string;
  name: string;
  code_name: string;
  title: string;
  tagline: string;
  category: string;
  color_theme: "emerald" | "blue" | "amber" | "purple" | "rose" | string;
  icon_name: string;
  avatar_url: string;
  specialization: string;
  reconciles_records: string[];
  exception_types_handled: string[];
  key_metrics: {
    accuracy_rate: string;
    avg_resolution_time?: string;
    avg_generation_time?: string;
    avg_draft_time?: string;
    recovered_leakage_mtd?: string;
    schedule_divergence_caught?: string;
    revenue_leakage_prevented?: string;
    kpi_categories_analyzed?: string;
    dispute_retention_rate?: string;
    active_status: string;
  };
  capabilities: string[];
  simple_summary: string;
  active_issues_count?: number;
  full_tutorial?: Array<{
    step: number;
    title: string;
    explanation: string;
    papers_compared: string[];
  }>;
  sample_scenarios?: Array<{
    scenario_id: string;
    title: string;
    customer: string;
    [key: string]: any;
  }>;
  agent_profile?: AgentStudioProfile;
  minion_profile?: AgentStudioProfile;
}

export interface AgentStudioProfile {
  agent_name?: string;
  robot_name?: string;
  name?: string;
  title: string;
  color: string;
  catchphrase: string;
  current_live_action: string;
  linked_systems: string[];
  personality: string;
  emojis: string;
}

export interface AgentChatResponse {
  agent_id: string;
  agent_name: string;
  robot_nickname?: string;
  avatar_mood: string;
  funny_action: string;
  response: string;
  linked_systems_active: string[];
}

export type MinionProfile = AgentStudioProfile;
export type MinionChatResponse = AgentChatResponse;


export interface AgentRunResult {
  agent_id: string;
  agent_name: string;
  code_name: string;
  status: string;
  confidence_score?: number;
  reasoning_steps?: string[];
  root_cause_analysis?: string;
  divergences_identified?: string[];
  evidence_citations?: Array<{
    reference: string;
    record_type: string;
    details: string;
  }>;
  variance_breakdown?: Record<string, any>;
  proposed_resolution?: ProposedResolution;
  verdict?: string;
  claim_is_valid?: boolean;
  customer_resolution_letter?: string;
  verified_evidence_packet?: Array<{
    title: string;
    record_type: string;
    details: string;
  }>;
  health_score_pct?: number;
  executive_summary?: string;
  kpis?: Record<string, any>;
  action_items?: string[];
  discrepancy_distribution?: Record<string, number>;
  top_accounts_audited?: Array<{ customer: string; volume_usd: number }>;
}

export interface AgentTutorial {
  agent_id: string;
  agent_name: string;
  code_name: string;
  title: string;
  tagline: string;
  color_theme: string;
  icon_name: string;
  simple_summary: string;
  tutorial_steps: Array<{
    step: number;
    title: string;
    explanation: string;
    papers_compared: string[];
  }>;
  sample_scenarios: Array<{
    scenario_id: string;
    title: string;
    customer: string;
    [key: string]: any;
  }>;
}

export interface AgentPerformanceDetail {
  name: string;
  code_name: string;
  role: string;
  color: string;
  icon: string;
  handled_count?: number;
  resolved_count?: number;
  recovered_usd?: number;
  at_risk_usd?: number;
  avg_confidence?: number;
  status: string;
  health_score?: number;
  claims_resolved?: number;
  amount_defended?: number;
}

export interface FacilityResolution {
  name: string;
  records_audited: number;
  exceptions_resolved: number;
  recovered_usd: number;
  status: string;
}

export interface ResolutionStreamItem {
  exception_id: string;
  title: string;
  exception_type: string;
  severity: string;
  status: string;
  amount: number;
  agent_name: string;
  agent_code: string;
  agent_color: string;
  detected_at: string;
  resolved_at?: string | null;
  action_taken: string;
}

export interface ResolutionAnalytics {
  timeframe: string;
  kpis: {
    total_exceptions: number;
    resolved_count: number;
    open_count: number;
    awaiting_approval_count: number;
    resolution_rate_pct: number;
    total_leakage_usd: number;
    recovered_usd: number;
    at_risk_usd: number;
    avg_resolution_cycle_seconds: number;
    manual_benchmark_days: number;
    efficiency_gain_pct: number;
  };
  agent_performance: Record<string, AgentPerformanceDetail>;
  by_type: Record<string, number>;
  facilities: FacilityResolution[];
  recent_stream: ResolutionStreamItem[];
}

export interface BatchResolutionResponse {
  processed_count: number;
  auto_resolved: number;
  awaiting_approval: number;
  total_recovered_usd: number;
  resolutions: Array<{
    exception_id: string;
    title: string;
    agent_name: string;
    agent_id: string;
    discrepancy_amount: number;
    status: string;
    verdict: string;
    action_desc: string;
  }>;
}


