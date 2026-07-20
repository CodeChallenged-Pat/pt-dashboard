"""User management routes (admin only)."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from typing import List

from app.db import get_db
from app.models.all import User
from app.auth import get_current_user, require_role, hash_password

router = APIRouter(prefix="/api/v1/users", tags=["users"])


class UserCreate(BaseModel):
    email: str
    password: str
    display_name: str
    role: str = "viewer"


class UserResponse(BaseModel):
    id: int
    email: str
    display_name: str
    role: str
    is_active: bool
    class Config: from_attributes = True


class UserUpdate(BaseModel):
    display_name: str | None = None
    role: str | None = None
    is_active: bool | None = None
    password: str | None = None


@router.get("", response_model=List[UserResponse])
def list_users(db: Session = Depends(get_db), user=Depends(require_role("super_admin", "tenant_admin"))):
    return db.query(User).filter(User.tenant_id == user.tenant_id).order_by(User.email).all()


@router.post("", response_model=UserResponse, status_code=201)
def create_user(req: UserCreate, db: Session = Depends(get_db), user=Depends(require_role("super_admin", "tenant_admin"))):
    exists = db.query(User).filter(User.tenant_id == user.tenant_id, User.email == req.email).first()
    if exists:
        raise HTTPException(409, "User already exists")
    new_user = User(
        tenant_id=user.tenant_id, email=req.email,
        password_hash=hash_password(req.password),
        display_name=req.display_name, role=req.role,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.patch("/{user_id}", response_model=UserResponse)
def update_user(user_id: int, req: UserUpdate, db: Session = Depends(get_db), user=Depends(require_role("super_admin", "tenant_admin"))):
    target = db.query(User).filter(User.id == user_id, User.tenant_id == user.tenant_id).first()
    if not target:
        raise HTTPException(404, "User not found")
    if req.display_name is not None:
        target.display_name = req.display_name
    if req.role is not None:
        target.role = req.role
    if req.is_active is not None:
        target.is_active = req.is_active
    if req.password is not None:
        target.password_hash = hash_password(req.password)
    db.commit()
    db.refresh(target)
    return target


@router.delete("/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), user=Depends(require_role("super_admin", "tenant_admin"))):
    target = db.query(User).filter(User.id == user_id, User.tenant_id == user.tenant_id).first()
    if not target:
        raise HTTPException(404, "User not found")
    target.is_active = False
    db.commit()
    return {"ok": True}
