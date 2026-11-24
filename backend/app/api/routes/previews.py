from backend.app.api.dependencies import get_current_user
from backend.app.db.models.user import User
from backend.app.db.session import get_db
from backend.app.schemas.preview import ProspectPreviewCreate, ProspectPreviewResponse
from backend.app.services.prospect_previews import resolve_preview_by_slug, upsert_prospect_preview
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

router = APIRouter(prefix="/previews", tags=["Prospect Audit Previews"])


@router.get(
    "/{slug}",
    response_model=ProspectPreviewResponse,
    summary="Fetch a read-only simulated Ops Audit Preview for a specific prospect slug",
)
def get_prospect_preview(slug: str, db: Session = Depends(get_db)):
    preview = resolve_preview_by_slug(db, slug)
    if preview is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audit preview not found for this prospect link.",
        )
    return preview


@router.post(
    "/generate",
    response_model=ProspectPreviewResponse,
    summary="Generate or update a tailored Ops Audit Preview from lead research signals",
)
def generate_prospect_preview(
    req: ProspectPreviewCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    del current_user
    return upsert_prospect_preview(db, req)
