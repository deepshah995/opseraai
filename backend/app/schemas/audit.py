from datetime import datetime
from typing import Any

from pydantic import BaseModel


class AuditEventResponse(BaseModel):
    id: str
    organization_id: str
    actor_type: str
    actor_id: str | None = None
    action: str
    resource_type: str
    resource_id: str
    action_metadata: dict[str, Any] | None = None
    created_at: datetime

    class Config:
        from_attributes = True
