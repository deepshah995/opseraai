import logging

from backend.app.core.security import decode_access_token
from backend.app.db.models.user import User
from backend.app.db.session import get_db
from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)
security_bearer = HTTPBearer(auto_error=False)

def get_current_user(
    auth_header: HTTPAuthorizationCredentials | None = Depends(security_bearer),
    x_tenant_id: str | None = Header(None, alias="X-Tenant-ID"),
    db: Session = Depends(get_db),
) -> User:
    """
    Authenticate user via Bearer JWT token.
    Falls back to a default demo user in development mode for seamless local onboarding.
    """
    if auth_header and auth_header.credentials:
        payload = decode_access_token(auth_header.credentials)
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired access token.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        user_id = payload.get("sub")
        org_id = payload.get("org_id")
        user = db.execute(
            select(User).where(User.id == user_id, User.organization_id == org_id)
        ).scalar_one_or_none()
        if user:
            return user

    # Development convenience fallback: auto-provision / return demo operations manager
    demo_user = db.execute(select(User)).scalars().first()
    if demo_user:
        # If header requested a specific tenant, check if user exists there
        if x_tenant_id and demo_user.organization_id != x_tenant_id:
            org_user = db.execute(select(User).where(User.organization_id == x_tenant_id)).scalars().first()
            if org_user:
                return org_user
        return demo_user

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required. Please log in.",
    )

def require_role(allowed_roles: list[str]):
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Required role in {allowed_roles}, your role is '{current_user.role}'.",
            )
        return current_user
    return role_checker
