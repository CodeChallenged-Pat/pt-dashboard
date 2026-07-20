"""Authentication: JWT, password hashing, tenant isolation dependencies."""
import bcrypt
from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from app.config import settings
from app.db import get_db
from app.models.all import User, Site, SiteApiKey

bearer_scheme = HTTPBearer(auto_error=False)
api_key_header = HTTPBearer(auto_error=False, scheme_name="APIKey")


# ── Password ──

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


# ── JWT ──

def create_jwt(user_id: int, tenant_id: int, email: str, role: str) -> str:
    payload = {
        "sub": str(user_id),
        "tenant_id": tenant_id,
        "email": email,
        "role": role,
        "exp": datetime.utcnow() + timedelta(minutes=settings.jwt_expire_minutes),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_jwt(token: str) -> dict:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


# ── Dashboard User Auth ──

def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if not credentials:
        raise HTTPException(status_code=401, detail="Authorization header required")
    payload = decode_jwt(credentials.credentials)
    user = db.query(User).filter(User.id == int(payload["sub"])).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")
    return user


def get_current_tenant(
    user: User = Depends(get_current_user),
) -> int:
    """Returns tenant_id from the authenticated user."""
    return user.tenant_id


# ── Role Guards ──

def require_role(*roles: str):
    """Dependency factory: only allows users with one of the given roles."""
    def checker(user: User = Depends(get_current_user)):
        if user.role not in roles:
            raise HTTPException(status_code=403, detail=f"Requires one of roles: {roles}")
        return user
    return checker


# ── Site Agent Auth (API Key) ──

def get_current_site(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(api_key_header),
    db: Session = Depends(get_db),
) -> Site:
    if not credentials:
        raise HTTPException(status_code=401, detail="API key required")
    api_key = credentials.credentials
    # Hash the provided key and match
    key_hash = hash_password(api_key)
    # We can't just hash and compare bcrypt salts differ — we need to check ALL active keys
    keys = db.query(SiteApiKey).filter_by(is_active=True).all()
    for k in keys:
        try:
            if verify_password(api_key, k.key_hash):
                k.last_used_at = datetime.utcnow()
                db.commit()
                site = db.query(Site).filter(Site.id == k.site_id).first()
                if not site or not site.is_active:
                    raise HTTPException(status_code=403, detail="Site inactive")
                return site
        except Exception:
            pass
    raise HTTPException(status_code=401, detail="Invalid API key")
