from datetime import UTC, datetime
from typing import Any

from backend.app.db.base import Base, TimestampMixin, generate_uuid
from sqlalchemy import JSON, DateTime, Float, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship


class Investigation(Base, TimestampMixin):
    __tablename__ = "investigations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    organization_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    exception_id: Mapped[str] = mapped_column(String(36), ForeignKey("exceptions.id", ondelete="CASCADE"), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="queued", index=True)  # queued, in_progress, awaiting_review, completed, failed
    workflow_version: Mapped[str] = mapped_column(String(50), nullable=False, default="v1.0")
    input_snapshot: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    findings: Mapped[str | None] = mapped_column(Text, nullable=True)
    evidence_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    proposed_resolution: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    error_details: Mapped[str | None] = mapped_column(Text, nullable=True)

    organization: Mapped["Organization"] = relationship("Organization", back_populates="investigations")
    exception: Mapped["Exception"] = relationship("Exception", back_populates="investigations")
    evidence_items: Mapped[list["Evidence"]] = relationship("Evidence", back_populates="investigation", cascade="all, delete-orphan")
    agent_runs: Mapped[list["AgentRun"]] = relationship("AgentRun", back_populates="investigation", cascade="all, delete-orphan")
    approvals: Mapped[list["Approval"]] = relationship("Approval", back_populates="investigation", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_investigations_org_status", "organization_id", "status"),
    )
