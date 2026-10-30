
from backend.app.api.dependencies import get_current_user
from backend.app.db.models.exception import Exception as DBException
from backend.app.db.models.user import User
from backend.app.db.session import get_db
from backend.app.schemas.exception import (
    ExceptionResponse,
    ExceptionStats,
    ExceptionUpdate,
)
from backend.app.services.exception_detection import ExceptionDetectionService
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

router = APIRouter(prefix="/exceptions", tags=["Exceptions"])

@router.get("", response_model=list[ExceptionResponse])
def list_exceptions(
    status_filter: str | None = Query(None, alias="status"),
    severity: str | None = Query(None),
    exception_type: str | None = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = select(DBException).where(
        DBException.organization_id == current_user.organization_id
    )
    if status_filter:
        query = query.where(DBException.status == status_filter)
    if severity:
        query = query.where(DBException.severity == severity)
    if exception_type:
        query = query.where(DBException.exception_type == exception_type)

    query = query.order_by(DBException.detected_at.desc()).offset(offset).limit(limit)
    exceptions = db.execute(query).scalars().all()
    return [ExceptionResponse.model_validate(e) for e in exceptions]

@router.get("/stats", response_model=ExceptionStats)
def get_exception_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    org_id = current_user.organization_id
    exceptions = db.execute(
        select(DBException).where(DBException.organization_id == org_id)
    ).scalars().all()

    total = len(exceptions)
    open_c = sum(1 for e in exceptions if e.status == "open")
    investigating_c = sum(1 for e in exceptions if e.status == "investigating")
    awaiting_c = sum(1 for e in exceptions if e.status == "awaiting_approval")
    resolved_c = sum(1 for e in exceptions if e.status in ("resolved", "approved"))

    crit_c = sum(1 for e in exceptions if e.severity == "critical")
    high_c = sum(1 for e in exceptions if e.severity == "high")
    med_c = sum(1 for e in exceptions if e.severity == "medium")
    low_c = sum(1 for e in exceptions if e.severity == "low")

    total_amount = sum(e.discrepancy_amount or 0.0 for e in exceptions if e.status not in ("resolved", "dismissed"))

    by_type: dict[str, int] = {}
    for e in exceptions:
        by_type[e.exception_type] = by_type.get(e.exception_type, 0) + 1

    return ExceptionStats(
        total_exceptions=total,
        open_count=open_c,
        investigating_count=investigating_c,
        awaiting_approval_count=awaiting_c,
        resolved_count=resolved_c,
        critical_count=crit_c,
        high_count=high_c,
        medium_count=med_c,
        low_count=low_c,
        total_discrepancy_amount=round(total_amount, 2),
        by_type=by_type,
    )

@router.post("/detect", response_model=list[ExceptionResponse])
def run_detection(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    detected = ExceptionDetectionService.run_detection_for_organization(
        db=db,
        organization_id=current_user.organization_id,
    )
    if not detected:
        detected = db.execute(
            select(DBException).where(DBException.organization_id == current_user.organization_id)
        ).scalars().all()
    return [ExceptionResponse.model_validate(e) for e in detected]

@router.get("/{exception_id}", response_model=ExceptionResponse)
def get_exception(
    exception_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    exc = db.execute(
        select(DBException).where(
            DBException.id == exception_id,
            DBException.organization_id == current_user.organization_id,
        )
    ).scalar_one_or_none()
    if not exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exception not found.")
    return ExceptionResponse.model_validate(exc)

@router.patch("/{exception_id}", response_model=ExceptionResponse)
def update_exception(
    exception_id: str,
    req: ExceptionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    exc = db.execute(
        select(DBException).where(
            DBException.id == exception_id,
            DBException.organization_id == current_user.organization_id,
        )
    ).scalar_one_or_none()
    if not exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exception not found.")

    if req.status:
        exc.status = req.status
    if req.severity:
        exc.severity = req.severity
    if req.assigned_to:
        exc.assigned_to = req.assigned_to
    if req.title:
        exc.title = req.title
    if req.description:
        exc.description = req.description

    db.commit()
    db.refresh(exc)
    return ExceptionResponse.model_validate(exc)
