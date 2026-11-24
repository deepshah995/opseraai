import logging
from datetime import UTC, datetime
from typing import Any

from agentic.app.swarm.sdk_runtime import execute_swarm_workflow_dag
from backend.app.api.dependencies import get_current_user
from backend.app.core.config import settings
from backend.app.db.models.audit import AuditEvent
from backend.app.db.models.connector import AppConnector
from backend.app.db.models.exception import Exception as DBException
from backend.app.db.models.record import OperationalRecord
from backend.app.db.models.user import User
from backend.app.db.models.workflow import SwarmRun, SwarmWorkflow
from backend.app.db.session import get_db
from backend.app.schemas.workflow import (
    SwarmRunRequest,
    SwarmRunResponse,
    SwarmWorkflowCreate,
    SwarmWorkflowResponse,
    SwarmWorkflowUpdate,
)
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/workflows", tags=["Swarm Workflows"])


DEFAULT_MANUFACTURING_TEMPLATES: list[dict[str, Any]] = [
    {
        "name": "3-Way PO, Receiving & Invoice Cost Saver",
        "description": (
            "Reads receiving slips & POs from Google Sheets, runs BOMGuard + CostSentry to catch supplier "
            "overcharges and short-ships, enforces a $500 manager gate, and outputs a summary to Google Docs."
        ),
        "category": "cost_savings",
        "estimated_cost_savings_usd": 3850.0,
        "estimated_hours_saved_monthly": 36.0,
        "nodes": [
            {
                "id": "n-sheets-in",
                "kind": "connector_input",
                "ref_id": "google_sheets",
                "label": "Google Sheets (Receiving & POs)",
                "subtitle": "Ingest live PO & receiving rows",
                "x": 60,
                "y": 140,
                "config": {"connector_type": "google_sheets"},
            },
            {
                "id": "n-bom-guard",
                "kind": "agent",
                "ref_id": "bom_guard",
                "agent_id": "bom_guard",
                "label": "BOMGuard (BG-01)",
                "subtitle": "Verify dock scale weights vs PO",
                "x": 340,
                "y": 70,
                "config": {"tolerance_pct": 0.5},
            },
            {
                "id": "n-cost-sentry",
                "kind": "agent",
                "ref_id": "cost_sentry",
                "agent_id": "cost_sentry",
                "label": "CostSentry (CS-02)",
                "subtitle": "Audit vendor price & duplicate bills",
                "x": 340,
                "y": 220,
                "config": {"check_duplicates": True},
            },
            {
                "id": "n-gate",
                "kind": "approval_gate",
                "ref_id": "approval_gate",
                "label": "Manager Sign-Off Gate",
                "subtitle": "Require approval >= $500",
                "x": 630,
                "y": 140,
                "config": {"threshold_usd": 500},
            },
            {
                "id": "n-docs-out",
                "kind": "connector_output",
                "ref_id": "google_docs",
                "label": "Google Docs (Savings Brief)",
                "subtitle": "Draft credit & NCR report",
                "x": 910,
                "y": 140,
                "config": {"connector_type": "google_docs"},
            },
        ],
        "edges": [
            {"id": "e1", "source": "n-sheets-in", "target": "n-bom-guard", "condition": "always", "label": "Receiving Lots"},
            {"id": "e2", "source": "n-sheets-in", "target": "n-cost-sentry", "condition": "always", "label": "PO & Invoices"},
            {"id": "e3", "source": "n-bom-guard", "target": "n-gate", "condition": "if_discrepancy_found", "label": "Weight Variance"},
            {"id": "e4", "source": "n-cost-sentry", "target": "n-gate", "condition": "if_variance_gt_500", "label": "If > $500"},
            {"id": "e5", "source": "n-gate", "target": "n-docs-out", "condition": "always", "label": "Approved Brief"},
        ],
    },
    {
        "name": "Shop-Floor CNC Schedule & OEE Sync",
        "description": (
            "Pulls ERP work orders, synchronizes machine cell swaps via LinePulse, aggregates plant KPIs "
            "with PlantBeacon, and exports updated shift metrics to Google Sheets."
        ),
        "category": "time_savings",
        "estimated_cost_savings_usd": 2100.0,
        "estimated_hours_saved_monthly": 44.0,
        "nodes": [
            {
                "id": "n-erp-in",
                "kind": "connector_input",
                "ref_id": "erp_database",
                "label": "ERP / MES Work Orders",
                "subtitle": "Load scheduled vs actual runs",
                "x": 70,
                "y": 140,
                "config": {"connector_type": "erp_database"},
            },
            {
                "id": "n-line-pulse",
                "kind": "agent",
                "ref_id": "line_pulse",
                "agent_id": "line_pulse",
                "label": "LinePulse (LP-03)",
                "subtitle": "Detect CNC cell swaps & drift",
                "x": 360,
                "y": 140,
                "config": {},
            },
            {
                "id": "n-plant-beacon",
                "kind": "agent",
                "ref_id": "plant_beacon",
                "agent_id": "plant_beacon",
                "label": "PlantBeacon (PB-05)",
                "subtitle": "Compute hours & downtime saved",
                "x": 650,
                "y": 140,
                "config": {"timeframe": "Last 30 Days"},
            },
            {
                "id": "n-sheets-out",
                "kind": "connector_output",
                "ref_id": "google_sheets",
                "label": "Google Sheets (Shift KPIs)",
                "subtitle": "Sync plant metrics table",
                "x": 930,
                "y": 140,
                "config": {"connector_type": "google_sheets"},
            },
        ],
        "edges": [
            {"id": "e1", "source": "n-erp-in", "target": "n-line-pulse", "condition": "always", "label": "Work Orders"},
            {"id": "e2", "source": "n-line-pulse", "target": "n-plant-beacon", "condition": "always", "label": "Sync Metrics"},
            {"id": "e3", "source": "n-plant-beacon", "target": "n-sheets-out", "condition": "always", "label": "Publish Rows"},
        ],
    },
    {
        "name": "Supplier Quality NCR & Chargeback Swarm",
        "description": (
            "Evaluates incoming defect / shortage claims with QualityShield, calculates invoice recovery via "
            "CostSentry, stages manager review, and outputs a ready-to-send Google Docs NCR packet."
        ),
        "category": "quality",
        "estimated_cost_savings_usd": 2950.0,
        "estimated_hours_saved_monthly": 28.0,
        "nodes": [
            {
                "id": "n-qc-in",
                "kind": "connector_input",
                "ref_id": "google_sheets",
                "label": "Google Sheets (QC & Lots)",
                "subtitle": "Incoming inspection logs",
                "x": 60,
                "y": 140,
                "config": {"connector_type": "google_sheets"},
            },
            {
                "id": "n-quality",
                "kind": "agent",
                "ref_id": "quality_shield",
                "agent_id": "quality_shield",
                "label": "QualityShield (QS-04)",
                "subtitle": "Verify claim & draft NCR letter",
                "x": 340,
                "y": 140,
                "config": {},
            },
            {
                "id": "n-cost",
                "kind": "agent",
                "ref_id": "cost_sentry",
                "agent_id": "cost_sentry",
                "label": "CostSentry (CS-02)",
                "subtitle": "Compute credit / chargeback $",
                "x": 610,
                "y": 140,
                "config": {},
            },
            {
                "id": "n-docs",
                "kind": "connector_output",
                "ref_id": "google_docs",
                "label": "Google Docs (NCR Letter)",
                "subtitle": "Export signed NCR packet",
                "x": 890,
                "y": 140,
                "config": {"connector_type": "google_docs"},
            },
        ],
        "edges": [
            {"id": "e1", "source": "n-qc-in", "target": "n-quality", "condition": "always", "label": "QC Data"},
            {"id": "e2", "source": "n-quality", "target": "n-cost", "condition": "if_discrepancy_found", "label": "Validated Claim"},
            {"id": "e3", "source": "n-cost", "target": "n-docs", "condition": "always", "label": "NCR Packet"},
        ],
    },
]


def ensure_default_workflows(db: Session, organization_id: str) -> list[SwarmWorkflow]:
    existing = (
        db.execute(
            select(SwarmWorkflow)
            .where(SwarmWorkflow.organization_id == organization_id)
            .order_by(SwarmWorkflow.created_at.asc())
        )
        .scalars()
        .all()
    )
    if existing:
        return list(existing)

    created: list[SwarmWorkflow] = []
    for tpl in DEFAULT_MANUFACTURING_TEMPLATES:
        wf = SwarmWorkflow(
            organization_id=organization_id,
            name=tpl["name"],
            description=tpl["description"],
            category=tpl["category"],
            is_template=True,
            is_active=True,
            nodes=tpl["nodes"],
            edges=tpl["edges"],
            estimated_cost_savings_usd=tpl["estimated_cost_savings_usd"],
            estimated_hours_saved_monthly=tpl["estimated_hours_saved_monthly"],
        )
        db.add(wf)
        created.append(wf)
    db.commit()
    for wf in created:
        db.refresh(wf)
    return created


@router.get("", response_model=list[SwarmWorkflowResponse])
def list_workflows(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    workflows = ensure_default_workflows(db, current_user.organization_id)
    return [SwarmWorkflowResponse.model_validate(w) for w in workflows]


@router.post("", response_model=SwarmWorkflowResponse, status_code=status.HTTP_201_CREATED)
def create_workflow(
    req: SwarmWorkflowCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    node_ids = {n.id for n in req.nodes}
    for edge in req.edges:
        if edge.source not in node_ids or edge.target not in node_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Edge '{edge.id}' references unknown node.",
            )

    wf = SwarmWorkflow(
        organization_id=current_user.organization_id,
        name=req.name,
        description=req.description,
        category=req.category,
        is_template=False,
        is_active=req.is_active,
        nodes=[n.model_dump() for n in req.nodes],
        edges=[e.model_dump() for e in req.edges],
        estimated_cost_savings_usd=req.estimated_cost_savings_usd,
        estimated_hours_saved_monthly=req.estimated_hours_saved_monthly,
    )
    db.add(wf)
    db.commit()
    db.refresh(wf)
    return SwarmWorkflowResponse.model_validate(wf)


@router.put("/{workflow_id}", response_model=SwarmWorkflowResponse)
def update_workflow(
    workflow_id: str,
    req: SwarmWorkflowUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    wf = (
        db.execute(
            select(SwarmWorkflow).where(
                SwarmWorkflow.id == workflow_id,
                SwarmWorkflow.organization_id == current_user.organization_id,
            )
        )
        .scalars()
        .first()
    )
    if not wf:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow not found.")

    if req.name is not None:
        wf.name = req.name
    if req.description is not None:
        wf.description = req.description
    if req.category is not None:
        wf.category = req.category
    if req.is_active is not None:
        wf.is_active = req.is_active
    if req.nodes is not None:
        wf.nodes = [n.model_dump() for n in req.nodes]
    if req.edges is not None:
        node_ids = {str(n["id"]) for n in wf.nodes}
        for edge in req.edges:
            if edge.source not in node_ids or edge.target not in node_ids:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Edge '{edge.id}' references unknown node.",
                )
        wf.edges = [e.model_dump() for e in req.edges]
    if req.estimated_cost_savings_usd is not None:
        wf.estimated_cost_savings_usd = req.estimated_cost_savings_usd
    if req.estimated_hours_saved_monthly is not None:
        wf.estimated_hours_saved_monthly = req.estimated_hours_saved_monthly

    db.commit()
    db.refresh(wf)
    return SwarmWorkflowResponse.model_validate(wf)


@router.delete("/{workflow_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workflow(
    workflow_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    wf = (
        db.execute(
            select(SwarmWorkflow).where(
                SwarmWorkflow.id == workflow_id,
                SwarmWorkflow.organization_id == current_user.organization_id,
            )
        )
        .scalars()
        .first()
    )
    if not wf:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow not found.")
    db.delete(wf)
    db.commit()


@router.post("/{workflow_id}/run", response_model=SwarmRunResponse)
def run_workflow(
    workflow_id: str,
    req: SwarmRunRequest = SwarmRunRequest(),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    org_id = current_user.organization_id
    wf = (
        db.execute(
            select(SwarmWorkflow).where(
                SwarmWorkflow.id == workflow_id,
                SwarmWorkflow.organization_id == org_id,
            )
        )
        .scalars()
        .first()
    )
    if not wf:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow not found.")

    records_db = (
        db.execute(select(OperationalRecord).where(OperationalRecord.organization_id == org_id))
        .scalars()
        .all()
    )
    exceptions_db = (
        db.execute(select(DBException).where(DBException.organization_id == org_id))
        .scalars()
        .all()
    )
    connectors_db = (
        db.execute(select(AppConnector).where(AppConnector.organization_id == org_id))
        .scalars()
        .all()
    )

    records_payload = [
        {
            "id": r.id,
            "record_type": r.record_type,
            "external_reference": r.external_reference,
            "customer_reference": r.customer_reference,
            "service_date": r.service_date.isoformat() if r.service_date else None,
            "amount": r.amount,
            "quantity": r.quantity,
            "unit": r.unit,
            "rate": r.rate,
            "status": r.status,
            "normalized_data": r.normalized_data or {},
        }
        for r in records_db
    ]
    exceptions_payload = [
        {
            "id": e.id,
            "exception_type": e.exception_type,
            "title": e.title,
            "description": e.description,
            "severity": e.severity,
            "status": e.status,
            "discrepancy_amount": e.discrepancy_amount,
            "related_record_ids": e.related_record_ids or [],
        }
        for e in exceptions_db
    ]
    connectors_payload = [
        {
            "id": c.id,
            "connector_type": c.connector_type,
            "name": c.name,
            "status": c.status,
            "resource_id": c.resource_id,
        }
        for c in connectors_db
    ]

    result: dict[str, Any] | None = None
    if settings.AGENTIC_WORKER_URL:
        try:
            import httpx

            endpoint = f"{settings.AGENTIC_WORKER_URL.rstrip('/')}/swarm/execute"
            resp = httpx.post(
                endpoint,
                json={
                    "organization_id": org_id,
                    "workflow_name": wf.name,
                    "nodes": wf.nodes,
                    "edges": wf.edges,
                    "records": records_payload,
                    "exceptions": exceptions_payload,
                    "connectors": connectors_payload,
                    "dry_run": req.dry_run,
                },
                timeout=60.0,
            )
            if resp.status_code == 200:
                result = resp.json()
        except Exception as worker_err:
            logger.warning(f"Remote Antigravity worker unreachable ({worker_err}); running in-process.")

    if result is None:
        result = execute_swarm_workflow_dag(
            workflow_name=wf.name,
            nodes=wf.nodes,
            edges=wf.edges,
            org_records=records_payload,
            org_exceptions=exceptions_payload,
            connectors=connectors_payload,
            dry_run=req.dry_run,
        )

    run_rec = SwarmRun(
        organization_id=org_id,
        workflow_id=wf.id,
        status=result["status"],
        total_cost_savings_usd=result["total_cost_savings_usd"],
        total_time_saved_minutes=result["total_time_saved_minutes"],
        orchestrator_summary=result["orchestrator_summary"],
        steps_output=result["steps"],
        exported_artifacts=result["exported_artifacts"],
        sdk_metadata=result["sdk_metadata"],
    )
    db.add(run_rec)
    wf.last_run_at = datetime.now(UTC)
    wf.last_run_summary = {
        "cost_savings_usd": result["total_cost_savings_usd"],
        "hours_saved": result["total_hours_saved"],
        "status": result["status"],
        "steps_count": len(result["steps"]),
    }

    audit = AuditEvent(
        organization_id=org_id,
        actor_type="agent",
        actor_id="antigravity_swarm_orchestrator",
        action="swarm_workflow_executed",
        resource_type="swarm_workflow",
        resource_id=wf.id,
        action_metadata={
            "workflow_name": wf.name,
            "cost_savings_usd": result["total_cost_savings_usd"],
            "time_saved_minutes": result["total_time_saved_minutes"],
        },
    )
    db.add(audit)
    db.commit()
    db.refresh(run_rec)

    return SwarmRunResponse(
        id=run_rec.id,
        workflow_id=wf.id,
        workflow_name=wf.name,
        status=run_rec.status,
        sdk="google-antigravity",
        total_cost_savings_usd=run_rec.total_cost_savings_usd,
        total_time_saved_minutes=run_rec.total_time_saved_minutes,
        total_hours_saved=round(run_rec.total_time_saved_minutes / 60.0, 2),
        orchestrator_summary=run_rec.orchestrator_summary,
        steps=run_rec.steps_output,
        exported_artifacts=run_rec.exported_artifacts,
        sdk_metadata=run_rec.sdk_metadata,
        created_at=run_rec.created_at,
    )


@router.get("/{workflow_id}/runs", response_model=list[SwarmRunResponse])
def list_workflow_runs(
    workflow_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    wf = (
        db.execute(
            select(SwarmWorkflow).where(
                SwarmWorkflow.id == workflow_id,
                SwarmWorkflow.organization_id == current_user.organization_id,
            )
        )
        .scalars()
        .first()
    )
    if not wf:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow not found.")

    runs = (
        db.execute(
            select(SwarmRun)
            .where(
                SwarmRun.workflow_id == workflow_id,
                SwarmRun.organization_id == current_user.organization_id,
            )
            .order_by(SwarmRun.created_at.desc())
            .limit(15)
        )
        .scalars()
        .all()
    )
    return [
        SwarmRunResponse(
            id=r.id,
            workflow_id=wf.id,
            workflow_name=wf.name,
            status=r.status,
            sdk="google-antigravity",
            total_cost_savings_usd=r.total_cost_savings_usd,
            total_time_saved_minutes=r.total_time_saved_minutes,
            total_hours_saved=round(r.total_time_saved_minutes / 60.0, 2),
            orchestrator_summary=r.orchestrator_summary,
            steps=r.steps_output,
            exported_artifacts=r.exported_artifacts,
            sdk_metadata=r.sdk_metadata,
            created_at=r.created_at,
        )
        for r in runs
    ]
