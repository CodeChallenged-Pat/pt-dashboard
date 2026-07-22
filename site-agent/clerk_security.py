@router.get("/clerk-security")
def clerk_security(
    site_id: int = Query(3),
    days: int = Query(7, ge=1, le=90),
    db: Session = Depends(get_db),
):
    """Per-clerk security events: cancels, no-sales, voided items, refunds."""
    cutoff = datetime.utcnow() - timedelta(days=days)
    rows = db.query(
        EJTransaction.clerk_name,
        func.count(EJTransaction.id).filter(EJTransaction.is_cancelled == True),
        func.sum(EJTransaction.sale_total).filter(EJTransaction.is_cancelled == True),
        func.count(EJTransaction.id).filter(EJTransaction.is_no_sale == True),
        func.sum(EJTransaction.sale_total).filter(EJTransaction.is_no_sale == True),
        func.count(EJTransaction.id),
        func.sum(EJTransaction.sale_total),
    ).filter(
        EJTransaction.site_id == site_id,
        EJTransaction.transaction_date >= cutoff,
    ).group_by(EJTransaction.clerk_name).order_by(func.count(EJTransaction.id).desc()).all()
    return [{"clerk": str(r[0]), "cancels": int(r[1] or 0), "cancel_value": float(r[2] or 0),
             "no_sales": int(r[3] or 0), "no_sale_value": float(r[4] or 0),
             "total_txns": int(r[5] or 0), "total_value": float(r[6] or 0)} for r in rows]
