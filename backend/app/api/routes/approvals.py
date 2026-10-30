
from backend.app.api.dependencies import get_current_user
from backend.app.db.models.approval import Approval
from backend.app.db.models.user import User
from backend.app.db.session import get_db
from backend.app.schemas.approval import ApprovalDecisionRequest, ApprovalResponse
from backend.app.services.investigations import InvestigationService
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

router = APIRouter(prefix="/approvals", tags=["Approvals"])

@router.get("", response_model=list[ApprovalResponse])
def list_approvals(
    decision: str | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = select(Approval).where(Approval.organization_id == current_user.organization_id)
    if decision:
        query = query.where(Approval.decision == decision)
    query = query.order_by(Approval.created_at.desc())
    approvals = db.execute(query).scalars().all()
    return [ApprovalResponse.model_validate(a) for a in approvals]

@router.post("/{approval_id}/review", response_model=ApprovalResponse)
def review_approval(
    approval_id: str,
    req: ApprovalDecisionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        approval = InvestigationService.review_approval(
            db=db,
            organization_id=current_user.organization_id,
            approval_id=approval_id,
            reviewer_id=current_user.id,
            decision=req.decision,
            reviewer_comment=req.reviewer_comment,
        )
        return ApprovalResponse.model_validate(approval)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
