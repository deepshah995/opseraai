from datetime import UTC, datetime

from backend.app.db.base import Base, generate_uuid
from sqlalchemy import DateTime, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship


class AgentRun(Base):
    __tablename__ = "agent_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    organization_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    investigation_id: Mapped[str] = mapped_column(String(36), ForeignKey("investigations.id", ondelete="CASCADE"), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="running")  # running, completed, failed
    attempt_number: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    workflow_version: Mapped[str] = mapped_column(String(50), nullable=False, default="v1.0")
    model_identifier: Mapped[str] = mapped_column(String(100), nullable=False, default="gemini-1.5-pro")
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    error_category: Mapped[str | None] = mapped_column(String(100), nullable=True)

    investigation: Mapped["Investigation"] = relationship("Investigation", back_populates="agent_runs")

    __table_args__ = (
        Index("ix_agent_runs_org_inv", "organization_id", "investigation_id"),
    )
