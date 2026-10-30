from datetime import UTC, datetime

from backend.app.db.base import Base, TimestampMixin, generate_uuid
from sqlalchemy import JSON, DateTime, Float, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship


class Exception(Base, TimestampMixin):
    __tablename__ = "exceptions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    organization_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    exception_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)  # rate_mismatch, quantity_mismatch, unbilled_job, dispatch_discrepancy, duplicate_billing
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[str] = mapped_column(String(20), nullable=False, default="medium", index=True)  # low, medium, high, critical
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="open", index=True)  # open, investigating, awaiting_approval, approved, rejected, resolved, dismissed
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    related_record_ids: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    discrepancy_amount: Mapped[float | None] = mapped_column(Float, nullable=True)
    assigned_to: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    detected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    organization: Mapped["Organization"] = relationship("Organization", back_populates="exceptions")
    investigations: Mapped[list["Investigation"]] = relationship("Investigation", back_populates="exception", cascade="all, delete-orphan")
    approvals: Mapped[list["Approval"]] = relationship("Approval", back_populates="exception", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_exceptions_org_status_sev", "organization_id", "status", "severity"),
    )
