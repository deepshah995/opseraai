from datetime import datetime
from typing import Any

from backend.app.db.base import Base, TimestampMixin, generate_uuid
from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship


class AppConnector(Base, TimestampMixin):
    __tablename__ = "app_connectors"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    organization_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    connector_type: Mapped[str] = mapped_column(
        String(50), nullable=False, index=True
    )  # google_sheets, google_docs, erp_database, slack_webhook, email_digest
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    sync_direction: Mapped[str] = mapped_column(
        String(30), nullable=False, default="bidirectional"
    )  # import, export, bidirectional
    status: Mapped[str] = mapped_column(
        String(30), nullable=False, default="ready"
    )  # connected, ready, error, paused
    external_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    resource_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    config: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    has_credentials: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    secret_preview: Mapped[str | None] = mapped_column(String(64), nullable=True)
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    records_synced: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_sync_summary: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)

    organization: Mapped["Organization"] = relationship("Organization", back_populates="connectors")

    __table_args__ = (Index("ix_app_connectors_org_type", "organization_id", "connector_type"),)
