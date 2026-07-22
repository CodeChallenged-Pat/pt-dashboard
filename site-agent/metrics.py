"""Metrics API — aggregated data for dashboard panels."""

from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, case, extract
from sqlalchemy.orm import Session
from app.db import get_db
from app.models.all import (
    EJTransaction, EJTender, SiteDailySummary, SiteHourlySummary,
    Site
)

router = APIRouter(prefix="/api/v1/metrics", tags=["metrics"])


@router.get("/daily-sales")
def daily_sales(
    site_id: int = Query(3),
    days: int = Query(14, ge=1, le=90),
    db: Session = Depends(get_db),
):
    """Daily sales totals for line chart."""
    cutoff = datetime.utcnow() - timedelta(days=days)
    rows = db.query(
        SiteDailySummary.summary_date,
        SiteDailySummary.gross_sales_inc,
        SiteDailySummary.nett_sales_inc,
        SiteDailySummary.transaction_count,
        SiteDailySummary.cancel_count,
    ).filter(
        SiteDailySummary.site_id == site_id,
        SiteDailySummary.summary_date >= cutoff,
    ).order_by(SiteDailySummary.summary_date).all()
    return [{"date": str(r[0])[:10], "gross": float(r[1] or 0), "nett": float(r[2] or 0),
             "transactions": int(r[3] or 0), "cancels": int(r[4] or 0)} for r in rows]


@router.get("/hourly-traffic")
def hourly_traffic(
    site_id: int = Query(3),
    days: int = Query(7, ge=1, le=30),
    db: Session = Depends(get_db),
):
    """Hourly traffic pattern for line/bar chart."""
    cutoff = datetime.utcnow() - timedelta(days=days)
    rows = db.query(
        SiteHourlySummary.hour_of_day,
        func.avg(SiteHourlySummary.transaction_count),
        func.avg(SiteHourlySummary.nett_sales_inc),
        func.avg(SiteHourlySummary.customer_count),
    ).filter(
        SiteHourlySummary.site_id == site_id,
        SiteHourlySummary.hour_date >= cutoff,
    ).group_by(SiteHourlySummary.hour_of_day).order_by(SiteHourlySummary.hour_of_day).all()
    return [{"hour": int(r[0]), "avg_transactions": round(float(r[1] or 0), 1),
             "avg_sales": round(float(r[2] or 0), 2), "avg_customers": round(float(r[3] or 0), 1)} for r in rows]


@router.get("/tender-breakdown")
def tender_breakdown(
    site_id: int = Query(3),
    days: int = Query(7, ge=1, le=90),
    db: Session = Depends(get_db),
):
    """Tender type breakdown for pie/donut chart."""
    cutoff = datetime.utcnow() - timedelta(days=days)
    rows = db.query(
        EJTender.tender_type,
        func.sum(EJTender.amount),
        func.count(EJTender.id),
    ).join(EJTransaction, EJTender.ej_transaction_id == EJTransaction.id).filter(
        EJTransaction.site_id == site_id,
        EJTransaction.transaction_date >= cutoff,
    ).group_by(EJTender.tender_type).order_by(func.sum(EJTender.amount).desc()).all()
    total = sum(float(r[1] or 0) for r in rows)
    return [{"type": str(r[0]), "amount": float(r[1] or 0),
             "count": int(r[2]), "pct": round(float(r[1] or 0) / total * 100, 1) if total else 0}
            for r in rows]


@router.get("/clerk-performance")
def clerk_performance(
    site_id: int = Query(3),
    days: int = Query(7, ge=1, le=90),
    db: Session = Depends(get_db),
):
    """Clerk/staff performance for bar chart."""
    cutoff = datetime.utcnow() - timedelta(days=days)
    rows = db.query(
        EJTransaction.clerk_name,
        func.sum(EJTransaction.sale_total),
        func.count(EJTransaction.id),
        func.avg(EJTransaction.sale_total),
    ).filter(
        EJTransaction.site_id == site_id,
        EJTransaction.transaction_date >= cutoff,
    ).group_by(EJTransaction.clerk_name).order_by(func.sum(EJTransaction.sale_total).desc()).all()
    return [{"clerk": str(r[0]), "total_sales": float(r[1] or 0),
             "transactions": int(r[2]), "avg_sale": round(float(r[3] or 0), 2)} for r in rows]


@router.get("/summary-stats")
def summary_stats(
    site_id: int = Query(3),
    db: Session = Depends(get_db),
):
    """Key stat cards for the dashboard."""
    today = datetime.utcnow().replace(hour=0, minute=0, second=0)

    # Today's stats
    today_txns = db.query(func.count(EJTransaction.id), func.sum(EJTransaction.sale_total)).filter(
        EJTransaction.site_id == site_id,
        EJTransaction.transaction_date >= today,
    ).first()

    # Yesterday
    yesterday = today - timedelta(days=1)
    yday_txns = db.query(func.count(EJTransaction.id), func.sum(EJTransaction.sale_total)).filter(
        EJTransaction.site_id == site_id,
        EJTransaction.transaction_date >= yesterday,
        EJTransaction.transaction_date < today,
    ).first()

    # This week (last 7 days)
    week_start = today - timedelta(days=7)
    week_txns = db.query(func.count(EJTransaction.id), func.sum(EJTransaction.sale_total)).filter(
        EJTransaction.site_id == site_id,
        EJTransaction.transaction_date >= week_start,
    ).first()

    # Active clerks today
    active_clerks = db.query(func.count(func.distinct(EJTransaction.clerk_name))).filter(
        EJTransaction.site_id == site_id,
        EJTransaction.transaction_date >= today,
    ).scalar() or 0

    # Cancels today
    cancels = db.query(func.count(EJTransaction.id)).filter(
        EJTransaction.site_id == site_id,
        EJTransaction.transaction_date >= today,
        EJTransaction.is_cancelled == True,
    ).scalar() or 0

    return {
        "today": {"sales": float(today_txns[1] or 0), "transactions": int(today_txns[0] or 0)},
        "yesterday": {"sales": float(yday_txns[1] or 0), "transactions": int(yday_txns[0] or 0)},
        "week": {"sales": float(week_txns[1] or 0), "transactions": int(week_txns[0] or 0)},
        "active_clerks": int(active_clerks),
        "cancels_today": int(cancels),
    }
