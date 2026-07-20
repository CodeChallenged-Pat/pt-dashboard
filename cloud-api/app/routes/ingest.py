"""EJ Data Ingest — site agent → cloud API relay endpoint.

Accepts batched records per data tier with deduplication.
"""
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.db import get_db
from app.models.all import (
    Site, EJTransaction, EJLineItem, EJTender, EJDiscount,
    EJSecurityEvent, SiteHeartbeat, DataWatermark,
    SiteDailySummary,
)
from app.auth import get_current_site

router = APIRouter(prefix="/api/v1/ingest", tags=["ingest"])


# ── Schemas ──

class TransactionIn(BaseModel):
    ej_header_id: int
    register_id: int
    register_number: int
    transaction_number: int
    transaction_date: datetime
    ej_header_type_id: int
    ej_header_type: str
    is_finalised: bool = False
    is_cancelled: bool = False
    is_no_sale: bool = False
    is_on_hold: bool = False
    sale_total: float = 0
    gst_amount: float = 0
    item_count: int = 0
    rounding: float = 0
    clerk_number: int
    clerk_name: str
    clerk_shift_id: int
    training_mode: bool = False
    receipt_reference: Optional[str] = None
    transaction_identifier: Optional[str] = None


class LineItemIn(BaseModel):
    ej_plu_object_id: int
    ej_detail_id: int
    ej_header_id: Optional[int] = None  # used to link to transaction
    entry_sequence: int = 0
    plu: str
    product_code: Optional[str] = None
    description: Optional[str] = None
    caption: str = ""
    quantity: float = 0
    unit_price: float = 0
    nett_amount_inc: float = 0
    gross_amount_inc: float = 0
    nett_amount_ex: float = 0
    gross_amount_ex: float = 0
    gross_gst_amount: float = 0
    nett_gst_amount: float = 0
    cost_price: float = 0
    gst_rate: float = 0
    department_number: int
    department_description: str = ""
    group_number: int = 0
    is_weighed: bool = False
    is_second_price_sale: bool = False
    is_custom_price_sale: bool = False
    is_returned: bool = False
    is_voided: bool = False
    is_error_corrected: bool = False
    loyalty_points: float = 0
    markdown_amount: float = 0
    transaction_date: datetime


class TenderIn(BaseModel):
    ej_tender_object_id: int
    ej_detail_id: int
    ej_header_id: Optional[int] = None
    tender_number: int
    tender_type_id: int
    tender_type: str
    description: Optional[str] = None
    amount: float = 0
    total_amount: float = 0
    eftpos_card_code: Optional[str] = None
    eftpos_card_number: Optional[str] = None
    eftpos_account_type_id: Optional[int] = None
    eftpos_account_type: Optional[str] = None
    currency_code: Optional[str] = None
    currency_rate: Optional[float] = None
    currency_sales_amount: Optional[float] = None
    is_approved: bool = False
    is_account_charge: bool = False
    account_number: Optional[int] = None
    loyalty_card_number: Optional[str] = None
    cheque_bsb: Optional[str] = None
    cheque_account: Optional[str] = None
    cheque_number: Optional[str] = None


class DiscountIn(BaseModel):
    ej_discount_object_id: int
    ej_detail_id: int
    ej_header_id: Optional[int] = None
    ej_plu_object_id: int = 0
    description: Optional[str] = None
    discount_rate: float = 0
    discount_type_id: int = 0
    discount_scope_id: int = 0
    amount: float = 0
    discount_number: int = 0
    is_open: bool = False


class SecurityEventIn(BaseModel):
    event_type: str  # cancelled, no_sale, voided, error_corrected, on_hold, adjustment, start_shift, end_shift, end_of_day
    ej_header_id: Optional[int] = None
    ej_plu_object_id: Optional[int] = None
    transaction_number: Optional[int] = None
    transaction_date: datetime
    register_number: int
    clerk_number: int
    clerk_name: str
    clerk_shift_id: int
    sale_total: Optional[float] = None
    item_count: Optional[int] = None
    details: Optional[dict] = None


class IngestBatch(BaseModel):
    tier: str  # tier1, tier2, tier3, tier4, tier5
    transactions: List[TransactionIn] = []
    line_items: List[LineItemIn] = []
    tenders: List[TenderIn] = []
    discounts: List[DiscountIn] = []
    security_events: List[SecurityEventIn] = []
    watermark: Optional[int] = None  # last sequence ID processed


class IngestResult(BaseModel):
    accepted: int
    duplicates: int
    errors: int


# ── Routes ──

def _do_upsert(db, model, records: list, site_id: int, tenant_id: int, unique_col: str):
    """Generic upsert for EJ tables — insert or skip if duplicate."""
    accepted = dups = errors = 0
    for r in records:
        try:
            data = r.model_dump()
            data["site_id"] = site_id
            data["tenant_id"] = tenant_id
            # Map ej_header_id → ej_transaction_id lookup for child tables
            if "ej_header_id" in data and data.get("ej_header_id"):
                tx = db.query(EJTransaction).filter(
                    EJTransaction.site_id == site_id,
                    EJTransaction.ej_header_id == data["ej_header_id"],
                ).first()
                if tx:
                    data["ej_transaction_id"] = tx.id
                else:
                    errors += 1
                    continue
                del data["ej_header_id"]

            # Check for duplicate
            exists = db.query(model).filter(
                getattr(model, "site_id") == site_id,
                getattr(model, unique_col) == data[unique_col],
            ).first()
            if exists:
                dups += 1
                continue
            db.add(model(**data))
            accepted += 1
        except Exception:
            errors += 1
    return accepted, dups, errors


def _upsert_security(db, records: list, site_id: int, tenant_id: int):
    accepted = dups = errors = 0
    for r in records:
        try:
            data = r.model_dump()
            data["site_id"] = site_id
            data["tenant_id"] = tenant_id
            if data.get("ej_header_id"):
                tx = db.query(EJTransaction).filter(
                    EJTransaction.site_id == site_id,
                    EJTransaction.ej_header_id == data["ej_header_id"],
                ).first()
                if tx:
                    data["ej_transaction_id"] = tx.id
                else:
                    data["ej_transaction_id"] = None
            else:
                data["ej_transaction_id"] = None

            # No unique constraint beyond event itself — upsert by (site_id, ej_header_id, event_type, transaction_date)
            if data.get("ej_header_id"):
                exists = db.query(EJSecurityEvent).filter(
                    EJSecurityEvent.site_id == site_id,
                    EJSecurityEvent.ej_header_id == data["ej_header_id"],
                    EJSecurityEvent.event_type == data["event_type"],
                ).first()
                if exists:
                    dups += 1
                    continue
            db.add(EJSecurityEvent(**data))
            accepted += 1
        except Exception:
            errors += 1
    return accepted, dups, errors


@router.post("/batch", response_model=IngestResult)
def ingest_batch(batch: IngestBatch, db: Session = Depends(get_db), site: Site = Depends(get_current_site)):
    total_accepted = 0
    total_dups = 0
    total_errors = 0

    tid = site.tenant_id
    sid = site.id

    # Transactions
    ac, du, er = _do_upsert(db, EJTransaction, batch.transactions, sid, tid, "ej_header_id")
    total_accepted += ac; total_dups += du; total_errors += er
    db.flush()  # so line items can find their FK

    # Line items
    ac, du, er = _do_upsert(db, EJLineItem, batch.line_items, sid, tid, "ej_plu_object_id")
    total_accepted += ac; total_dups += du; total_errors += er

    # Tenders
    ac, du, er = _do_upsert(db, EJTender, batch.tenders, sid, tid, "ej_tender_object_id")
    total_accepted += ac; total_dups += du; total_errors += er

    # Discounts
    ac, du, er = _do_upsert(db, EJDiscount, batch.discounts, sid, tid, "ej_discount_object_id")
    total_accepted += ac; total_dups += du; total_errors += er

    # Security events
    ac, du, er = _upsert_security(db, batch.security_events, sid, tid)
    total_accepted += ac; total_dups += du; total_errors += er

    # Update heartbeat
    db.add(SiteHeartbeat(
        site_id=sid, tier=batch.tier,
        last_seen_at=datetime.utcnow(),
        records_sent=total_accepted,
        status="ok",
    ))

    # Update watermark
    if batch.watermark:
        wm = db.query(DataWatermark).filter(
            DataWatermark.site_id == sid,
            DataWatermark.tier == batch.tier,
        ).first()
        if wm:
            wm.last_sequence_id = batch.watermark
            wm.last_timestamp = datetime.utcnow()
            wm.updated_at = datetime.utcnow()
        else:
            db.add(DataWatermark(
                site_id=sid, tier=batch.tier,
                last_sequence_id=batch.watermark,
                last_timestamp=datetime.utcnow(),
            ))

    db.commit()
    return IngestResult(accepted=total_accepted, duplicates=total_dups, errors=total_errors)


@router.post("/heartbeat")
def heartbeat(
    tier: str = "tier1",
    db: Session = Depends(get_db),
    site: Site = Depends(get_current_site),
):
    """Ping from site agent — just record the heartbeat."""
    db.add(SiteHeartbeat(
        site_id=site.id, tier=tier,
        last_seen_at=datetime.utcnow(), records_sent=0, status="ok",
    ))
    db.commit()
    return {"ok": True, "site_id": site.id, "tier": tier, "timestamp": datetime.utcnow().isoformat()}
