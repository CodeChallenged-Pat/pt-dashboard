# Data Element Catalog & Heartbeat Strategy

## Overview

Each data element the dashboard can display has different urgency. Some things matter within minutes (cancels, no-sales, voids); others only change once a day (yesterday's sales totals, stocktake results). The site agent should relay data at different intervals per element category — not a single global heartbeat.

## Data Element Tiers

### TIER 1 — HIGH FREQUENCY (every 2-5 minutes)
Security-sensitive events that need near-real-time visibility.

| Element | Source | Key Fields | Rationale |
|---|---|---|---|
| **Cancelled transactions** | PTPos EJHEADER WHERE ISCANCELLED='T' | EJHEADERID, TRANSACTIONNUMBER, CLERKNAME, SALETOTAL, TRANSACTIONDATE, REGISTERNUMBER | Cancellations can indicate fraud, staff error, or system issues |
| **No-sale events** | PTPos EJHEADER WHERE ISNOSALE='T' (or EJHEADERTYPELOOKUPID=2) | EJHEADERID, CLERKNAME, TRANSACTIONDATE, REGISTERNUMBER | Cash drawer opens without a sale — security critical |
| **Voided line items** | PTPos EJPLUOBJECT WHERE ISVOIDED='T' | EJPLUOBJECTID, PLU, DESCRIPTION, QTY, AMOUNT, CLERKNAME | Voids can mask theft |
| **Error corrections** | PTPos EJDETAIL WHERE ISERRORCORRECTED='T' | EJDETAILID, EJHEADERID, ENTRYSEQUENCENUMBER | Corrected mistakes, often linked to voids |
| **Held/parked sales** | PTPos EJHEADER WHERE ISONHOLD='T' | EJHEADERID, CLERKNAME, SALETOTAL, TRANSACTIONDATE | Unusually high holds can indicate training issues or fraud |
| **Adjustment transactions** | PTPos EJHEADER WHERE EJHEADERTYPELOOKUPID=12 | EJHEADERID, CLERKNAME, SALETOTAL, TRANSACTIONDATE | Inventory/price adjustments, should be monitored |

### TIER 2 — MEDIUM FREQUENCY (every 15-30 minutes)
Transactional data that drives the live dashboard panels.

| Element | Source | Key Fields | Rationale |
|---|---|---|---|
| **New sale transactions (headers)** | PTPos EJHEADER WHERE EJHEADERTYPELOOKUPID=1 AND ISFINALISED='T' | EJHEADERID, TRANSACTIONNUMBER, TRANSACTIONDATE, SALETOTAL, GSTAMOUNT, ITEMCOUNT, CLERKNUMBER, CLERKNAME, REGISTERNUMBER, CLERKSHIFTID | Live sales tracking — "today's sales so far" |
| **Sale line items (PLU objects)** | PTPos EJPLUOBJECT (via EJDETAIL→EJHEADER) | EJPLUOBJECTID, PLU, PRODUCTCODE, DESCRIPTION, QTY, NETTAMOUNTINC, GROSSAMOUNTINC, COSTPRICE, DEPTNUMBER, GROUPNUMBER | Product-level sales breakdown |
| **Tender/payment records** | PTPos EJTENDEROBJECT (via EJDETAIL→EJHEADER) | EJTENDEROBJECTID, TENDERTYPELOOKUPID, AMOUNT, EFTPOSCARDCODE, EFTPOSACCOUNTTYPELOOKUPID, CURRENCYCODE | Payment method breakdown (cash/EFTPOS/credit) |
| **Discounts applied** | PTPos EJDISCOUNTOBJECT | EJDISCOUNTOBJECTID, DESCRIPTION, DISCOUNTRATE, AMOUNT | Discount monitoring, margin impact |
| **Shift start/end events** | PTPos EJHEADER WHERE EJHEADERTYPELOOKUPID IN (10,11) | EJHEADERID, CLERKNAME, TRANSACTIONDATE | Staff on/off duty tracking |

### TIER 3 — LOW FREQUENCY (every 1-4 hours or on change)
Aggregated data that doesn't change frequently.

| Element | Source | Key Fields | Rationale |
|---|---|---|---|
| **Department sales totals** | PTPos DEPTSALES | DEPTSALESID, DEPTNUMBER, QTY, SALESWITHGSTAMOUNT, SALESWITHOUTGSTAMOUNT, COSTPRICE, NETTAMOUNTINC | Department performance summary |
| **PLU sales totals** | PTPos PLUSALES | PLUSALESID, PLU, QTY, NETTAMOUNTINC, GROSSAMOUNTINC, COSTPRICE | Product performance summary |
| **Clerk sales totals** | PTPos CLERKSALES | CLERKSALESID, CLERKNUMBER, QTY, AMOUNT | Staff performance summary |
| **Clerk shift tender totals** | PTPos CLERKSHIFTTENDER | CLERKSHIFTID, AMOUNT, DECLAREDAMOUNT, TENDERNUMBER, CLOSINGFLOATAMOUNT | Cash drawer reconciliation |
| **EFTPOS sales per clerk** | PTPos CLERKEFTPOSSALES | EFTPOSCARDCODE, SALESQTY, SALESAMOUNT, INDRAWERAMOUNT | EFTPOS reconciliation |
| **Hourly sales** | PTPos HOURLYSALES | Sales by hour | Traffic pattern analysis |

### TIER 4 — END OF DAY (once per day, after EOD roll)
Data that only finalizes at end of day.

| Element | Source | Key Fields | Rationale |
|---|---|---|---|
| **EOD transaction summary** | PTPos EJHEADER WHERE EJHEADERTYPELOOKUPID=9 | EJHEADERID, SALETOTAL, ITEMCOUNT | Daily totals |
| **Shift finalisation** | PTPos CLERKSHIFT WHERE ISFINALISED='T' | CLERKSHIFTID, STARTDATE, ENDDATE, CLERKNUMBER | Completed shifts for the day |
| **Stocktake** | PTReport FACT_STOCKTAKEDETAIL/HEADER | Full stocktake results | Only happens periodically |
| **Purchase/receiving** | PTReport FACT_PURCHASE | Received goods | Infrequent |
| **Inventory adjustments** | PTReport FACT_INVENTORYADJUSTMENT | Adjustments with reasons | Infrequent |

### TIER 5 — DIMENSIONAL/META (on change only)
Reference data that rarely changes.

| Element | Source | Rationale |
|---|---|---|
| **Product master** | PTReport DIM_PRODUCT (SCD Type 2 — check ISCURRENT='Y' and EFFECTIVEDATE/EXPIREDDATE) | Product changes are infrequent |
| **Store info** | PTReport DIM_STORE | Store details rarely change |
| **Clerk master** | PTReport DIM_CLERK | Staff changes infrequent |
| **Customer master** | PTReport DIM_CUSTOMER | Account changes infrequent |
| **Promotion config** | PTReport DIM_PROMOTION | Promotions change occasionally |
| **Register config** | PTReport DIM_REGISTER | Hardware changes rare |
| **Date/Time dimensions** | PTReport DIM_DATE, DIM_TIME | Pre-populated, static |

## Site Agent Heartbeat Architecture

The agent runs multiple heartbeat loops at different intervals:

```
┌─────────────────────────────────────┐
│        Site Agent (asyncio)          │
│                                     │
│  ┌─────────┐  ┌─────────┐  ┌──────┐ │
│  │Tier 1   │  │Tier 2   │  │Tier 3│ │
│  │Poll     │  │Poll     │  │Poll  │ │
│  │2-5 min  │  │15-30min │  │1-4hr │ │
│  └────┬────┘  └────┬────┘  └──┬───┘ │
│       │            │           │     │
│  ┌────▼────────────▼───────────▼───┐ │
│  │     Offline Queue (SQLite)      │ │
│  └────────────┬────────────────────┘ │
│               │                      │
│  ┌────────────▼────────────────────┐ │
│  │     Relay to Cloud API          │ │
│  │  POST /ingest/{tier}            │ │
│  └─────────────────────────────────┘ │
│                                     │
│  ┌─────────┐  ┌─────────┐           │
│  │Tier 4   │  │Tier 5   │           │
│  │EOD      │  │On-change│           │
│  │Trigger  │  │poll 1hr │           │
│  └─────────┘  └─────────┘           │
└─────────────────────────────────────┘
```

### Per-Tier Watermarks
Each tier maintains its own watermark:
- **Tier 1**: `last_ejheaderid_security` — max EJHEADERID seen for security events
- **Tier 2**: `last_ejheaderid_sales` — max EJHEADERID for finalized sales
- **Tier 3**: `last_rollheaderid` — max roll period processed for aggregates
- **Tier 4**: `last_eod_date` — last end-of-day date processed
- **Tier 5**: `last_dimension_modified` — max LASTMODIFIED timestamp for dimension tables

### Configuration
```yaml
# site-agent.yaml
heartbeats:
  tier1_security:     # cancels, no-sales, voids, error corrections
    interval_seconds: 120       # 2 minutes
    queries:
      - ejheader_cancelled
      - ejheader_nosale
      - ejpluobject_voided
      - ejdetail_errorcorrected
  tier2_transactions:  # sales, tenders, discounts, shifts
    interval_seconds: 900       # 15 minutes
    queries:
      - ejheader_sales
      - ejpluobject_sales
      - ejtenderobject
      - ejdiscountobject
  tier3_aggregates:    # dept/plu/clerk totals, shift tenders
    interval_seconds: 3600      # 1 hour
    queries:
      - deptsales
      - plusales
      - clerksales
      - clerkshifttender
  tier4_eod:           # end of day summary
    trigger: eod_detected       # event-driven, not interval
    queries:
      - eod_summary
      - shift_finalisation
  tier5_dimensions:     # product/store/clerk/customer master
    interval_seconds: 3600      # 1 hour, check for changes
    queries:
      - dim_product_changes
      - dim_store_changes
      - dim_clerk_changes
```

### Cloud DB Per-Tier Ingest
```
POST /api/v1/ingest/tier1   — security events
POST /api/v1/ingest/tier2   — transactional data
POST /api/v1/ingest/tier3   — aggregate summaries
POST /api/v1/ingest/tier4   — EOD data
POST /api/v1/ingest/tier5   — dimensional changes
```

Each endpoint accepts a batch of records with the same deduplication logic (idempotency by site_id + record_type + source_id).

## Billing Architecture (Designed In, Activated Later)

### Schema (v1, fields present but billing inactive)

```sql
-- Tenants table gets billing fields
ALTER TABLE tenants ADD COLUMN:
  billing_status VARCHAR(20) DEFAULT 'trial'   -- trial, active, suspended, cancelled
  billing_plan VARCHAR(20) DEFAULT 'free'       -- free, starter, pro, enterprise
  trial_ends_at TIMESTAMP NULL
  billing_email VARCHAR(255) NULL
  stripe_customer_id VARCHAR(255) NULL
  stripe_subscription_id VARCHAR(255) NULL

-- Billing plans table
CREATE TABLE billing_plans (
  id SERIAL PK,
  name VARCHAR(50),
  max_sites INTEGER,           -- free=1, starter=3, pro=10, enterprise=unlimited
  max_panels INTEGER,          -- free=5, starter=20, pro=100, enterprise=unlimited
  max_users INTEGER,           -- free=2, starter=5, pro=20, enterprise=unlimited
  min_heartbeat_interval INTEGER, -- minimum allowed heartbeat (free=15min, paid=2min)
  price_monthly DECIMAL(10,2),
  features JSONB               -- feature flags as JSON
);

-- Billing events (audit trail)
CREATE TABLE billing_events (
  id SERIAL PK,
  tenant_id INTEGER FK,
  event_type VARCHAR(50),      -- trial_started, trial_ended, plan_changed, payment_received, suspended
  amount DECIMAL(10,2),
  details JSONB,
  created_at TIMESTAMP
);

-- Usage tracking (for billing calculations)
CREATE TABLE usage_snapshots (
  id SERIAL PK,
  tenant_id INTEGER FK,
  snapshot_date DATE,
  active_sites INTEGER,
  active_users INTEGER,
  total_panels INTEGER,
  records_ingested BIGINT,
  storage_mb DECIMAL(10,2)
);
```

### Plans (proposed, adjustable later)

| Plan | Monthly | Sites | Panels | Users | Heartbeat | Data Retention |
|---|---|---|---|---|---|---|
| Free/Trial | $0 | 1 | 5 | 2 | 15 min | 30 days |
| Starter | $29 | 3 | 20 | 5 | 5 min | 90 days |
| Pro | $99 | 10 | 100 | 20 | 2 min | 1 year |
| Enterprise | Custom | Unlimited | Unlimited | Unlimited | 1 min | Unlimited |

### Activation Path
1. **v1 (now):** Schema fields exist, `billing_status='trial'` for all, no enforcement
2. **v1.5:** Add Stripe integration, trial signup flow, plan enforcement (max sites/panels)
3. **v2:** Usage tracking, automated billing, plan upgrade/downgrade, invoices

## Dashboard Panel ↔ Data Tier Mapping

Each panel type maps to a data tier, which determines data freshness:

| Panel | Data Tier | Refresh | Example |
|---|---|---|---|
| Today's Sales KPI | Tier 2 | 15 min | "$12,345 sold today" |
| Cancelled Transactions | Tier 1 | 2 min | "3 cancels in last hour" |
| No-Sale Events | Tier 1 | 2 min | "2 no-sales today" |
| Sales by Department | Tier 3 | 1 hour | Bar chart by dept |
| Payment Method Breakdown | Tier 2 | 15 min | Pie: cash vs EFTPOS |
| Staff Performance | Tier 3 | 1 hour | Sales per clerk |
| Hourly Sales Pattern | Tier 2 | 15 min | Line chart by hour |
| Yesterday's Totals | Tier 4 | Daily | "Yesterday: $45,678" |
| Product Performance | Tier 3 | 1 hour | Table of top sellers |
| Voided Items | Tier 1 | 2 min | "5 items voided today" |
| Shift Status | Tier 2 | 15 min | Active shifts display |
| Cash Drawer Reconciliation | Tier 3 | 1 hour | Declared vs expected |
| EFTPOS Card Breakdown | Tier 3 | 1 hour | Visa/Mastercard/EFTPOS split |
| Multi-Currency Sales | Tier 2 | 15 min | NZD/AUD/USD breakdown |
| Loyalty Points Earned | Tier 2 | 15 min | Total points today |
| Discount Analysis | Tier 2 | 15 min | Discount amount by type |

## Agent Data Source Summary

The agent reads from **two databases**:

| Source DB | Tables Read | Purpose |
|---|---|---|
| **PTPos.fdb** | EJHEADER, EJDETAIL, EJPLUOBJECT, EJTENDEROBJECT, EJDISCOUNTOBJECT, DEPTSALES, PLUSALES, CLERKSALES, CLERKSHIFTTENDER, CLERKEFTPOSSALES, CLERKSHIFT, HOURLYSALES | Live transactional data — all tiers 1-4 |
| **PTReport.fdb** | DIM_PRODUCT, DIM_STORE, DIM_CLERK, DIM_CUSTOMER, DIM_PROMOTION, DIM_REGISTER, DIM_DATE, DIM_TIME, FACT_SALES, FACT_PURCHASE, FACT_STOCKTAKE*, FACT_INVENTORYADJUSTMENT | Dimensional/reference data — tier 5, and historical context |

**PTPos.fdb** is the primary source for the heartbeat relay (tiers 1-4).
**PTReport.fdb** is used for dimension sync (tier 5) and could supplement tier 3/4 with pre-aggregated data from its fact tables.
