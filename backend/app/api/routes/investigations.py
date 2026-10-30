from backend.app.api.dependencies import get_current_user
from backend.app.db.models.approval import Approval
from backend.app.db.models.evidence import Evidence
from backend.app.db.models.investigation import Investigation
from backend.app.db.models.record import OperationalRecord
from backend.app.db.models.user import User
from backend.app.db.session import get_db
from backend.app.schemas.evidence import EvidenceResponse
from backend.app.schemas.investigation import (
    InvestigationDetailResponse,
    InvestigationTriggerRequest,
)
from backend.app.schemas.record import OperationalRecordResponse
from backend.app.services.investigations import InvestigationService
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

router = APIRouter(prefix="/investigations", tags=["Investigations"])

@router.post("/trigger", response_model=InvestigationDetailResponse)
def trigger_investigation(
    req: InvestigationTriggerRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        inv = InvestigationService.trigger_investigation(
            db=db,
            organization_id=current_user.organization_id,
            exception_id=req.exception_id,
            user_notes=req.user_notes,
        )
        return _build_detail_response(db, inv, current_user.organization_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Investigation failed: {e!s}")

@router.get("/{investigation_id}", response_model=InvestigationDetailResponse)
def get_investigation(
    investigation_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    inv = db.execute(
        select(Investigation).where(
            Investigation.id == investigation_id,
            Investigation.organization_id == current_user.organization_id,
        )
    ).scalar_one_or_none()
    if not inv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investigation not found.")

    return _build_detail_response(db, inv, current_user.organization_id)

@router.get("/by-exception/{exception_id}", response_model=InvestigationDetailResponse)
def get_investigation_by_exception(
    exception_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    inv = db.execute(
        select(Investigation)
        .where(
            Investigation.exception_id == exception_id,
            Investigation.organization_id == current_user.organization_id,
        )
        .order_by(Investigation.created_at.desc())
    ).scalars().first()

    if not inv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No investigation found for this exception.")

    return _build_detail_response(db, inv, current_user.organization_id)

def _build_detail_response(db: Session, inv: Investigation, org_id: str) -> InvestigationDetailResponse:
    # Fetch evidence items
    ev_items = db.execute(
        select(Evidence).where(
            Evidence.investigation_id == inv.id,
            Evidence.organization_id == org_id,
        )
    ).scalars().all()

    # Fetch related operational records
    record_ids = []
    if inv.input_snapshot and "exception" in inv.input_snapshot:
        exc_dict = inv.input_snapshot["exception"]
    # Check related record IDs from evidence or exception
    for ev in ev_items:
        if ev.source_record_id:
            record_ids.append(ev.source_record_id)

    related_records = []
    if record_ids:
        records_db = db.execute(
            select(OperationalRecord).where(
                OperationalRecord.id.in_(record_ids),
                OperationalRecord.organization_id == org_id,
            )
        ).scalars().all()
        related_records = [OperationalRecordResponse.model_validate(r) for r in records_db]

    # Fetch pending approval if any
    pending_approval = db.execute(
        select(Approval.id).where(
            Approval.investigation_id == inv.id,
            Approval.decision == "pending",
        )
    ).scalar_one_or_none()

    resp = InvestigationDetailResponse.model_validate(inv)
    resp.evidence_items = [EvidenceResponse.model_validate(e) for e in ev_items]
    resp.related_records = related_records
    resp.pending_approval_id = pending_approval
    return resp
