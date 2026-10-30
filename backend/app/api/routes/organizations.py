
from backend.app.db.models.organization import Organization
from backend.app.db.session import get_db
from backend.app.schemas.organization import OrganizationCreate, OrganizationResponse
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

router = APIRouter(prefix="/organizations", tags=["Organizations"])

@router.get("", response_model=list[OrganizationResponse])
def list_organizations(db: Session = Depends(get_db)):
    orgs = db.execute(select(Organization)).scalars().all()
    return [OrganizationResponse.model_validate(o) for o in orgs]

@router.post("", response_model=OrganizationResponse)
def create_organization(req: OrganizationCreate, db: Session = Depends(get_db)):
    org = Organization(name=req.name)
    db.add(org)
    db.commit()
    db.refresh(org)
    return OrganizationResponse.model_validate(org)
