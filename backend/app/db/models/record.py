from datetime import datetime
from typing import Any, Optional

from backend.app.db.base import Base, TimestampMixin, generate_uuid
from sqlalchemy import JSON, DateTime, Float, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship


class OperationalRecord(Base, TimestampMixin):
    __tablename__ = "operational_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    organization_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    record_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)  # invoice, service_ticket, dispatch_record, load_record, customer_account
    external_reference: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    customer_reference: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    service_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    amount: Mapped[float | None] = mapped_column(Float, nullable=True)
    quantity: Mapped[float | None] = mapped_column(Float, nullable=True)
    unit: Mapped[str | None] = mapped_column(String(50), nullable=True)  # tons, yards, pulls, hours, gallons
    rate: Mapped[float | None] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="completed")  # completed, pending, billed, cancelled
    source_document_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("source_documents.id", ondelete="SET NULL"), nullable=True)
    normalized_data: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)

    organization: Mapped["Organization"] = relationship("Organization", back_populates="records")
    source_document: Mapped[Optional["SourceDocument"]] = relationship("SourceDocument", back_populates="operational_records")

    __table_args__ = (
        Index("ix_records_org_type_ref", "organization_id", "record_type", "external_reference"),
        Index("ix_records_org_cust_date", "organization_id", "customer_reference", "service_date"),
    )
