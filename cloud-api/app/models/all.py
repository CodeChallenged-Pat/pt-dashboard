"""PT Dashboard — SQLAlchemy models for the consolidated cloud database.

All multi-tenant tables carry tenant_id for row-level isolation.
"""

from datetime import datetime
from sqlalchemy import (
    Column, Integer, BigInteger, String, Text, Boolean, DateTime,
    Float, ForeignKey, JSON, CheckConstraint, UniqueConstraint, Index,
    create_engine, text,
)
from sqlalchemy.orm import declarative_base, relationship, sessionmaker

Base = declarative_base()

# ─────────────────────────────────────────────────────────────────────
# TENANCY & USERS
# ─────────────────────────────────────────────────────────────────────

class Tenant(Base):
    __tablename__ = "tenants"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False, unique=True)
    slug = Column(String(100), nullable=False, unique=True)
    contact_email = Column(String(255), nullable=False)
    billing_status = Column(String(20), nullable=False, default="trial")  # trial, active, suspended, cancelled
    billing_plan = Column(String(20), nullable=False, default="free")      # free, starter, pro, enterprise
    trial_ends_at = Column(DateTime, nullable=True)
    stripe_customer_id = Column(String(255), nullable=True)
    stripe_subscription_id = Column(String(255), nullable=True)
    max_sites = Column(Integer, nullable=False, default=1)
    max_panels = Column(Integer, nullable=False, default=5)
    max_users = Column(Integer, nullable=False, default=2)
    data_retention_days = Column(Integer, nullable=False, default=30)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    users = relationship("User", back_populates="tenant")
    sites = relationship("Site", back_populates="tenant")
    panels = relationship("DashboardPanel", back_populates="tenant")
    themes = relationship("TenantTheme", back_populates="tenant")


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, autoincrement=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    email = Column(String(255), nullable=False)
    password_hash = Column(String(255), nullable=False)
    display_name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="viewer")  # super_admin, tenant_admin, manager, viewer
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    last_login_at = Column(DateTime, nullable=True)

    __table_args__ = (
        UniqueConstraint("tenant_id", "email", name="uq_tenant_email"),
        Index("ix_users_tenant", "tenant_id"),
        Index("ix_users_email", "email"),
    )

    tenant = relationship("Tenant", back_populates="users")


class UserRole(Base):
    """Available role definitions per tenant (customizable)."""
    __tablename__ = "user_roles"
    id = Column(Integer, primary_key=True, autoincrement=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    name = Column(String(50), nullable=False)  # admin, manager, viewer, custom
    permissions = Column(JSON, nullable=False, default=dict)
    __table_args__ = (
        UniqueConstraint("tenant_id", "name", name="uq_tenant_role"),
    )


# ─────────────────────────────────────────────────────────────────────
# SITE REGISTRY & AUTH
# ─────────────────────────────────────────────────────────────────────

class Site(Base):
    __tablename__ = "sites"
    id = Column(Integer, primary_key=True, autoincrement=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    name = Column(String(255), nullable=False)
    store_code = Column(String(40), nullable=False)
    timezone = Column(String(100), nullable=False, default="Pacific/Auckland")
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("tenant_id", "store_code", name="uq_tenant_storecode"),
        Index("ix_sites_tenant", "tenant_id"),
    )

    tenant = relationship("Tenant", back_populates="sites")
    api_key = relationship("SiteApiKey", back_populates="site", uselist=False)
    heartbeats = relationship("SiteHeartbeat", back_populates="site")


class SiteApiKey(Base):
    __tablename__ = "site_api_keys"
    id = Column(Integer, primary_key=True, autoincrement=True)
    site_id = Column(Integer, ForeignKey("sites.id"), nullable=False, unique=True)
    key_hash = Column(String(255), nullable=False)  # bcrypt hash of the API key
    key_prefix = Column(String(12), nullable=False)   # first 8 chars for display (e.g., "ptsk_...")
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    last_used_at = Column(DateTime, nullable=True)

    site = relationship("Site", back_populates="api_key")


class SiteHeartbeat(Base):
    __tablename__ = "site_heartbeats"
    id = Column(Integer, primary_key=True, autoincrement=True)
    site_id = Column(Integer, ForeignKey("sites.id"), nullable=False)
    tier = Column(String(20), nullable=False)  # tier1, tier2, tier3, tier4, tier5
    last_seen_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    records_sent = Column(Integer, nullable=False, default=0)
    status = Column(String(20), nullable=False, default="ok")  # ok, error, timeout
    details = Column(JSON, nullable=True)

    __table_args__ = (
        Index("ix_heartbeats_site_tier", "site_id", "tier"),
        Index("ix_heartbeats_lastseen", "last_seen_at"),
    )

    site = relationship("Site", back_populates="heartbeats")


# ─────────────────────────────────────────────────────────────────────
# EJ INGEST (Transactional Data)
# ─────────────────────────────────────────────────────────────────────

class EJTransaction(Base):
    """Sale transaction headers from EJHEADER."""
    __tablename__ = "ej_transactions"
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    site_id = Column(Integer, ForeignKey("sites.id"), nullable=False)
    ej_header_id = Column(Integer, nullable=False)            # from PTPos EJHEADER.EJHEADERID
    register_id = Column(Integer, nullable=False)
    register_number = Column(Integer, nullable=False)
    transaction_number = Column(Integer, nullable=False)
    transaction_date = Column(DateTime, nullable=False)
    ej_header_type_id = Column(Integer, nullable=False)       # SALE=1, NO SALE=2, EOD=9, etc.
    ej_header_type = Column(String(30), nullable=False)
    is_finalised = Column(Boolean, nullable=False, default=False)
    is_cancelled = Column(Boolean, nullable=False, default=False)
    is_no_sale = Column(Boolean, nullable=False, default=False)
    is_on_hold = Column(Boolean, nullable=False, default=False)
    sale_total = Column(Float, nullable=False, default=0)
    gst_amount = Column(Float, nullable=False, default=0)
    item_count = Column(Integer, nullable=False, default=0)
    rounding = Column(Float, nullable=False, default=0)
    clerk_number = Column(Integer, nullable=False)
    clerk_name = Column(String(30), nullable=False)
    clerk_shift_id = Column(Integer, nullable=False)
    training_mode = Column(Boolean, nullable=False, default=False)
    receipt_reference = Column(String(15), nullable=True)
    transaction_identifier = Column(String(40), nullable=True)
    ingested_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("site_id", "ej_header_id", name="uq_ej_header_site"),
        Index("ix_ej_trans_tenant", "tenant_id"),
        Index("ix_ej_trans_site", "site_id"),
        Index("ix_ej_trans_date", "transaction_date"),
        Index("ix_ej_trans_type", "ej_header_type_id"),
    )


class EJLineItem(Base):
    """Product line items from EJPLUOBJECT."""
    __tablename__ = "ej_line_items"
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    site_id = Column(Integer, ForeignKey("sites.id"), nullable=False)
    ej_transaction_id = Column(BigInteger, ForeignKey("ej_transactions.id"), nullable=False)
    ej_plu_object_id = Column(Integer, nullable=False)
    ej_detail_id = Column(Integer, nullable=False)
    entry_sequence = Column(Integer, nullable=False)
    plu = Column(String(18), nullable=False)
    product_code = Column(String(20), nullable=True)
    description = Column(String(32), nullable=True)
    caption = Column(String(25), nullable=False)
    quantity = Column(Float, nullable=False, default=0)
    unit_price = Column(Float, nullable=False, default=0)
    nett_amount_inc = Column(Float, nullable=False, default=0)
    gross_amount_inc = Column(Float, nullable=False, default=0)
    nett_amount_ex = Column(Float, nullable=False, default=0)
    gross_amount_ex = Column(Float, nullable=False, default=0)
    gross_gst_amount = Column(Float, nullable=False, default=0)
    nett_gst_amount = Column(Float, nullable=False, default=0)
    cost_price = Column(Float, nullable=False, default=0)
    gst_rate = Column(Float, nullable=False, default=0)
    department_number = Column(Integer, nullable=False)
    department_description = Column(String(30), nullable=False)
    group_number = Column(Integer, nullable=False)
    is_weighed = Column(Boolean, nullable=False, default=False)
    is_second_price_sale = Column(Boolean, nullable=False, default=False)
    is_custom_price_sale = Column(Boolean, nullable=False, default=False)
    is_returned = Column(Boolean, nullable=False, default=False)
    is_voided = Column(Boolean, nullable=False, default=False)
    is_error_corrected = Column(Boolean, nullable=False, default=False)
    loyalty_points = Column(Float, nullable=False, default=0)
    markdown_amount = Column(Float, nullable=False, default=0)
    transaction_date = Column(DateTime, nullable=False)
    ingested_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("site_id", "ej_plu_object_id", name="uq_ej_pluobject_site"),
        Index("ix_ej_li_tenant", "tenant_id"),
        Index("ix_ej_li_site", "site_id"),
        Index("ix_ej_li_trans", "ej_transaction_id"),
        Index("ix_ej_li_date", "transaction_date"),
        Index("ix_ej_li_dept", "department_number"),
        Index("ix_ej_li_voided", "is_voided"),
    )


class EJTender(Base):
    """Payment/tender records from EJTENDEROBJECT."""
    __tablename__ = "ej_tenders"
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    site_id = Column(Integer, ForeignKey("sites.id"), nullable=False)
    ej_transaction_id = Column(BigInteger, ForeignKey("ej_transactions.id"), nullable=False)
    ej_tender_object_id = Column(Integer, nullable=False)
    ej_detail_id = Column(Integer, nullable=False)
    tender_number = Column(Integer, nullable=False)
    tender_type_id = Column(Integer, nullable=False)
    tender_type = Column(String(30), nullable=False)           # CASH, EFTPOS, CHEQUE, etc.
    description = Column(String(30), nullable=True)
    amount = Column(Float, nullable=False, default=0)
    total_amount = Column(Float, nullable=False, default=0)
    eftpos_card_code = Column(String(20), nullable=True)
    eftpos_card_number = Column(String(16), nullable=True)     # masked
    eftpos_account_type_id = Column(Integer, nullable=True)
    eftpos_account_type = Column(String(30), nullable=True)    # SAVINGS, CHEQUE, CREDIT
    currency_code = Column(String(3), nullable=True)
    currency_rate = Column(Float, nullable=True)
    currency_sales_amount = Column(Float, nullable=True)
    is_approved = Column(Boolean, nullable=False, default=False)
    is_account_charge = Column(Boolean, nullable=False, default=False)
    account_number = Column(Integer, nullable=True)
    loyalty_card_number = Column(String(12), nullable=True)
    cheque_bsb = Column(String(30), nullable=True)
    cheque_account = Column(String(30), nullable=True)
    cheque_number = Column(String(20), nullable=True)
    ingested_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("site_id", "ej_tender_object_id", name="uq_ej_tender_site"),
        Index("ix_ej_tender_tenant", "tenant_id"),
        Index("ix_ej_tender_site", "site_id"),
        Index("ix_ej_tender_trans", "ej_transaction_id"),
        Index("ix_ej_tender_type", "tender_type_id"),
    )


class EJDiscount(Base):
    """Discount records from EJDISCOUNTOBJECT."""
    __tablename__ = "ej_discounts"
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    site_id = Column(Integer, ForeignKey("sites.id"), nullable=False)
    ej_transaction_id = Column(BigInteger, ForeignKey("ej_transactions.id"), nullable=False)
    ej_discount_object_id = Column(Integer, nullable=False)
    ej_detail_id = Column(Integer, nullable=False)
    ej_plu_object_id = Column(Integer, nullable=False)
    description = Column(String(30), nullable=True)
    discount_rate = Column(Float, nullable=False, default=0)
    discount_type_id = Column(Integer, nullable=False)
    discount_scope_id = Column(Integer, nullable=False)
    amount = Column(Float, nullable=False, default=0)
    discount_number = Column(Integer, nullable=False)
    is_open = Column(Boolean, nullable=False, default=False)
    ingested_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("site_id", "ej_discount_object_id", name="uq_ej_disc_site"),
        Index("ix_ej_disc_tenant", "tenant_id"),
        Index("ix_ej_disc_trans", "ej_transaction_id"),
    )


class EJSecurityEvent(Base):
    """Security-relevant events: cancels, no-sales, voids, error corrections, holds, adjustments."""
    __tablename__ = "ej_security_events"
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    site_id = Column(Integer, ForeignKey("sites.id"), nullable=False)
    ej_transaction_id = Column(BigInteger, ForeignKey("ej_transactions.id"), nullable=True)
    event_type = Column(String(30), nullable=False)  # cancelled, no_sale, voided, error_corrected, on_hold, adjustment, start_shift, end_shift, end_of_day
    ej_header_id = Column(Integer, nullable=True)
    ej_plu_object_id = Column(Integer, nullable=True)
    transaction_number = Column(Integer, nullable=True)
    transaction_date = Column(DateTime, nullable=False)
    register_number = Column(Integer, nullable=False)
    clerk_number = Column(Integer, nullable=False)
    clerk_name = Column(String(30), nullable=False)
    clerk_shift_id = Column(Integer, nullable=False)
    sale_total = Column(Float, nullable=True)
    item_count = Column(Integer, nullable=True)
    details = Column(JSON, nullable=True)  # extra context (voided item, hold reason, etc.)
    ingested_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        Index("ix_ej_sec_tenant", "tenant_id"),
        Index("ix_ej_sec_site", "site_id"),
        Index("ix_ej_sec_type", "event_type"),
        Index("ix_ej_sec_date", "transaction_date"),
        Index("ix_ej_sec_ejhdr", "ej_header_id"),
    )


# ─────────────────────────────────────────────────────────────────────
# AGGREGATED DATA (Tier 3-4)
# ─────────────────────────────────────────────────────────────────────

class SiteDailySummary(Base):
    """Per-site daily summary for fast dashboard queries."""
    __tablename__ = "site_daily_summaries"
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    site_id = Column(Integer, ForeignKey("sites.id"), nullable=False)
    summary_date = Column(DateTime, nullable=False)  # date portion only
    transaction_count = Column(Integer, nullable=False, default=0)
    item_count = Column(Integer, nullable=False, default=0)
    gross_sales_inc = Column(Float, nullable=False, default=0)
    gross_sales_ex = Column(Float, nullable=False, default=0)
    nett_sales_inc = Column(Float, nullable=False, default=0)
    nett_sales_ex = Column(Float, nullable=False, default=0)
    gst_total = Column(Float, nullable=False, default=0)
    total_cost_ex = Column(Float, nullable=False, default=0)
    total_profit_ex = Column(Float, nullable=False, default=0)
    total_discounts = Column(Float, nullable=False, default=0)
    total_markdowns = Column(Float, nullable=False, default=0)
    loyalty_points = Column(Float, nullable=False, default=0)
    cancel_count = Column(Integer, nullable=False, default=0)
    no_sale_count = Column(Integer, nullable=False, default=0)
    void_count = Column(Integer, nullable=False, default=0)
    ingested_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("site_id", "summary_date", name="uq_summary_site_date"),
        Index("ix_summary_tenant", "tenant_id"),
        Index("ix_summary_site", "site_id"),
        Index("ix_summary_date", "summary_date"),
    )


class SiteHourlySummary(Base):
    """Per-hour summary for traffic pattern analysis."""
    __tablename__ = "site_hourly_summaries"
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    site_id = Column(Integer, ForeignKey("sites.id"), nullable=False)
    hour_date = Column(DateTime, nullable=False)
    hour_of_day = Column(Integer, nullable=False)
    transaction_count = Column(Integer, nullable=False, default=0)
    item_count = Column(Integer, nullable=False, default=0)
    nett_sales_inc = Column(Float, nullable=False, default=0)
    customer_count = Column(Integer, nullable=False, default=0)
    ingested_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("site_id", "hour_date", name="uq_hourly_site_date"),
        Index("ix_hourly_tenant", "tenant_id"),
    )


# ─────────────────────────────────────────────────────────────────────
# DASHBOARD CONFIG
# ─────────────────────────────────────────────────────────────────────

class PanelType(Base):
    """Catalog of available panel types."""
    __tablename__ = "panel_types"
    id = Column(Integer, primary_key=True, autoincrement=True)
    code = Column(String(50), nullable=False, unique=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    icon = Column(String(50), nullable=True)  # emoji or icon name
    default_config = Column(JSON, nullable=False, default=dict)
    supports_tier = Column(String(20), nullable=True)  # which data tier it needs
    is_active = Column(Boolean, nullable=False, default=True)


class DashboardPanel(Base):
    """User-configured dashboard panel."""
    __tablename__ = "dashboard_panels"
    id = Column(Integer, primary_key=True, autoincrement=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    panel_type_id = Column(Integer, ForeignKey("panel_types.id"), nullable=False)
    title = Column(String(255), nullable=False)
    config = Column(JSON, nullable=False, default=dict)          # data source, time range, refresh interval, display format, thresholds, colors
    role_access = Column(JSON, nullable=False, default=list)     # list of role names that can see this panel
    position = Column(Integer, nullable=False, default=0)
    is_active = Column(Boolean, nullable=False, default=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index("ix_panels_tenant", "tenant_id"),
    )

    tenant = relationship("Tenant", back_populates="panels")


class TenantTheme(Base):
    """Per-tenant visual branding."""
    __tablename__ = "tenant_themes"
    id = Column(Integer, primary_key=True, autoincrement=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, unique=True)
    primary_color = Column(String(10), nullable=False, default="#2563EB")       # blue
    secondary_color = Column(String(10), nullable=False, default="#10B981")     # green
    accent_color = Column(String(10), nullable=False, default="#F59E0B")        # amber
    background_color = Column(String(10), nullable=False, default="#F9FAFB")
    surface_color = Column(String(10), nullable=False, default="#FFFFFF")
    text_color = Column(String(10), nullable=False, default="#111827")
    font_family = Column(String(100), nullable=False, default="Inter, system-ui, sans-serif")
    logo_url = Column(String(500), nullable=True)
    dark_mode_default = Column(Boolean, nullable=False, default=False)
    layout_preset = Column(String(20), nullable=False, default="comfortable")  # dense, comfortable, spacious
    panel_border_radius = Column(Integer, nullable=False, default=12)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    tenant = relationship("Tenant", back_populates="themes")


# ─────────────────────────────────────────────────────────────────────
# AUDIT & SYSTEM
# ─────────────────────────────────────────────────────────────────────

class AuditLog(Base):
    __tablename__ = "audit_log"
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(String(100), nullable=True)
    details = Column(JSON, nullable=True)
    ip_address = Column(String(45), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        Index("ix_audit_tenant", "tenant_id"),
        Index("ix_audit_action", "action"),
        Index("ix_audit_date", "created_at"),
    )


class DataWatermark(Base):
    """Tracks last relayed record per site per data tier."""
    __tablename__ = "data_watermarks"
    id = Column(Integer, primary_key=True, autoincrement=True)
    site_id = Column(Integer, ForeignKey("sites.id"), nullable=False)
    tier = Column(String(20), nullable=False)                   # tier1, tier2, tier3, tier4, tier5
    last_sequence_id = Column(Integer, nullable=True)           # last EJHEADERID or similar
    last_timestamp = Column(DateTime, nullable=True)            # last TRANSACTIONDATE
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("site_id", "tier", name="uq_watermark_site_tier"),
    )


class UsageSnapshot(Base):
    """Daily usage tracking for billing."""
    __tablename__ = "usage_snapshots"
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    snapshot_date = Column(DateTime, nullable=False)
    active_sites = Column(Integer, nullable=False, default=0)
    active_users = Column(Integer, nullable=False, default=0)
    total_panels = Column(Integer, nullable=False, default=0)
    records_ingested = Column(BigInteger, nullable=False, default=0)
    storage_mb = Column(Float, nullable=False, default=0)

    __table_args__ = (
        UniqueConstraint("tenant_id", "snapshot_date", name="uq_usage_tenant_date"),
    )


# ─────────────────────────────────────────────────────────────────────
# CONVENIENCE: Get engine
# ─────────────────────────────────────────────────────────────────────

def get_engine(database_url: str):
    return create_engine(database_url, echo=False)


def get_session(engine):
    return sessionmaker(bind=engine)()
