from datetime import UTC, datetime
from typing import Any, Optional

from backend.app.db.base import Base, generate_uuid
from sqlalchemy import JSON, DateTime, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship


class Approval(Base):
    __tablename__ = "approvals"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    organization_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    exception_id: Mapped[str] = mapped_column(String(36), ForeignKey("exceptions.id", ondelete="CASCADE"), nullable=False, index=True)
    investigation_id: Mapped[str] = mapped_column(String(36), ForeignKey("investigations.id", ondelete="CASCADE"), nullable=False, index=True)
    requested_by: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_by: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    decision: Mapped[str] = mapped_column(String(30), nullable=False, default="pending", index=True)  # pending, approved, rejected, revision_requested
    reviewer_comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    proposed_action_snapshot: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    exception: Mapped["Exception"] = relationship("Exception", back_populates="approvals")
    investigation: Mapped["Investigation"] = relationship("Investigation", back_populates="approvals")
    reviewer: Mapped[Optional["User"]] = relationship("User", foreign_keys=[reviewed_by])
    requester: Mapped[Optional["User"]] = relationship("User", foreign_keys=[requested_by])

    __table_args__ = (
        Index("ix_approvals_org_decision", "organization_id", "decision"),
    )
