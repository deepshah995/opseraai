
from backend.app.db.base import Base, TimestampMixin, generate_uuid
from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship


class Organization(Base, TimestampMixin):
    __tablename__ = "organizations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    name: Mapped[str] = mapped_column(String(255), nullable=False)

    users: Mapped[list["User"]] = relationship("User", back_populates="organization", cascade="all, delete-orphan")
    documents: Mapped[list["SourceDocument"]] = relationship("SourceDocument", back_populates="organization", cascade="all, delete-orphan")
    records: Mapped[list["OperationalRecord"]] = relationship("OperationalRecord", back_populates="organization", cascade="all, delete-orphan")
    exceptions: Mapped[list["Exception"]] = relationship("Exception", back_populates="organization", cascade="all, delete-orphan")
    investigations: Mapped[list["Investigation"]] = relationship("Investigation", back_populates="organization", cascade="all, delete-orphan")
    audit_events: Mapped[list["AuditEvent"]] = relationship("AuditEvent", back_populates="organization", cascade="all, delete-orphan")
