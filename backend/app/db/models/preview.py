from backend.app.db.base import Base, TimestampMixin
from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column


class ProspectPreview(Base, TimestampMixin):
    __tablename__ = "prospect_previews"

    slug: Mapped[str] = mapped_column(String(120), primary_key=True)
    domain: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    company_name: Mapped[str] = mapped_column(String(255), nullable=False)
    subsector: Mapped[str] = mapped_column(String(255), nullable=False, default="Manufacturing")
    location: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    payload_json: Mapped[str] = mapped_column(Text, nullable=False)
