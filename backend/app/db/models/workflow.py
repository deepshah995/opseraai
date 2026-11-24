from datetime import datetime
from typing import Any

from backend.app.db.base import Base, TimestampMixin, generate_uuid
from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship


class SwarmWorkflow(Base, TimestampMixin):
    __tablename__ = "swarm_workflows"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    organization_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    category: Mapped[str] = mapped_column(String(60), nullable=False, default="cost_savings")
    is_template: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    nodes: Mapped[list[dict[str, Any]]] = mapped_column(JSON, nullable=False, default=list)
    edges: Mapped[list[dict[str, Any]]] = mapped_column(JSON, nullable=False, default=list)
    estimated_cost_savings_usd: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    estimated_hours_saved_monthly: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    last_run_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_run_summary: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)

    organization: Mapped["Organization"] = relationship("Organization", back_populates="workflows")
    runs: Mapped[list["SwarmRun"]] = relationship(
        "SwarmRun", back_populates="workflow", cascade="all, delete-orphan"
    )

    __table_args__ = (Index("ix_swarm_workflows_org_active", "organization_id", "is_active"),)


class SwarmRun(Base, TimestampMixin):
    __tablename__ = "swarm_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    organization_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    workflow_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("swarm_workflows.id", ondelete="CASCADE"), nullable=False, index=True
    )
    status: Mapped[str] = mapped_column(String(40), nullable=False, default="completed")
    total_cost_savings_usd: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    total_time_saved_minutes: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    orchestrator_summary: Mapped[str] = mapped_column(Text, nullable=False, default="")
    steps_output: Mapped[list[dict[str, Any]]] = mapped_column(JSON, nullable=False, default=list)
    exported_artifacts: Mapped[list[dict[str, Any]]] = mapped_column(JSON, nullable=False, default=list)
    sdk_metadata: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)

    workflow: Mapped["SwarmWorkflow"] = relationship("SwarmWorkflow", back_populates="runs")

    __table_args__ = (Index("ix_swarm_runs_org_wf", "organization_id", "workflow_id"),)
