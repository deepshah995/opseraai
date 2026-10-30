from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class ApprovalDecisionRequest(BaseModel):
    decision: str = Field(pattern="^(approved|rejected|revision_requested)$")
    reviewer_comment: str | None = Field(None, max_length=2000)

class ApprovalResponse(BaseModel):
    id: str
    organization_id: str
    exception_id: str
    investigation_id: str
    requested_by: str | None = None
    reviewed_by: str | None = None
    decision: str
    reviewer_comment: str | None = None
    proposed_action_snapshot: dict[str, Any] | None = None
    created_at: datetime
    reviewed_at: datetime | None = None

    class Config:
        from_attributes = True
