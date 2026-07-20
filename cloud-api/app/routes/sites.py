"""Site management routes."""
import secrets
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db import get_db
from app.models.all import Site, SiteApiKey, SiteHeartbeat
from app.auth import get_current_user, get_current_tenant, hash_password

router = APIRouter(prefix="/api/v1/sites", tags=["sites"])


class SiteCreate(BaseModel):
    name: str
    store_code: str
    timezone: str = "Pacific/Auckland"


class SiteResponse(BaseModel):
    id: int
    name: str
    store_code: str
    timezone: str
    is_active: bool
    api_key_prefix: Optional[str] = None
    last_heartbeat: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class SiteApiKeyResponse(BaseModel):
    api_key: str  # Only returned once at creation
    key_prefix: str


@router.post("", response_model=SiteResponse, status_code=201)
def create_site(req: SiteCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    if db.query(Site).filter(Site.tenant_id == user.tenant_id, Site.store_code == req.store_code).first():
        raise HTTPException(409, "Store code already exists for this tenant")
    site = Site(tenant_id=user.tenant_id, name=req.name, store_code=req.store_code, timezone=req.timezone)
    db.add(site)
    db.flush()

    # Generate API key
    raw_key = f"ptsk_{secrets.token_urlsafe(32)}"
    key_hash = hash_password(raw_key)
    db.add(SiteApiKey(site_id=site.id, key_hash=key_hash, key_prefix=raw_key[:12]))
    db.commit()

    resp = SiteResponse.from_orm(site)
    resp.api_key_prefix = raw_key[:12]
    return resp


@router.get("", response_model=List[SiteResponse])
def list_sites(db: Session = Depends(get_db), user=Depends(get_current_user)):
    sites = db.query(Site).filter(Site.tenant_id == user.tenant_id).order_by(Site.name).all()
    result = []
    for s in sites:
        r = SiteResponse.from_orm(s)
        if s.api_key:
            r.api_key_prefix = s.api_key.key_prefix
        # Latest heartbeat
        hb = db.query(SiteHeartbeat).filter(
            SiteHeartbeat.site_id == s.id
        ).order_by(SiteHeartbeat.last_seen_at.desc()).first()
        r.last_heartbeat = hb.last_seen_at if hb else None
        result.append(r)
    return result


@router.get("/{site_id}", response_model=SiteResponse)
def get_site(site_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    site = db.query(Site).filter(Site.id == site_id, Site.tenant_id == user.tenant_id).first()
    if not site:
        raise HTTPException(404, "Site not found")
    return site


@router.patch("/{site_id}", response_model=SiteResponse)
def update_site(site_id: int, req: SiteCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    site = db.query(Site).filter(Site.id == site_id, Site.tenant_id == user.tenant_id).first()
    if not site:
        raise HTTPException(404, "Site not found")
    site.name = req.name
    site.store_code = req.store_code
    site.timezone = req.timezone
    db.commit()
    return site


@router.delete("/{site_id}")
def deactivate_site(site_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    site = db.query(Site).filter(Site.id == site_id, Site.tenant_id == user.tenant_id).first()
    if not site:
        raise HTTPException(404, "Site not found")
    site.is_active = False
    if site.api_key:
        site.api_key.is_active = False
    db.commit()
    return {"ok": True, "message": "Site deactivated"}


@router.post("/{site_id}/regenerate-key", response_model=SiteApiKeyResponse)
def regenerate_key(site_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    site = db.query(Site).filter(Site.id == site_id, Site.tenant_id == user.tenant_id).first()
    if not site:
        raise HTTPException(404, "Site not found")
    if site.api_key:
        site.api_key.is_active = False
    raw_key = f"ptsk_{secrets.token_urlsafe(32)}"
    db.add(SiteApiKey(site_id=site.id, key_hash=hash_password(raw_key), key_prefix=raw_key[:12]))
    db.commit()
    return SiteApiKeyResponse(api_key=raw_key, key_prefix=raw_key[:12])
