"""Auth routes: tenant signup, login, token refresh."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.all import Tenant, User, TenantTheme
from app.auth import create_jwt, verify_password, hash_password, get_current_user

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


# ── Schemas ──

class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    company_name: str
    company_slug: str
    email: str
    password: str
    display_name: str


class TokenResponse(BaseModel):
    access_token: str
    tenant_id: int
    tenant_slug: str
    role: str
    display_name: str


class MeResponse(BaseModel):
    id: int
    tenant_id: int
    email: str
    display_name: str
    role: str


# ── Routes ──

@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not user.is_active:
        raise HTTPException(401, "Invalid credentials")
    if not verify_password(req.password, user.password_hash):
        raise HTTPException(401, "Invalid credentials")
    user.last_login_at = __import__("datetime").datetime.utcnow()
    db.commit()
    tenant = db.query(Tenant).filter(Tenant.id == user.tenant_id).first()
    token = create_jwt(user.id, user.tenant_id, user.email, user.role)
    return TokenResponse(
        access_token=token,
        tenant_id=user.tenant_id,
        tenant_slug=tenant.slug if tenant else "",
        role=user.role,
        display_name=user.display_name,
    )


@router.post("/register", response_model=TokenResponse)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    # Check slug uniqueness
    if db.query(Tenant).filter(Tenant.slug == req.company_slug).first():
        raise HTTPException(409, "Company slug already taken")
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(409, "Email already registered")

    tenant = Tenant(
        name=req.company_name,
        slug=req.company_slug,
        contact_email=req.email,
    )
    db.add(tenant)
    db.flush()

    # Default theme
    db.add(TenantTheme(tenant_id=tenant.id))

    user = User(
        tenant_id=tenant.id,
        email=req.email,
        password_hash=hash_password(req.password),
        display_name=req.display_name,
        role="tenant_admin",
    )
    db.add(user)
    db.commit()

    token = create_jwt(user.id, tenant.id, user.email, user.role)
    return TokenResponse(
        access_token=token,
        tenant_id=tenant.id,
        tenant_slug=tenant.slug,
        role=user.role,
        display_name=user.display_name,
    )


@router.get("/me", response_model=MeResponse)
def me(user: User = Depends(get_current_user)):
    return MeResponse(
        id=user.id,
        tenant_id=user.tenant_id,
        email=user.email,
        display_name=user.display_name,
        role=user.role,
    )
