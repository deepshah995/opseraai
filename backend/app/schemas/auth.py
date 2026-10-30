
from pydantic import BaseModel, EmailStr, Field


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: "UserResponse"

class TokenPayload(BaseModel):
    sub: str
    org_id: str
    role: str
    exp: int

class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    organization_id: str | None = None

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    display_name: str = Field(min_length=1, max_length=255)
    role: str = Field(default="reviewer", pattern="^(admin|operations_manager|reviewer)$")
    organization_id: str | None = None

class UserResponse(BaseModel):
    id: str
    organization_id: str
    email: str
    display_name: str
    role: str

    class Config:
        from_attributes = True
