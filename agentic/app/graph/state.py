from typing import Any, TypedDict


class GroundedEvidenceItem(TypedDict):
    source_type: str  # 'record' or 'document'
    source_record_id: str | None
    source_document_id: str | None
    evidence_reference: str
    excerpt: dict[str, Any]
    relevance_explanation: str

class ProposedResolution(TypedDict):
    action_type: str  # 'credit_memo', 'rebill_invoice', 'dispatch_adjustment', 'dismiss_no_fault'
    recommended_action: str
    proposed_amount: float | None
    customer_reference: str | None
    affected_reference: str | None
    explanation: str

class InvestigationState(TypedDict):
    organization_id: str
    exception_id: str
    exception_data: dict[str, Any]
    records: list[dict[str, Any]]
    documents: list[dict[str, Any]]
    reconciliation_math: dict[str, Any]
    grounded_evidence: list[GroundedEvidenceItem]
    root_cause_analysis: str
    proposed_resolution: ProposedResolution | None
    confidence: float
    requires_human_approval: bool
    status: str
    step_history: list[str]
    error: str | None
