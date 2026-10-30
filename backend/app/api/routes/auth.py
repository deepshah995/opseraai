from backend.app.api.dependencies import get_current_user
from backend.app.core.security import create_access_token, hash_password, verify_password
from backend.app.db.models.organization import Organization
from backend.app.db.models.user import User
from backend.app.db.session import get_db
from backend.app.schemas.auth import LoginRequest, Token, UserCreate, UserResponse
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=Token)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    query = select(User).where(User.email == req.email)
    if req.organization_id:
        query = query.where(User.organization_id == req.organization_id)
    user = db.execute(query).scalars().first()

    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
        )

    access_token = create_access_token(
        subject=user.id,
        organization_id=user.organization_id,
        role=user.role,
    )
    return Token(
        access_token=access_token,
        token_type="bearer",
        expires_in=86400,
        user=UserResponse.model_validate(user),
    )

@router.post("/register", response_model=UserResponse)
def register(req: UserCreate, db: Session = Depends(get_db)):
    # Create org if none provided
    org_id = req.organization_id
    if not org_id:
        org = Organization(name="Default Industrial Services Corp")
        db.add(org)
        db.flush()
        org_id = org.id

    existing = db.execute(
        select(User).where(User.email == req.email, User.organization_id == org_id)
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already exists in this organization.",
        )

    user = User(
        organization_id=org_id,
        email=req.email,
        hashed_password=hash_password(req.password),
        display_name=req.display_name,
        role=req.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserResponse.model_validate(user)

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)
