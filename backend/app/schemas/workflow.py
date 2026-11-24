from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


class WorkflowNodeSchema(BaseModel):
    id: str = Field(..., min_length=1, max_length=80)
    kind: Literal["connector_input", "agent", "approval_gate", "connector_output"]
    ref_id: str = Field(..., min_length=1, max_length=80)
    agent_id: str | None = Field(default=None, max_length=80)
    label: str = Field(..., min_length=1, max_length=120)
    subtitle: str | None = Field(default=None, max_length=200)
    x: float = Field(default=100.0, ge=-2000.0, le=5000.0)
    y: float = Field(default=100.0, ge=-2000.0, le=5000.0)
    config: dict[str, Any] = Field(default_factory=dict)


class WorkflowEdgeSchema(BaseModel):
    id: str = Field(..., min_length=1, max_length=80)
    source: str = Field(..., min_length=1, max_length=80)
    target: str = Field(..., min_length=1, max_length=80)
    condition: Literal["always", "if_variance_gt_500", "if_discrepancy_found", "auto_settle_below_500"] = "always"
    label: str | None = Field(default=None, max_length=120)


class SwarmWorkflowCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=160)
    description: str = Field(default="", max_length=1000)
    category: Literal["cost_savings", "time_savings", "quality", "production", "full_swarm"] = "cost_savings"
    is_active: bool = True
    nodes: list[WorkflowNodeSchema] = Field(..., min_length=1, max_length=30)
    edges: list[WorkflowEdgeSchema] = Field(default_factory=list, max_length=60)
    estimated_cost_savings_usd: float = Field(default=1500.0, ge=0.0)
    estimated_hours_saved_monthly: float = Field(default=24.0, ge=0.0)


class SwarmWorkflowUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=160)
    description: str | None = Field(default=None, max_length=1000)
    category: Literal["cost_savings", "time_savings", "quality", "production", "full_swarm"] | None = None
    is_active: bool | None = None
    nodes: list[WorkflowNodeSchema] | None = Field(default=None, max_length=30)
    edges: list[WorkflowEdgeSchema] | None = Field(default=None, max_length=60)
    estimated_cost_savings_usd: float | None = Field(default=None, ge=0.0)
    estimated_hours_saved_monthly: float | None = Field(default=None, ge=0.0)


class SwarmWorkflowResponse(BaseModel):
    id: str
    organization_id: str
    name: str
    description: str
    category: str
    is_template: bool
    is_active: bool
    nodes: list[dict[str, Any]]
    edges: list[dict[str, Any]]
    estimated_cost_savings_usd: float
    estimated_hours_saved_monthly: float
    last_run_at: datetime | None = None
    last_run_summary: dict[str, Any] | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SwarmRunRequest(BaseModel):
    dry_run: bool = False


class SwarmRunResponse(BaseModel):
    id: str
    workflow_id: str
    workflow_name: str
    status: str
    sdk: str = "google-antigravity"
    total_cost_savings_usd: float
    total_time_saved_minutes: float
    total_hours_saved: float
    orchestrator_summary: str
    steps: list[dict[str, Any]]
    exported_artifacts: list[dict[str, Any]]
    sdk_metadata: dict[str, Any]
    created_at: datetime
