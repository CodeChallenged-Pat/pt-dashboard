#!/usr/bin/env python3
"""
PT Dashboard — Site Agent

Reads electronic journal data from ProfitTrack Firebird databases and
relays it to the cloud API in batched POST requests.

Usage:
    python agent.py [--config config.yaml] [--once]

Environment:
    SITE_AGENT_API_KEY — overrides config file API key
"""

import json
import logging
import os
import sqlite3
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

import requests
import yaml

try:
    import fdb
except ImportError:
    print("ERROR: fdb not installed. Run: pip install fdb")
    print("On Windows, you also need the Firebird client library (fbclient.dll).")
    sys.exit(1)

# ── Logging ──
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(), logging.FileHandler("agent.log")],
)
log = logging.getLogger("site-agent")


# ── Config ──

def load_config(path: str = "config.yaml") -> dict:
    with open(path) as f:
        cfg = yaml.safe_load(f)
    cfg["cloud"]["api_key"] = os.environ.get("SITE_AGENT_API_KEY", cfg["cloud"]["api_key"])
    return cfg


# ── Firebird ──

def connect_firebird(cfg: dict, db_key: str) -> fdb.Connection:
    """Connect to a Firebird database using the config section."""
    fb_cfg = cfg["firebird"]
    lib = fb_cfg.get("client_lib", None)
    db = fb_cfg[db_key]
    dsn = f"{db['host']}:{db['database']}"
    return fdb.connect(
        dsn=dsn,
        user=db["user"],
        password=db["password"],
        fb_library_name=lib,
    )


# ── State DB (SQLite) ──

def init_state_db(path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(path)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS watermarks (
            tier TEXT PRIMARY KEY,
            last_ej_header_id INTEGER NOT NULL DEFAULT 0,
            last_sync_ts TEXT,
            records_synced INTEGER NOT NULL DEFAULT 0
        )
    """)
    conn.commit()
    return conn


def get_watermark(conn: sqlite3.Connection, tier: str) -> int:
    row = conn.execute("SELECT last_ej_header_id FROM watermarks WHERE tier = ?", (tier,)).fetchone()
    return row[0] if row else 0


def set_watermark(conn: sqlite3.Connection, tier: str, ej_header_id: int, count: int):
    conn.execute("""
        INSERT OR REPLACE INTO watermarks (tier, last_ej_header_id, last_sync_ts, records_synced)
        VALUES (?, ?, ?, COALESCE((SELECT records_synced FROM watermarks WHERE tier = ?), 0) + ?)
    """, (tier, ej_header_id, datetime.utcnow().isoformat(), tier, count))
    conn.commit()


# ── EJ Reader (Tier 1 — Raw Transactions) ──

def read_transactions(conn: fdb.Connection, watermark: int, days_back: int, batch_size: int) -> list[dict]:
    """Query EJHEADER for new sale transactions since the last watermark."""
    # Build date filter for initial sync
    date_filter = ""
    params = [watermark]
    if days_back > 0 and watermark == 0:
        cutoff = datetime.now() - timedelta(days=days_back)
        date_filter = "AND TRANSACTIONDATE >= ?"
        params = [watermark, cutoff]

    # Use parameterized query to prevent SQL injection
    query = f"""
        SELECT FIRST {batch_size}
            EJHEADERID, REGISTERID, REGISTERNUMBER, TRANSACTIONNUMBER,
            TRANSACTIONDATE, EJHEADERTYPEID, EJHEADERTYPE,
            ISFINALISED, ISCANCELLED, ISNOSALE, ISONHOLD,
            SALETOTAL, GSTAMOUNT, ITEMCOUNT, ROUNDINGAMOUNT,
            CLERKNUMBER, CLERKNAME, CLERKSHIFTID,
            TRAININGMODE, RECEIPTREFERENCE, TRANSACTIONIDENTIFIER
        FROM EJHEADER
        WHERE EJHEADERID > ? {date_filter}
        ORDER BY EJHEADERID
    """

    cursor = conn.cursor()
    cursor.execute(query, params)
    rows = cursor.fetchall()

    transactions = []
    for row in rows:
        transactions.append({
            "ej_header_id": int(row[0]),
            "register_id": int(row[1]),
            "register_number": int(row[2]),
            "transaction_number": int(row[3]),
            "transaction_date": row[4].isoformat() if hasattr(row[4], 'isoformat') else str(row[4]),
            "ej_header_type_id": int(row[5]),
            "ej_header_type": str(row[6]).strip(),
            "is_finalised": bool(row[7]),
            "is_cancelled": bool(row[8]),
            "is_no_sale": bool(row[9]),
            "is_on_hold": bool(row[10]),
            "sale_total": float(row[11] or 0),
            "gst_amount": float(row[12] or 0),
            "item_count": int(row[13] or 0),
            "rounding": float(row[14] or 0),
            "clerk_number": int(row[15]),
            "clerk_name": str(row[16]).strip(),
            "clerk_shift_id": int(row[17]),
            "training_mode": bool(row[18]),
            "receipt_reference": str(row[19]).strip() if row[19] else None,
            "transaction_identifier": str(row[20]).strip() if row[20] else None,
        })
    return transactions


def read_line_items(conn: fdb.Connection, header_ids: list[int]) -> list[dict]:
    """Query EJPLUOBJECT for line items belonging to a set of transactions."""
    if not header_ids:
        return []

    # Firebird doesn't support IN with large lists well; use range
    min_id, max_id = min(header_ids), max(header_ids)

    cursor = conn.cursor()
    cursor.execute("""
        SELECT
            EJPLUOBJECTID, EJDETAILID, EJHEADERID, ENTRYSEQUENCE,
            PLU, PRODUCTCODE, DESCRIPTION, CAPTION,
            QUANTITY, UNITPRICE, NETTAMOUNTINC, GROSSAMOUNTINC,
            NETTAMOUNTEX, GROSSAMOUNTEX, GROSSGSTAMOUNT, NETTGSTAMOUNT,
            COSTPRICE, GSTRATE, DEPARTMENTNUMBER, DEPARTMENTDESCRIPTION,
            GROUPNUMBER, ISWEIGHED, ISSECONDPRICESALE, ISCUSTOMPRICESALE,
            ISRETURNED, ISVOIDED, ISERRORCORRECTED,
            LOYALTYPOINTS, MARKDOWNAMOUNT, TRANSACTIONDATE
        FROM EJPLUOBJECT
        WHERE EJHEADERID BETWEEN ? AND ?
    """, (min_id, max_id))
    rows = cursor.fetchall()

    items = []
    for row in rows:
        items.append({
            "ej_plu_object_id": int(row[0]),
            "ej_detail_id": int(row[1]),
            "ej_header_id": int(row[2]),
            "entry_sequence": int(row[3]),
            "plu": str(row[4]).strip(),
            "product_code": str(row[5]).strip() if row[5] else None,
            "description": str(row[6]).strip() if row[6] else None,
            "caption": str(row[7]).strip(),
            "quantity": float(row[8] or 0),
            "unit_price": float(row[9] or 0),
            "nett_amount_inc": float(row[10] or 0),
            "gross_amount_inc": float(row[11] or 0),
            "nett_amount_ex": float(row[12] or 0),
            "gross_amount_ex": float(row[13] or 0),
            "gross_gst_amount": float(row[14] or 0),
            "nett_gst_amount": float(row[15] or 0),
            "cost_price": float(row[16] or 0),
            "gst_rate": float(row[17] or 0),
            "department_number": int(row[18]),
            "department_description": str(row[19]).strip(),
            "group_number": int(row[20]),
            "is_weighed": bool(row[21]),
            "is_second_price_sale": bool(row[22]),
            "is_custom_price_sale": bool(row[23]),
            "is_returned": bool(row[24]),
            "is_voided": bool(row[25]),
            "is_error_corrected": bool(row[26]),
            "loyalty_points": float(row[27] or 0),
            "markdown_amount": float(row[28] or 0),
            "transaction_date": row[29].isoformat() if hasattr(row[29], 'isoformat') else str(row[29]),
        })
    return items


def read_security_events(conn: fdb.Connection, header_ids: list[int]) -> list[dict]:
    """Extract security events from transactions (cancels, no-sales, etc.)."""
    if not header_ids:
        return []

    min_id, max_id = min(header_ids), max(header_ids)

    cursor = conn.cursor()
    cursor.execute("""
        SELECT
            EJHEADERID, TRANSACTIONNUMBER, TRANSACTIONDATE,
            REGISTERNUMBER, CLERKNUMBER, CLERKNAME, CLERKSHIFTID,
            SALETOTAL, ITEMCOUNT,
            ISCANCELLED, ISNOSALE, ISONHOLD, EJHEADERTYPEID, EJHEADERTYPE
        FROM EJHEADER
        WHERE EJHEADERID BETWEEN ? AND ?
          AND (ISCANCELLED = 1 OR ISNOSALE = 1 OR ISONHOLD = 1)
    """, (min_id, max_id))
    rows = cursor.fetchall()

    events = []
    for row in rows:
        cancelled = bool(row[9])
        nosale = bool(row[10])
        onhold = bool(row[11])

        event_type = "other"
        if cancelled:
            event_type = "cancelled"
        elif nosale:
            event_type = "no_sale"
        elif onhold:
            event_type = "on_hold"

        events.append({
            "event_type": event_type,
            "ej_header_id": int(row[0]),
            "transaction_number": int(row[1]),
            "transaction_date": row[2].isoformat() if hasattr(row[2], 'isoformat') else str(row[2]),
            "register_number": int(row[3]),
            "clerk_number": int(row[4]),
            "clerk_name": str(row[5]).strip(),
            "clerk_shift_id": int(row[6]),
            "sale_total": float(row[7] or 0),
            "item_count": int(row[8] or 0),
            "details": {"header_type": str(row[13]).strip(), "header_type_id": int(row[12])},
        })
    return events


# ── Cloud API Client ──

class CloudAPI:
    def __init__(self, base_url: str, api_key: str):
        self.base_url = base_url.rstrip("/")
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        })

    def post_batch(self, batch: dict) -> dict:
        """Post a data batch to the cloud ingest endpoint."""
        resp = self.session.post(f"{self.base_url}/api/v1/ingest/batch", json=batch, timeout=60)
        resp.raise_for_status()
        return resp.json()

    def heartbeat(self, tier: str = "tier1") -> dict:
        """Send a heartbeat ping."""
        resp = self.session.post(f"{self.base_url}/api/v1/ingest/heartbeat", params={"tier": tier}, timeout=10)
        resp.raise_for_status()
        return resp.json()


# ── Sync Engine ──

def sync_tier1(cfg: dict, state: sqlite3.Connection) -> int:
    """Sync Tier 1: raw EJ transaction data from PTPos."""
    fb = connect_firebird(cfg, "ptpos")
    api = CloudAPI(cfg["cloud"]["api_url"], cfg["cloud"]["api_key"])
    sync_cfg = cfg["sync"]
    batch_size = sync_cfg.get("batch_size", 500)
    days_back = sync_cfg.get("initial_days_back", 7)
    tier = "tier1"

    watermark = get_watermark(state, tier)
    log.info(f"Tier 1 sync starting from watermark {watermark}")

    total_synced = 0
    while True:
        transactions = read_transactions(fb, watermark, days_back if watermark == 0 else 0, batch_size)
        if not transactions:
            log.info("No new transactions.")
            break

        header_ids = [t["ej_header_id"] for t in transactions]
        line_items = read_line_items(fb, header_ids)
        security_events = read_security_events(fb, header_ids)

        last_id = header_ids[-1]

        batch = {
            "tier": tier,
            "transactions": transactions,
            "line_items": line_items,
            "tenders": [],
            "discounts": [],
            "security_events": security_events,
            "watermark": last_id,
        }

        try:
            result = api.post_batch(batch)
            total_synced += result.get("accepted", 0)
            log.info(f"Batch synced: {len(transactions)} txns, {len(line_items)} items, "
                     f"{len(security_events)} events — accepted={result.get('accepted')}, "
                     f"dupes={result.get('duplicates')}, errors={result.get('errors')}")
        except Exception as e:
            log.error(f"Failed to post batch: {e}")
            break

        set_watermark(state, tier, last_id, len(transactions))
        watermark = last_id

    fb.close()
    log.info(f"Tier 1 sync complete: {total_synced} records synced")
    return total_synced


# ── Main ──

def main():
    import argparse
    parser = argparse.ArgumentParser(description="PT Dashboard Site Agent")
    parser.add_argument("--config", default="config.yaml", help="Path to config file")
    parser.add_argument("--once", action="store_true", help="Run once and exit (don't loop)")
    parser.add_argument("--register", action="store_true", help="Register this site with the cloud API")
    args = parser.parse_args()

    if not os.path.exists(args.config):
        log.error(f"Config file not found: {args.config}")
        log.info("Copy config.yaml.example to config.yaml and edit it.")
        sys.exit(1)

    cfg = load_config(args.config)
    state = init_state_db(cfg.get("state_db", "sync_state.db"))

    if args.once:
        log.info("Running single sync cycle...")
        sync_tier1(cfg, state)
        log.info("Done.")
        return

    interval = cfg["sync"]["interval_seconds"]
    log.info(f"Site agent starting — polling every {interval}s")
    log.info(f"Store: {cfg['site']['name']} ({cfg['site']['store_code']})")
    log.info(f"Cloud API: {cfg['cloud']['api_url']}")

    while True:
        try:
            sync_tier1(cfg, state)
        except KeyboardInterrupt:
            log.info("Shutting down.")
            break
        except Exception as e:
            log.error(f"Sync error: {e}", exc_info=True)

        log.info(f"Sleeping {interval}s...")
        time.sleep(interval)


if __name__ == "__main__":
    main()
