from typing import Any

from backend.app.db.base import Base, TimestampMixin, generate_uuid
from sqlalchemy import JSON, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship


class SourceDocument(Base, TimestampMixin):
    __tablename__ = "source_documents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    organization_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    uploaded_by: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    document_type: Mapped[str] = mapped_column(String(50), nullable=False)  # invoice_pdf, scale_ticket_pdf, dispatch_log_pdf, rate_card_pdf
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    content_type: Mapped[str] = mapped_column(String(100), nullable=False)
    storage_object_key: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    file_size_bytes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    processing_status: Mapped[str] = mapped_column(String(50), nullable=False, default="pending")  # pending, processing, completed, failed
    extracted_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    extraction_metadata: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)

    organization: Mapped["Organization"] = relationship("Organization", back_populates="documents")
    operational_records: Mapped[list["OperationalRecord"]] = relationship("OperationalRecord", back_populates="source_document")
