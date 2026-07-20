"""Seed the cloud database with default data: panel types, and a default super-admin tenant."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from datetime import datetime
from app.models.all import Base, PanelType, Tenant, User, TenantTheme, get_engine, get_session
from app.config import settings

engine = get_engine(settings.database_url)
# Create tables if not exists (they should already be there from migrations)
Base.metadata.create_all(engine)
session = get_session(engine)

# ── Panel Types ──

panel_types = [
    {"code": "kpi", "name": "KPI Metric", "description": "Single large number with label", "icon": "📊", "default_config": {"format": "currency", "refresh_minutes": 30}, "supports_tier": "tier2"},
    {"code": "line_chart", "name": "Line Chart", "description": "Time-series line chart", "icon": "📈", "default_config": {"x_axis": "date", "y_axis": "sales", "refresh_minutes": 30}, "supports_tier": "tier2"},
    {"code": "bar_chart", "name": "Bar Chart", "description": "Categorical bar chart", "icon": "📊", "default_config": {"group_by": "department", "refresh_minutes": 60}, "supports_tier": "tier3"},
    {"code": "pie_chart", "name": "Pie Chart", "description": "Distribution pie/donut chart", "icon": "🥧", "default_config": {"group_by": "tender_type", "refresh_minutes": 30}, "supports_tier": "tier2"},
    {"code": "data_table", "name": "Data Table", "description": "Sortable paginated table", "icon": "📋", "default_config": {"rows_per_page": 25, "refresh_minutes": 30}, "supports_tier": "tier2"},
    {"code": "gauge", "name": "Gauge Chart", "description": "Target vs actual gauge", "icon": "🎯", "default_config": {"min": 0, "max": 100, "target": 80, "refresh_minutes": 60}, "supports_tier": "tier3"},
    {"code": "security_events", "name": "Security Events", "description": "Real-time security event feed", "icon": "🔒", "default_config": {"event_types": ["cancelled","no_sale","voided"], "refresh_minutes": 2}, "supports_tier": "tier1"},
    {"code": "currency_rates", "name": "Currency Rates", "description": "Live FX rate display", "icon": "💱", "default_config": {"currencies": ["NZD","AUD","USD","FJD"], "refresh_minutes": 60}, "supports_tier": "tier5"},
    {"code": "staff_performance", "name": "Staff Performance", "description": "Sales per clerk", "icon": "👤", "default_config": {"metric": "nett_sales_inc", "refresh_minutes": 60}, "supports_tier": "tier3"},
    {"code": "site_health", "name": "Site Health", "description": "Per-site data flow status", "icon": "🟢", "default_config": {"show_heartbeats": True, "refresh_minutes": 1}, "supports_tier": "tier1"},
    {"code": "daily_summary", "name": "Daily Summary", "description": "Yesterday's totals", "icon": "📅", "default_config": {"include_comparison": "last_week", "refresh_minutes": 1440}, "supports_tier": "tier4"},
    {"code": "tender_breakdown", "name": "Tender Breakdown", "description": "Payment method split", "icon": "💳", "default_config": {"group_by": "tender_type", "refresh_minutes": 30}, "supports_tier": "tier2"},
]

for pt in panel_types:
    existing = session.query(PanelType).filter_by(code=pt["code"]).first()
    if not existing:
        session.add(PanelType(**pt))

# ── Default Super-Admin Tenant ──
import bcrypt

existing_tenant = session.query(Tenant).filter_by(slug="admin").first()
if not existing_tenant:
    tenant = Tenant(
        name="PT Dashboard Admin",
        slug="admin",
        contact_email="patrick@nextlevelpos.co.nz",
        billing_status="trial",
        billing_plan="enterprise",
        max_sites=9999,
        max_panels=9999,
        max_users=9999,
        data_retention_days=9999,
    )
    session.add(tenant)
    session.flush()

    # Default theme
    session.add(TenantTheme(tenant_id=tenant.id))

    # Hash password with bcrypt directly
    pwd_hash = bcrypt.hashpw(b"admin", bcrypt.gensalt()).decode()
    session.add(User(
        tenant_id=tenant.id,
        email="patrick@nextlevelpos.co.nz",
        password_hash=pwd_hash,
        display_name="Pat",
        role="super_admin",
    ))

print("Seeding...")
session.commit()
session.close()
print("Seed data committed successfully!")

# Print what was seeded
engine2 = get_engine(settings.database_url)
with engine2.connect() as conn:
    from sqlalchemy import text
    result = conn.execute(text("SELECT code, name FROM panel_types ORDER BY code"))
    print("\nPanel types seeded:")
    for row in result:
        print(f"  {row.code:25s} {row.name}")
    result2 = conn.execute(text("SELECT name, slug, billing_plan FROM tenants"))
    print("\nTenants:")
    for row in result2:
        print(f"  {row.name} ({row.slug}) — plan: {row.billing_plan}")
    result3 = conn.execute(text("SELECT email, display_name, role FROM users"))
    print("\nUsers:")
    for row in result3:
        print(f"  {row.email} — {row.display_name} ({row.role})")
