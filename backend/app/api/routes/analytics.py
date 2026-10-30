from typing import Any

from backend.app.api.dependencies import get_current_user
from backend.app.db.models.approval import Approval
from backend.app.db.models.exception import Exception as DBException
from backend.app.db.models.investigation import Investigation
from backend.app.db.models.record import OperationalRecord
from backend.app.db.models.user import User
from backend.app.db.session import get_db
from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/summary")
def get_analytics_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    org_id = current_user.organization_id

    # Count records
    records_count = db.execute(
        select(func.count(OperationalRecord.id)).where(OperationalRecord.organization_id == org_id)
    ).scalar_one()

    # Exceptions
    exceptions = db.execute(
        select(DBException).where(DBException.organization_id == org_id)
    ).scalars().all()

    total_exceptions = len(exceptions)
    open_exceptions = sum(1 for e in exceptions if e.status in ("open", "investigating"))
    awaiting_approval = sum(1 for e in exceptions if e.status == "awaiting_approval")
    resolved_exceptions = sum(1 for e in exceptions if e.status in ("resolved", "approved"))

    at_risk_amount = sum(
        e.discrepancy_amount or 0.0
        for e in exceptions
        if e.status not in ("resolved", "dismissed")
    )

    # Investigations
    investigations = db.execute(
        select(Investigation).where(Investigation.organization_id == org_id)
    ).scalars().all()

    avg_confidence = 0.0
    if investigations:
        confs = [i.confidence for i in investigations if i.confidence is not None]
        if confs:
            avg_confidence = round(sum(confs) / len(confs) * 100.0, 1)

    # Pending approvals
    pending_approvals_count = db.execute(
        select(func.count(Approval.id)).where(
            Approval.organization_id == org_id,
            Approval.decision == "pending",
        )
    ).scalar_one()

    return {
        "total_records": records_count,
        "total_exceptions": total_exceptions,
        "open_exceptions": open_exceptions,
        "awaiting_approval": awaiting_approval,
        "resolved_exceptions": resolved_exceptions,
        "at_risk_discrepancy_amount": round(at_risk_amount, 2),
        "average_investigation_confidence": avg_confidence,
        "pending_human_approvals": pending_approvals_count,
        "reconciliation_health_pct": round(
            (records_count - total_exceptions) / max(records_count, 1) * 100.0, 1
        ) if records_count > 0 else 100.0,
    }
