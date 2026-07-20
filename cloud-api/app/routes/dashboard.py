"""Dashboard panel & theme routes."""
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.all import DashboardPanel, PanelType, TenantTheme
from app.auth import get_current_user, get_current_tenant

router = APIRouter(prefix="/api/v1/dashboard", tags=["dashboard"])


# ── Schemas ──

class PanelTypeResponse(BaseModel):
    id: int
    code: str
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None
    default_config: dict
    supports_tier: Optional[str] = None
    class Config: from_attributes = True


class PanelCreate(BaseModel):
    panel_type_id: int
    title: str
    config: dict = {}
    role_access: list = []
    position: int = 0


class PanelResponse(BaseModel):
    id: int
    panel_type_id: int
    panel_type_name: Optional[str] = None
    panel_type_code: Optional[str] = None
    title: str
    config: dict
    role_access: list
    position: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    class Config: from_attributes = True


class ThemeResponse(BaseModel):
    primary_color: str
    secondary_color: str
    accent_color: str
    background_color: str
    surface_color: str
    text_color: str
    font_family: str
    logo_url: Optional[str] = None
    dark_mode_default: bool
    layout_preset: str
    panel_border_radius: int
    class Config: from_attributes = True


class ThemeUpdate(BaseModel):
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    accent_color: Optional[str] = None
    background_color: Optional[str] = None
    surface_color: Optional[str] = None
    text_color: Optional[str] = None
    font_family: Optional[str] = None
    logo_url: Optional[str] = None
    dark_mode_default: Optional[bool] = None
    layout_preset: Optional[str] = None
    panel_border_radius: Optional[int] = None


# ── Panel Types ──

@router.get("/panel-types", response_model=List[PanelTypeResponse])
def list_panel_types(db: Session = Depends(get_db)):
    return db.query(PanelType).filter(PanelType.is_active == True).order_by(PanelType.code).all()


# ── Panels ──

@router.get("/panels", response_model=List[PanelResponse])
def list_panels(db: Session = Depends(get_db), user=Depends(get_current_user)):
    panels = db.query(DashboardPanel).filter(
        DashboardPanel.tenant_id == user.tenant_id,
        DashboardPanel.is_active == True,
    ).order_by(DashboardPanel.position).all()
    return [_enrich_panel(p, db) for p in panels]


@router.post("/panels", response_model=PanelResponse, status_code=201)
def create_panel(req: PanelCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    panel = DashboardPanel(
        tenant_id=user.tenant_id,
        panel_type_id=req.panel_type_id,
        title=req.title,
        config=req.config,
        role_access=req.role_access,
        position=req.position,
        created_by=user.id,
    )
    db.add(panel)
    db.commit()
    db.refresh(panel)
    return _enrich_panel(panel, db)


@router.patch("/panels/{panel_id}", response_model=PanelResponse)
def update_panel(panel_id: int, req: PanelCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    panel = db.query(DashboardPanel).filter(
        DashboardPanel.id == panel_id,
        DashboardPanel.tenant_id == user.tenant_id,
    ).first()
    if not panel:
        raise HTTPException(404, "Panel not found")
    panel.panel_type_id = req.panel_type_id
    panel.title = req.title
    panel.config = req.config
    panel.role_access = req.role_access
    panel.position = req.position
    panel.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(panel)
    return _enrich_panel(panel, db)


@router.delete("/panels/{panel_id}")
def delete_panel(panel_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    panel = db.query(DashboardPanel).filter(
        DashboardPanel.id == panel_id,
        DashboardPanel.tenant_id == user.tenant_id,
    ).first()
    if not panel:
        raise HTTPException(404, "Panel not found")
    panel.is_active = False
    db.commit()
    return {"ok": True}


@router.get("/panels/{panel_id}/data")
def get_panel_data(panel_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """
    Fetch data for a panel based on its configured query.
    Returns data appropriate to the panel type.
    """
    panel = db.query(DashboardPanel).filter(
        DashboardPanel.id == panel_id,
        DashboardPanel.tenant_id == user.tenant_id,
    ).first()
    if not panel:
        raise HTTPException(404, "Panel not found")

    pt = db.query(PanelType).filter(PanelType.id == panel.panel_type_id).first()
    panel_type = pt.code if pt else "unknown"
    cfg = panel.config or {}

    # Return data based on panel type
    if panel_type == "kpi":
        return _get_kpi_data(db, user.tenant_id, cfg)
    elif panel_type == "security_events":
        return _get_security_events(db, user.tenant_id, cfg)
    elif panel_type in ("line_chart", "bar_chart"):
        return _get_chart_data(db, user.tenant_id, cfg)
    elif panel_type == "pie_chart":
        return _get_distribution_data(db, user.tenant_id, cfg)
    elif panel_type == "data_table":
        return _get_table_data(db, user.tenant_id, cfg)
    elif panel_type == "site_health":
        return _get_health_data(db, user.tenant_id, cfg)
    else:
        return {"panel_id": panel_id, "type": panel_type, "data": [], "note": "Data implementation pending"}


def _get_kpi_data(db, tenant_id, cfg):
    """Today's sales total."""
    from sqlalchemy import func, text
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    result = db.query(
        func.coalesce(func.sum(EJTransaction.sale_total), 0),
        func.coalesce(func.count(EJTransaction.id), 0),
    ).filter(
        EJTransaction.tenant_id == tenant_id,
        EJTransaction.transaction_date >= today,
    ).first()
    return {"value": float(result[0]), "count": int(result[1]), "label": "Today's Sales", "format": "currency"}


def _get_security_events(db, tenant_id, cfg):
    """Recent security events."""
    event_types = cfg.get("event_types", ["cancelled", "no_sale", "voided"])
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    from app.models.all import EJSecurityEvent
    events = db.query(EJSecurityEvent).filter(
        EJSecurityEvent.tenant_id == tenant_id,
        EJSecurityEvent.transaction_date >= today,
        EJSecurityEvent.event_type.in_(event_types),
    ).order_by(EJSecurityEvent.transaction_date.desc()).limit(50).all()
    return {"events": [{
        "type": e.event_type,
        "date": e.transaction_date.isoformat(),
        "clerk": e.clerk_name,
        "register": e.register_number,
        "total": e.sale_total,
        "details": e.details,
    } for e in events]}


def _get_chart_data(db, tenant_id, cfg):
    """Sales over time."""
    from sqlalchemy import func, text
    days = cfg.get("days", 7)
    since = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    from datetime import timedelta
    since = since - timedelta(days=days)
    from app.models.all import SiteDailySummary
    rows = db.query(SiteDailySummary).filter(
        SiteDailySummary.tenant_id == tenant_id,
        SiteDailySummary.summary_date >= since,
    ).order_by(SiteDailySummary.summary_date).all()
    return {"labels": [r.summary_date.strftime("%Y-%m-%d") for r in rows],
            "values": [float(r.nett_sales_inc) for r in rows],
            "label": "Daily Sales"}


def _get_distribution_data(db, tenant_id, cfg):
    """Payment method distribution."""
    from sqlalchemy import func
    group_by = cfg.get("group_by", "tender_type")
    results = db.query(
        EJTender.tender_type,
        func.sum(EJTender.amount),
        func.count(EJTender.id),
    ).filter(EJTender.tenant_id == tenant_id).group_by(EJTender.tender_type).order_by(func.sum(EJTender.amount).desc()).all()
    return {"labels": [r[0] for r in results], "values": [float(r[1]) for r in results], "counts": [int(r[2]) for r in results]}


def _get_table_data(db, tenant_id, cfg):
    """Recent transactions table."""
    # This will be filled with EJ data once ingested
    return {"columns": ["Transaction #", "Date", "Total", "Clerk", "Type"], "rows": []}


def _get_health_data(db, tenant_id, cfg):
    """Per-site health status."""
    sites = db.query(Site).filter(Site.tenant_id == tenant_id, Site.is_active == True).all()
    result = []
    for s in sites:
        hb = db.query(SiteHeartbeat).filter(
            SiteHeartbeat.site_id == s.id
        ).order_by(SiteHeartbeat.last_seen_at.desc()).first()
        status = "red"
        if hb:
            age = (datetime.utcnow() - hb.last_seen_at).total_seconds()
            status = "green" if age < 600 else "yellow" if age < 1800 else "red"
        result.append({"site_id": s.id, "name": s.name, "status": status,
                       "last_seen": hb.last_seen_at.isoformat() if hb else None})
    return {"sites": result}


def _enrich_panel(panel, db):
    pt = db.query(PanelType).filter(PanelType.id == panel.panel_type_id).first()
    return PanelResponse(
        id=panel.id, panel_type_id=panel.panel_type_id,
        panel_type_name=pt.name if pt else None,
        panel_type_code=pt.code if pt else None,
        title=panel.title, config=panel.config, role_access=panel.role_access,
        position=panel.position, is_active=panel.is_active,
        created_at=panel.created_at, updated_at=panel.updated_at,
    )


# ── Theme ──

@router.get("/theme", response_model=ThemeResponse)
def get_theme(db: Session = Depends(get_db), user=Depends(get_current_user)):
    theme = db.query(TenantTheme).filter(TenantTheme.tenant_id == user.tenant_id).first()
    if not theme:
        theme = TenantTheme(tenant_id=user.tenant_id)
        db.add(theme)
        db.commit()
        db.refresh(theme)
    return theme


@router.put("/theme", response_model=ThemeResponse)
def update_theme(req: ThemeUpdate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    theme = db.query(TenantTheme).filter(TenantTheme.tenant_id == user.tenant_id).first()
    if not theme:
        theme = TenantTheme(tenant_id=user.tenant_id)
        db.add(theme)
    for field, value in req.model_dump(exclude_unset=True).items():
        setattr(theme, field, value)
    db.commit()
    db.refresh(theme)
    return theme


# Import at module level to avoid circular imports
from app.models.all import Site, SiteHeartbeat
