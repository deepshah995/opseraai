from datetime import datetime
from typing import Any

from backend.app.schemas.evidence import EvidenceResponse
from backend.app.schemas.record import OperationalRecordResponse
from pydantic import BaseModel


class InvestigationTriggerRequest(BaseModel):
    exception_id: str
    user_notes: str | None = None
    force_fresh: bool = False

class InvestigationResponse(BaseModel):
    id: str
    organization_id: str
    exception_id: str
    status: str
    workflow_version: str
    findings: str | None = None
    evidence_summary: str | None = None
    proposed_resolution: dict[str, Any] | None = None
    confidence: float | None = None
    started_at: datetime
    completed_at: datetime | None = None
    error_details: str | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class InvestigationDetailResponse(InvestigationResponse):
    evidence_items: list[EvidenceResponse] = []
    related_records: list[OperationalRecordResponse] = []
    pending_approval_id: str | None = None
