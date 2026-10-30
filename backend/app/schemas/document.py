from datetime import datetime
from typing import Any

from pydantic import BaseModel


class DocumentResponse(BaseModel):
    id: str
    organization_id: str
    uploaded_by: str | None = None
    document_type: str
    original_filename: str
    content_type: str
    file_size_bytes: int
    processing_status: str
    extracted_text: str | None = None
    extraction_metadata: dict[str, Any] | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class DocumentExtractionResult(BaseModel):
    document_id: str
    status: str
    extracted_fields: dict[str, Any]
    confidence_score: float
    raw_text_snippet: str | None = None
