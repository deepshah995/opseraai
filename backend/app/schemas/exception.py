from datetime import datetime

from pydantic import BaseModel, Field


class ExceptionCreate(BaseModel):
    exception_type: str = Field(pattern="^(rate_mismatch|quantity_mismatch|unbilled_job|dispatch_discrepancy|duplicate_billing)$")
    title: str = Field(min_length=3, max_length=255)
    description: str
    severity: str = Field(default="medium", pattern="^(low|medium|high|critical)$")
    status: str = Field(default="open", pattern="^(open|investigating|awaiting_approval|approved|rejected|resolved|dismissed)$")
    confidence: float | None = None
    related_record_ids: list[str] = Field(default_factory=list)
    discrepancy_amount: float | None = None
    assigned_to: str | None = None

class ExceptionUpdate(BaseModel):
    status: str | None = Field(None, pattern="^(open|investigating|awaiting_approval|approved|rejected|resolved|dismissed)$")
    severity: str | None = Field(None, pattern="^(low|medium|high|critical)$")
    assigned_to: str | None = None
    title: str | None = None
    description: str | None = None

class ExceptionResponse(BaseModel):
    id: str
    organization_id: str
    exception_type: str
    title: str
    description: str
    severity: str
    status: str
    confidence: float | None = None
    related_record_ids: list[str]
    discrepancy_amount: float | None = None
    assigned_to: str | None = None
    detected_at: datetime
    resolved_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ExceptionStats(BaseModel):
    total_exceptions: int
    open_count: int
    investigating_count: int
    awaiting_approval_count: int
    resolved_count: int
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    total_discrepancy_amount: float
    by_type: dict[str, int]
