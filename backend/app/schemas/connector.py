from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field

ConnectorType = Literal[
    "google_sheets",
    "google_docs",
    "erp_database",
    "slack_webhook",
    "email_digest",
]


class AppConnectorCreate(BaseModel):
    connector_type: ConnectorType
    name: str = Field(..., min_length=2, max_length=160)
    description: str = Field(default="", max_length=600)
    sync_direction: Literal["import", "export", "bidirectional"] = "bidirectional"
    external_url: str | None = Field(default=None, max_length=1024)
    config: dict[str, Any] = Field(default_factory=dict)
    credential_token: str | None = Field(default=None, max_length=4000)


class AppConnectorUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=160)
    description: str | None = Field(default=None, max_length=600)
    sync_direction: Literal["import", "export", "bidirectional"] | None = None
    status: Literal["connected", "ready", "paused"] | None = None
    external_url: str | None = Field(default=None, max_length=1024)
    config: dict[str, Any] | None = None
    credential_token: str | None = Field(default=None, max_length=4000)


class AppConnectorResponse(BaseModel):
    id: str
    organization_id: str
    connector_type: str
    name: str
    description: str
    sync_direction: str
    status: str
    external_url: str | None = None
    resource_id: str | None = None
    config: dict[str, Any]
    has_credentials: bool
    secret_preview: str | None = None
    last_synced_at: datetime | None = None
    records_synced: int
    last_sync_summary: dict[str, Any] | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ConnectorSyncRequest(BaseModel):
    mode: Literal["import", "export"] = "import"
    record_type: Literal["service_ticket", "invoice", "load_record", "dispatch_record"] = "service_ticket"
    csv_override: str | None = Field(default=None, max_length=500_000)
    use_live_fetch: bool = True
    document_title: str | None = Field(default=None, max_length=200)
