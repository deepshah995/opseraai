from datetime import UTC, datetime
from typing import Any, Optional

from backend.app.db.base import Base, generate_uuid
from sqlalchemy import JSON, DateTime, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship


class Evidence(Base):
    __tablename__ = "evidence_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    organization_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    investigation_id: Mapped[str] = mapped_column(String(36), ForeignKey("investigations.id", ondelete="CASCADE"), nullable=False, index=True)
    source_type: Mapped[str] = mapped_column(String(30), nullable=False)  # record, document
    source_record_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("operational_records.id", ondelete="SET NULL"), nullable=True)
    source_document_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("source_documents.id", ondelete="SET NULL"), nullable=True)
    evidence_reference: Mapped[str] = mapped_column(String(255), nullable=False)
    excerpt: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    relevance_explanation: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False)

    investigation: Mapped["Investigation"] = relationship("Investigation", back_populates="evidence_items")
    source_record: Mapped[Optional["OperationalRecord"]] = relationship("OperationalRecord")
    source_document: Mapped[Optional["SourceDocument"]] = relationship("SourceDocument")

    __table_args__ = (
        Index("ix_evidence_org_inv", "organization_id", "investigation_id"),
    )
