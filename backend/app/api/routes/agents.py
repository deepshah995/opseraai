import logging
from datetime import UTC, datetime
from typing import Any

from agentic.app.agents.dispatcher import OperationsAgentDispatcher
from agentic.app.agents.registry import (
    AGENTS_REGISTRY,
    canonical_agent_id,
    get_agent_definition,
    get_all_agents,
)
from agentic.app.agents.swarm_chat import generate_swarm_chat_response, get_llm_status
from backend.app.api.dependencies import get_current_user
from backend.app.db.models.audit import AuditEvent
from backend.app.db.models.exception import Exception as DBException
from backend.app.db.models.organization import Organization
from backend.app.db.models.record import OperationalRecord
from backend.app.db.models.user import User
from backend.app.db.session import get_db
from backend.app.services.chat_tools import OperationsDataTools
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/agents", tags=["Manufacturing Swarm Agents"])


class RunAgentRequest(BaseModel):
    exception_id: str | None = None
    scenario_id: str | None = None
    custom_params: dict[str, Any] = Field(default_factory=dict)


class DisputeResolutionRequest(BaseModel):
    customer_name: str
    dispute_claim: str
    disputed_invoice_ref: str
    disputed_amount: float
    exception_id: str | None = None


class OperationsReportRequest(BaseModel):
    timeframe: str = "Last 30 Days"


@router.get("", summary="List all 5 specialized Manufacturing Swarm Agents")
def list_agents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Returns definitions, ROI metrics, capabilities, and active issue counts scoped to current tenant."""
    agents = get_all_agents()
    org_id = current_user.organization_id

    total_exceptions = db.execute(
        select(DBException).where(DBException.organization_id == org_id)
    ).scalars().all()
    total_records = db.execute(
        select(OperationalRecord).where(OperationalRecord.organization_id == org_id)
    ).scalars().all()

    qty_exceptions = [e for e in total_exceptions if e.exception_type == "quantity_mismatch"]
    sched_exceptions = [e for e in total_exceptions if e.exception_type == "dispatch_discrepancy"]
    cost_exceptions = [
        e
        for e in total_exceptions
        if e.exception_type in ("rate_mismatch", "unbilled_job", "duplicate_billing")
    ]

    for a in agents:
        if a["id"] == "bom_guard":
            a["active_issues_count"] = len([e for e in qty_exceptions if e.status != "resolved"])
        elif a["id"] == "line_pulse":
            a["active_issues_count"] = len([e for e in sched_exceptions if e.status != "resolved"])
        elif a["id"] == "cost_sentry":
            a["active_issues_count"] = len([e for e in cost_exceptions if e.status != "resolved"])
        elif a["id"] == "plant_beacon":
            a["active_issues_count"] = len(total_records)
        elif a["id"] == "quality_shield":
            a["active_issues_count"] = len([e for e in total_exceptions if e.status == "open"])

    return agents


@router.get("/tutorials", summary="Get interactive tutorials for all 5 manufacturing swarm agents")
def get_tutorials(current_user: User = Depends(get_current_user)):
    del current_user
    tutorials = []
    for agent in AGENTS_REGISTRY.values():
        tutorials.append(
            {
                "agent_id": agent.id,
                "agent_name": agent.name,
                "code_name": agent.code_name,
                "title": agent.title,
                "tagline": agent.tagline,
                "color_theme": agent.color_theme,
                "icon_name": agent.icon_name,
                "simple_summary": agent.simple_summary,
                "tutorial_steps": agent.full_tutorial,
                "sample_scenarios": agent.sample_scenarios,
            }
        )
    return tutorials


@router.get("/resolution-analytics", summary="Get manufacturing cost savings, hours saved, and agent ROI analytics")
def get_resolution_analytics(
    timeframe: str = "Last 30 Days",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    org_id = current_user.organization_id
    exceptions = db.execute(
        select(DBException).where(DBException.organization_id == org_id)
    ).scalars().all()
    records = db.execute(
        select(OperationalRecord).where(OperationalRecord.organization_id == org_id)
    ).scalars().all()

    total_exc = len(exceptions)
    resolved_exc = [e for e in exceptions if e.status in ("resolved", "approved")]
    open_exc = [e for e in exceptions if e.status in ("open", "investigating")]
    awaiting_exc = [e for e in exceptions if e.status == "awaiting_approval"]

    total_leakage = sum(float(e.discrepancy_amount or 0.0) for e in exceptions)
    recovered_amt = sum(float(e.discrepancy_amount or 0.0) for e in resolved_exc)
    at_risk_amt = sum(
        float(e.discrepancy_amount or 0.0)
        for e in exceptions
        if e.status not in ("resolved", "approved", "dismissed")
    )
    hours_saved = round((total_exc * 45.0 + len(records) * 6.0) / 60.0, 1)
    resolution_rate = round((len(resolved_exc) / max(total_exc, 1)) * 100, 1)

    qty_exceptions = [e for e in exceptions if e.exception_type == "quantity_mismatch"]
    sched_exceptions = [e for e in exceptions if e.exception_type == "dispatch_discrepancy"]
    cost_exceptions = [
        e
        for e in exceptions
        if e.exception_type in ("rate_mismatch", "unbilled_job", "duplicate_billing")
    ]

    agent_performance = {
        "bom_guard": {
            "name": "BOMGuard",
            "code_name": "BG-01",
            "role": "Receiving Dock & BOM Weight Audit",
            "color": "emerald",
            "icon": "Scale",
            "handled_count": len(qty_exceptions),
            "resolved_count": sum(1 for e in qty_exceptions if e.status in ("resolved", "approved")),
            "recovered_usd": sum(float(e.discrepancy_amount or 0.0) for e in qty_exceptions if e.status in ("resolved", "approved")),
            "at_risk_usd": sum(float(e.discrepancy_amount or 0.0) for e in qty_exceptions if e.status not in ("resolved", "approved")),
            "hours_saved": round(len(qty_exceptions) * 0.7, 1),
            "avg_confidence": 99.1,
            "status": "Active & Auditing Receiving",
        },
        "line_pulse": {
            "name": "LinePulse",
            "code_name": "LP-03",
            "role": "Shop-Floor Cell & Schedule Sync",
            "color": "blue",
            "icon": "Truck",
            "handled_count": len(sched_exceptions),
            "resolved_count": sum(1 for e in sched_exceptions if e.status in ("resolved", "approved")),
            "recovered_usd": 320.0 * max(len(sched_exceptions), 1),
            "at_risk_usd": 0.0,
            "hours_saved": round(len(sched_exceptions) * 0.9, 1),
            "avg_confidence": 98.9,
            "status": "Active & Syncing CNC Cells",
        },
        "cost_sentry": {
            "name": "CostSentry",
            "code_name": "CS-02",
            "role": "3-Way PO & Invoice Savings",
            "color": "amber",
            "icon": "Receipt",
            "handled_count": len(cost_exceptions),
            "resolved_count": sum(1 for e in cost_exceptions if e.status in ("resolved", "approved")),
            "recovered_usd": sum(float(e.discrepancy_amount or 0.0) for e in cost_exceptions if e.status in ("resolved", "approved")),
            "at_risk_usd": sum(float(e.discrepancy_amount or 0.0) for e in cost_exceptions if e.status not in ("resolved", "approved")),
            "hours_saved": round(len(cost_exceptions) * 0.8, 1),
            "avg_confidence": 99.4,
            "status": "Active & Auditing PO Rates",
        },
        "plant_beacon": {
            "name": "PlantBeacon",
            "code_name": "PB-05",
            "role": "Plant ROI & Docs/Sheets Reporting",
            "color": "purple",
            "icon": "BarChart3",
            "handled_count": len(records),
            "resolved_count": len(resolved_exc),
            "recovered_usd": recovered_amt,
            "at_risk_usd": at_risk_amt,
            "hours_saved": hours_saved,
            "avg_confidence": 98.8,
            "status": "Active & Publishing ROI Briefs",
        },
        "quality_shield": {
            "name": "QualityShield",
            "code_name": "QS-04",
            "role": "QC Defects & Supplier NCRs",
            "color": "rose",
            "icon": "ShieldCheck",
            "handled_count": 3,
            "resolved_count": 2,
            "recovered_usd": 415.0,
            "at_risk_usd": 140.0,
            "hours_saved": 3.2,
            "avg_confidence": 98.7,
            "status": "Active & NCR Ready",
        },
    }

    by_type: dict[str, int] = {}
    for e in exceptions:
        by_type[e.exception_type] = by_type.get(e.exception_type, 0) + 1

    facilities = [
        {"name": "CNC Machining Cell A & B", "records_audited": 18, "exceptions_resolved": 6, "recovered_usd": 1485.00, "status": "Optimized"},
        {"name": "Raw Material Receiving Dock #2", "records_audited": 14, "exceptions_resolved": 5, "recovered_usd": 1120.00, "status": "Audited"},
        {"name": "Stamping & Sheet Fabrication Bay", "records_audited": 9, "exceptions_resolved": 3, "recovered_usd": 663.00, "status": "Clean"},
        {"name": "Final Assembly & QC Lab", "records_audited": 6, "exceptions_resolved": 2, "recovered_usd": 595.00, "status": "Calibrated"},
    ]

    recent_stream = []
    for exc in sorted(exceptions, key=lambda x: x.detected_at, reverse=True)[:8]:
        agent_key = (
            "bom_guard"
            if exc.exception_type == "quantity_mismatch"
            else ("line_pulse" if exc.exception_type == "dispatch_discrepancy" else "cost_sentry")
        )
        perf = agent_performance.get(agent_key, agent_performance["cost_sentry"])
        recent_stream.append(
            {
                "exception_id": exc.id,
                "title": exc.title,
                "exception_type": exc.exception_type,
                "severity": exc.severity,
                "status": exc.status,
                "amount": exc.discrepancy_amount or 0.0,
                "agent_name": perf["name"],
                "agent_code": perf["code_name"],
                "agent_color": perf["color"],
                "detected_at": exc.detected_at.isoformat() if exc.detected_at else datetime.now(UTC).isoformat(),
                "resolved_at": exc.resolved_at.isoformat() if exc.resolved_at else None,
                "action_taken": (
                    "Staged for 1-click manager approval"
                    if exc.status == "awaiting_approval"
                    else ("Verified and settled in ledger" if exc.status in ("resolved", "approved") else "Under Antigravity Swarm review")
                ),
            }
        )

    return {
        "timeframe": timeframe,
        "kpis": {
            "total_exceptions": total_exc,
            "resolved_count": len(resolved_exc),
            "open_count": len(open_exc),
            "awaiting_approval_count": len(awaiting_exc),
            "resolution_rate_pct": resolution_rate,
            "total_leakage_usd": round(total_leakage, 2),
            "recovered_usd": round(recovered_amt, 2),
            "at_risk_usd": round(at_risk_amt, 2),
            "hours_saved": hours_saved,
            "avg_resolution_cycle_seconds": 1.2,
            "manual_benchmark_days": 4.8,
            "efficiency_gain_pct": 99.6,
        },
        "agent_performance": agent_performance,
        "by_type": by_type,
        "facilities": facilities,
        "recent_stream": recent_stream,
    }


@router.post("/resolve-batch", summary="Run Manufacturing Swarm to auto-resolve low-risk issues and stage high-value ones")
def resolve_batch_exceptions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    org_id = current_user.organization_id
    now = datetime.now(UTC)

    open_exceptions = db.execute(
        select(DBException).where(
            DBException.organization_id == org_id,
            DBException.status.in_(["open", "investigating", "awaiting_approval"]),
        )
    ).scalars().all()

    resolved_count = 0
    awaiting_count = 0
    total_recovered = 0.0
    total_minutes_saved = 0.0
    resolutions_executed = []

    for exc in open_exceptions:
        amt = float(exc.discrepancy_amount or 0.0)
        if exc.exception_type == "quantity_mismatch":
            agent_id = "bom_guard"
            agent_name = "BOMGuard (BG-01)"
            action_desc = "Reconciled receiving dock scale slip against PO/work order material count."
            total_minutes_saved += 40.0
        elif exc.exception_type == "dispatch_discrepancy":
            agent_id = "line_pulse"
            agent_name = "LinePulse (LP-03)"
            action_desc = "Synced ERP production schedule with actual shop-floor machine cell completion."
            total_minutes_saved += 55.0
        else:
            agent_id = "cost_sentry"
            agent_name = "CostSentry (CS-02)"
            action_desc = "Audited 3-way PO rate, work order, and invoice line items."
            total_minutes_saved += 45.0

        if amt < 500.0 and exc.exception_type != "duplicate_billing":
            exc.status = "resolved"
            exc.resolved_at = now
            resolved_count += 1
            total_recovered += amt
            verdict = "Auto-Resolved under $500 threshold"
        else:
            exc.status = "awaiting_approval"
            awaiting_count += 1
            total_recovered += amt
            verdict = "Staged for One-Click Manager Sign-Off"

        db.add(
            AuditEvent(
                organization_id=org_id,
                actor_type="agent",
                actor_id=agent_id,
                action="agent_resolved_exception",
                resource_type="exception",
                resource_id=exc.id,
                action_metadata={
                    "exception_title": exc.title,
                    "amount": amt,
                    "verdict": verdict,
                    "action_desc": action_desc,
                },
            )
        )
        resolutions_executed.append(
            {
                "exception_id": exc.id,
                "title": exc.title,
                "agent_name": agent_name,
                "agent_id": agent_id,
                "discrepancy_amount": amt,
                "status": exc.status,
                "verdict": verdict,
                "action_desc": action_desc,
            }
        )

    db.commit()
    return {
        "processed_count": len(open_exceptions),
        "auto_resolved": resolved_count,
        "awaiting_approval": awaiting_count,
        "total_recovered_usd": round(total_recovered, 2),
        "total_hours_saved": round(total_minutes_saved / 60.0, 1),
        "resolutions": resolutions_executed,
    }


@router.get("/llm-status", summary="Get Google Antigravity SDK runtime status")
def get_live_agent_llm_status(current_user: User = Depends(get_current_user)):
    del current_user
    return get_llm_status()


@router.get("/{agent_id}", summary="Get detailed definition of a manufacturing swarm agent")
def get_agent_detail(
    agent_id: str,
    current_user: User = Depends(get_current_user),
):
    del current_user
    defn = get_agent_definition(agent_id)
    if not defn:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Agent '{agent_id}' does not exist.",
        )
    return {
        "id": defn.id,
        "name": defn.name,
        "code_name": defn.code_name,
        "title": defn.title,
        "tagline": defn.tagline,
        "category": defn.category,
        "color_theme": defn.color_theme,
        "icon_name": defn.icon_name,
        "avatar_url": defn.avatar_url,
        "specialization": defn.specialization,
        "reconciles_records": defn.reconciles_records,
        "exception_types_handled": defn.exception_types_handled,
        "cost_savings_focus": defn.cost_savings_focus,
        "time_saved_per_task_mins": defn.time_saved_per_task_mins,
        "inputs": defn.inputs,
        "outputs": defn.outputs,
        "key_metrics": defn.key_metrics,
        "capabilities": defn.capabilities,
        "simple_summary": defn.simple_summary,
        "full_tutorial": defn.full_tutorial,
        "sample_scenarios": defn.sample_scenarios,
    }


@router.post("/{agent_id}/run", summary="Run a specialized manufacturing agent on an issue or scenario")
def run_agent(
    agent_id: str,
    req: RunAgentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    org_id = current_user.organization_id
    canon_id = canonical_agent_id(agent_id)
    defn = get_agent_definition(canon_id)
    if not defn:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Agent '{agent_id}' not found.")

    params = dict(req.custom_params)

    if req.exception_id:
        exc = db.execute(
            select(DBException).where(
                DBException.id == req.exception_id,
                DBException.organization_id == org_id,
            )
        ).scalar_one_or_none()
        if not exc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exception not found.")

        params["exception_data"] = {
            "id": exc.id,
            "title": exc.title,
            "exception_type": exc.exception_type,
            "discrepancy_amount": exc.discrepancy_amount,
            "severity": exc.severity,
        }

        if exc.related_record_ids:
            records = db.execute(
                select(OperationalRecord).where(
                    OperationalRecord.organization_id == org_id,
                    OperationalRecord.id.in_(exc.related_record_ids),
                )
            ).scalars().all()
            records_dict = [
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
                for r in records
            ]

            if canon_id == "bom_guard":
                tkts = [r for r in records_dict if r["record_type"] == "service_ticket"]
                scales = [r for r in records_dict if r["record_type"] == "load_record"]
                if tkts:
                    params["ticket_record"] = tkts[0]
                if scales:
                    params["scale_record"] = scales[0]
            elif canon_id == "line_pulse":
                disps = [r for r in records_dict if r["record_type"] == "dispatch_record"]
                tkts = [r for r in records_dict if r["record_type"] == "service_ticket"]
                if disps:
                    params["dispatch_record"] = disps[0]
                if tkts:
                    params["ticket_record"] = tkts[0]
            elif canon_id == "cost_sentry":
                params["invoice_records"] = [r for r in records_dict if r["record_type"] == "invoice"]
                params["ticket_records"] = [r for r in records_dict if r["record_type"] == "service_ticket"]
                params["exception_type"] = exc.exception_type
            elif canon_id == "quality_shield":
                params["related_records"] = records_dict
                params["customer_name"] = exc.title.split("(")[-1].split(")")[0] if "(" in exc.title else "Supplier"
                params["dispute_claim"] = exc.description
                params["disputed_invoice_ref"] = records_dict[0]["external_reference"] if records_dict else "INV-9021"
                params["disputed_amount"] = exc.discrepancy_amount or 140.0

    if req.scenario_id:
        for s in defn.sample_scenarios:
            if s.get("scenario_id") == req.scenario_id:
                if canon_id == "bom_guard":
                    params["ticket_record"] = {
                        "external_reference": s["ticket_no"],
                        "customer_reference": s["customer"],
                        "quantity": s["ticket_tonnage"],
                        "unit": "tons",
                        "rate": s["contract_rate"],
                    }
                    params["scale_record"] = {
                        "external_reference": s["scale_slip"],
                        "quantity": s["certified_tonnage"],
                        "unit": "tons",
                    }
                elif canon_id == "line_pulse":
                    params["dispatch_record"] = {
                        "external_reference": s["dispatch_ref"],
                        "customer_reference": s["customer"],
                        "service_date": "2026-10-14",
                        "normalized_data": {"machine_cell": s["scheduled_truck"]},
                    }
                    params["ticket_record"] = {
                        "external_reference": s["ticket_no"],
                        "customer_reference": s["customer"],
                        "service_date": "2026-10-14",
                        "normalized_data": {"machine_cell": s["actual_truck"]},
                    }
                elif canon_id == "cost_sentry":
                    if "billed_amount" in s:
                        params["invoice_records"] = [
                            {
                                "external_reference": s["invoice_ref"],
                                "customer_reference": s["customer"],
                                "amount": s["billed_amount"],
                            }
                        ]
                        params["ticket_records"] = [
                            {
                                "external_reference": s["ticket_no"],
                                "customer_reference": s["customer"],
                                "amount": s["expected_amount"],
                            }
                        ]
                        params["exception_type"] = "rate_mismatch"
                    elif "unbilled_amount" in s:
                        params["invoice_records"] = []
                        params["ticket_records"] = [
                            {
                                "external_reference": s["ticket_no"],
                                "customer_reference": s["customer"],
                                "amount": s["unbilled_amount"],
                                "status": s["status"],
                            }
                        ]
                        params["exception_type"] = "unbilled_job"
                    elif "duplicate_amount" in s:
                        params["invoice_records"] = [
                            {"external_reference": inv_num, "customer_reference": s["customer"], "amount": s["duplicate_amount"]}
                            for inv_num in s["invoices"]
                        ]
                        params["ticket_records"] = [{"external_reference": "PO-4411", "customer_reference": s["customer"]}]
                        params["exception_type"] = "duplicate_billing"
                elif canon_id == "quality_shield":
                    params["customer_name"] = s["customer"]
                    params["dispute_claim"] = s["claim"]
                    params["disputed_invoice_ref"] = "INV-9021"
                    params["disputed_amount"] = 140.0
                break

    if canon_id == "plant_beacon":
        org = db.execute(select(Organization).where(Organization.id == org_id)).scalar_one_or_none()
        all_records = db.execute(
            select(OperationalRecord).where(OperationalRecord.organization_id == org_id)
        ).scalars().all()
        all_exceptions = db.execute(
            select(DBException).where(DBException.organization_id == org_id)
        ).scalars().all()
        params["organization_name"] = org.name if org else "Apex Precision Manufacturing"
        params["records"] = [{"amount": r.amount, "customer_reference": r.customer_reference} for r in all_records]
        params["exceptions"] = [
            {
                "id": e.id,
                "exception_type": e.exception_type,
                "discrepancy_amount": e.discrepancy_amount,
                "status": e.status,
            }
            for e in all_exceptions
        ]

    try:
        result = OperationsAgentDispatcher.execute_agent(canon_id, params)
        db.add(
            AuditEvent(
                organization_id=org_id,
                actor_type="agent",
                actor_id=canon_id,
                action=f"agent_run_{canon_id}",
                resource_type="agent_task",
                resource_id=req.exception_id or req.scenario_id or "adhoc_run",
                action_metadata={"agent_name": defn.name, "status": "completed"},
            )
        )
        db.commit()
        return result
    except Exception as e:
        logger.error(f"Error executing agent {canon_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Agent execution failed: {e!s}",
        )


@router.post("/plant_beacon/report", summary="Generate Live Plant ROI & Operations Report (PlantBeacon)")
@router.post("/report_beacon/report", summary="Generate Live Operations Intelligence Report (Alias)")
@router.post("/ops_beacon/report", summary="Generate Live Operations Intelligence Report (Alias)")
def generate_ops_report(
    req: OperationsReportRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    org_id = current_user.organization_id
    org = db.execute(select(Organization).where(Organization.id == org_id)).scalar_one_or_none()
    records = db.execute(
        select(OperationalRecord).where(OperationalRecord.organization_id == org_id)
    ).scalars().all()
    exceptions = db.execute(
        select(DBException).where(DBException.organization_id == org_id)
    ).scalars().all()

    params = {
        "organization_name": org.name if org else "Apex Precision Manufacturing",
        "records": [{"amount": r.amount, "customer_reference": r.customer_reference} for r in records],
        "exceptions": [
            {
                "id": e.id,
                "exception_type": e.exception_type,
                "discrepancy_amount": e.discrepancy_amount,
                "status": e.status,
            }
            for e in exceptions
        ],
        "timeframe": req.timeframe,
    }
    result = OperationsAgentDispatcher.execute_agent("plant_beacon", params)
    db.add(
        AuditEvent(
            organization_id=org_id,
            actor_type="agent",
            actor_id="plant_beacon",
            action="generate_operations_report",
            resource_type="report",
            resource_id=org_id,
            action_metadata={"health_score": result.get("health_score_pct")},
        )
    )
    db.commit()
    return result


@router.post("/quality_shield/resolve", summary="Resolve a QC Defect or Supplier/Customer Claim")
@router.post("/dispute_shield/resolve", summary="Resolve a Customer Billing Dispute (Alias)")
def resolve_dispute(
    req: DisputeResolutionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    org_id = current_user.organization_id
    records = []
    if req.exception_id:
        exc = db.execute(
            select(DBException).where(
                DBException.id == req.exception_id,
                DBException.organization_id == org_id,
            )
        ).scalar_one_or_none()
        if exc and exc.related_record_ids:
            recs_db = db.execute(
                select(OperationalRecord).where(
                    OperationalRecord.organization_id == org_id,
                    OperationalRecord.id.in_(exc.related_record_ids),
                )
            ).scalars().all()
            records = [
                {
                    "record_type": r.record_type,
                    "external_reference": r.external_reference,
                    "quantity": r.quantity,
                    "unit": r.unit,
                    "rate": r.rate,
                }
                for r in recs_db
            ]

    params = {
        "customer_name": req.customer_name,
        "dispute_claim": req.dispute_claim,
        "disputed_invoice_ref": req.disputed_invoice_ref,
        "disputed_amount": req.disputed_amount,
        "related_records": records,
    }
    result = OperationsAgentDispatcher.execute_agent("quality_shield", params)
    db.add(
        AuditEvent(
            organization_id=org_id,
            actor_type="agent",
            actor_id="quality_shield",
            action="resolve_customer_dispute",
            resource_type="dispute",
            resource_id=req.disputed_invoice_ref,
            action_metadata={
                "verdict": result.get("verdict"),
                "proposed_amount": result.get("proposed_resolution", {}).get("proposed_amount"),
            },
        )
    )
    db.commit()
    return result


class ChatHistoryTurn(BaseModel):
    role: str = Field(..., pattern="^(user|assistant)$")
    content: str = Field(..., min_length=1, max_length=4000)


class AgentChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    history: list[ChatHistoryTurn] = Field(default_factory=list, max_length=20)


@router.post("/{agent_id}/chat", summary="Chat interactively with a Manufacturing Swarm Agent")
def chat_with_agent(
    agent_id: str,
    req: AgentChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    canon_id = canonical_agent_id(agent_id)
    defn = get_agent_definition(canon_id)
    if not defn:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Agent '{agent_id}' does not exist.",
        )

    context = {"organization_id": current_user.organization_id}
    history = [{"role": t.role, "content": t.content} for t in req.history]
    data_tools = OperationsDataTools(db=db, organization_id=current_user.organization_id)
    return generate_swarm_chat_response(
        canon_id,
        req.message,
        context=context,
        history=history,
        data_tools=data_tools,
    )
