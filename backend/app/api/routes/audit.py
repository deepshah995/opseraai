
from backend.app.api.dependencies import get_current_user
from backend.app.db.models.audit import AuditEvent
from backend.app.db.models.user import User
from backend.app.db.session import get_db
from backend.app.schemas.audit import AuditEventResponse
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

router = APIRouter(prefix="/audit", tags=["Audit Trail"])

@router.get("", response_model=list[AuditEventResponse])
def list_audit_events(
    resource_type: str | None = Query(None),
    limit: int = Query(50, le=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = select(AuditEvent).where(
        AuditEvent.organization_id == current_user.organization_id
    )
    if resource_type:
        query = query.where(AuditEvent.resource_type == resource_type)

    query = query.order_by(AuditEvent.created_at.desc()).limit(limit)
    events = db.execute(query).scalars().all()
    return [AuditEventResponse.model_validate(e) for e in events]
