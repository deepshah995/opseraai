from datetime import datetime
from typing import Any

from pydantic import BaseModel


class EvidenceCreate(BaseModel):
    investigation_id: str
    source_type: str  # record, document
    source_record_id: str | None = None
    source_document_id: str | None = None
    evidence_reference: str
    excerpt: dict[str, Any] | None = None
    relevance_explanation: str

class EvidenceResponse(BaseModel):
    id: str
    organization_id: str
    investigation_id: str
    source_type: str
    source_record_id: str | None = None
    source_document_id: str | None = None
    evidence_reference: str
    excerpt: dict[str, Any] | None = None
    relevance_explanation: str
    created_at: datetime

    class Config:
        from_attributes = True
