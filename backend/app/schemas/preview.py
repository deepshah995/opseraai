from pydantic import BaseModel, Field


class ProspectAgentPlan(BaseModel):
    agent_id: str
    agent_name: str
    code_name: str
    focus: str
    workflow_hook: str
    est_hours_saved_month: float


class ProspectPreviewFinding(BaseModel):
    issue_title: str
    agent_name: str
    exception_type: str
    estimated_monthly_impact_usd: float
    reclaimed_hours_month: float
    source_systems: list[str] = Field(default_factory=list)
    summary: str
    is_simulated: bool = True


class ProspectPreviewCreate(BaseModel):
    domain: str = Field(min_length=3, max_length=255)
    company_name: str = Field(min_length=1, max_length=255)
    subsector: str = Field(default="Precision Manufacturing", max_length=255)
    location: str = Field(default="North America", max_length=255)
    observed_signals: list[str] = Field(default_factory=list, max_length=12)
    top_opportunities: list[str] = Field(default_factory=list, max_length=12)
    recipient_role: str = Field(default="VP of Operations", max_length=120)
    slug: str | None = Field(default=None, max_length=120)


class ProspectPreviewResponse(BaseModel):
    slug: str
    domain: str
    company_name: str
    subsector: str
    location: str
    erp_stack: list[str] = Field(default_factory=list)
    compliance_tags: list[str] = Field(default_factory=list)
    executive_hook: str
    observed_signals: list[str] = Field(default_factory=list)
    top_opportunities: list[str] = Field(default_factory=list)
    agent_deployments: list[ProspectAgentPlan] = Field(default_factory=list)
    simulated_findings: list[ProspectPreviewFinding] = Field(default_factory=list)
    est_monthly_savings_usd: float
    est_monthly_hours_saved: float
    pilot_plan: list[dict[str, str]] = Field(default_factory=list)
    simulation_notice: str
