# PT Dashboard — Open Questions Log

Legend: ✅ answered | ❓ open | 📋 needs Pat to provide

---

## 1. Site Agent (Local Relay)

| # | Status | Question | Answer / Notes |
|---|---|---|---|
| 1.1 | ❓ | What exactly is the "reports database"? Separate FDB file or tables in main PT DB? | 📋 Inspect once PT is installed |
| 1.2 | ❓ | What EJ data fields matter most? Sales totals, line items, payments, voids, staff? | 📋 Inspect reports DB schema |
| 1.3 | ✅ | How often should the agent relay data? | Heartbeat intervals — to be defined |
| 1.4 | ❓ | Does agent read from live PT POS DB too, or just reports DB? | You said "relay EJ data from reports database" — confirm it's the only source |
| 1.5 | ✅ | Internet down — queue locally? | Yes, offline queue with replay (planned in agent design) |
| 1.6 | ❓ | Windows service, scheduled task, or always-on? | 📋 Decide during agent build |
| 1.7 | ✅ | Agent needs local config UI? | Cloud-managed — agent is headless |
| 1.8 | ❓ | What identifies a site? Store ID, GUID, name? | Need to understand PT's store/site identification |
| 1.9 | ✅ | Agent read-only to local DB? | Yes — never writes to POS |
| 1.10 | ❓ | Multiple terminals per site? | 📋 Check during PT inspection |

## 2. Cloud API

| # | Status | Question | Answer / Notes |
|---|---|---|---|
| 2.1 | ✅ | What endpoints needed? | Full list in master plan Phase 2 |
| 2.2 | ❓ | WebSocket/SSE for live updates or polling? | Heartbeat model implies polling — confirm |
| 2.3 | ✅ | Rate limiting per site? | Yes, configurable (default 60 req/hr) |
| 2.4 | ✅ | API versioning? | `/api/v1/...` from start |
| 2.5 | ✅ | Public API for third parties? | No — internal only (dashboard + agents) |
| 2.6 | ❓ | Data retention policy? | How long to keep EJ data in cloud DB? |

## 3. Cloud Database

| # | Status | Question | Answer / Notes |
|---|---|---|---|
| 3.1 | ❓ | Expected data volume per site per day? | 📋 Need real PT data to estimate |
| 3.2 | ❓ | Store raw EJ or aggregated? | Recommend: raw for flexibility, aggregate in queries |
| 3.3 | ✅ | Normalized or star schema? | Normalized with `site_id` + `tenant_id` on every row |
| 3.4 | ✅ | Multi-tenancy model? | Single DB, `tenant_id` on every row |
| 3.5 | ❓ | Currency: all NZD or multi-currency? | You mentioned currency integration — clarify |
| 3.6 | ❓ | Historical comparison depth (YoY, MoM)? | How far back? |
| 3.7 | ✅ | Postgres confirmed? | Yes |
| 3.8 | ❓ | Panel config stored per-user or per-tenant? | Admin configures panels, roles control visibility |

## 4. Dashboard Frontend

| # | Status | Question | Answer / Notes |
|---|---|---|---|
| 4.1 | ✅ | Who are dashboard users? | Multi-tenant — each customer has their own users |
| 4.2 | ✅ | Multi-tenant or single-tenant? | Multi-tenant SaaS from the start |
| 4.3 | ❓ | Fixed grid or drag-and-drop? | Start with fixed grid, add DnD in v2 |
| 4.4 | ❓ | Panel types for MVP? | KPI, line chart, table, pie — what else? |
| 4.5 | ✅ | Per-panel cog config options? | Data source, time range, refresh, format, roles, colors |
| 4.6 | ✅ | Theming depth? | Colors, logo, font, light/dark, layout presets |
| 4.7 | ❓ | Multiple dashboard pages or one scrolling page? | |
| 4.8 | ❓ | Mobile responsive? | Likely yes (Pat is mobile-first) — confirm |
| 4.9 | ❓ | Panel drill-down? | Click chart → see underlying data? |
| 4.10 | ❓ | Export to CSV/PDF? | |

## 5. Authentication & Site Registration

| # | Status | Question | Answer / Notes |
|---|---|---|---|
| 5.1 | ❓ | Site registration flow: manual or self-service? | You register a site in dashboard → get API key → install agent |
| 5.2 | ✅ | Auth for site agents? | API key per site |
| 5.3 | ✅ | Dashboard user auth? | Email/password (JWT) — SSO is v2 |
| 5.4 | ❓ | Session timeout? | |
| 5.5 | ✅ | Roles? | Yes — role-aware panels, each panel specifies roles |
| 5.6 | ✅ | Site deactivation? | Soft delete, keep historical data |

## 6. Hosting

| # | Status | Question | Answer / Notes |
|---|---|---|---|
| 6.1 | ✅ | Budget? | Low — start small, scale later |
| 6.2 | ✅ | Number of sites? | Multi-tenant SaaS — any PT customer, eventually optics ERP |
| 6.3 | ❓ | Domain name? | 📋 Do you have a domain or need to register one? |
| 6.4 | ❓ | Email sending? | Needed for alerts/password resets? |
| 6.5 | ✅ | TLS? | Let's Encrypt (free) |
| 6.6 | ✅ | Backups? | Managed (Neon PITR) — delegated |
| 6.7 | ✅ | Dev environment | Linux NUC (self-hosted, full stack) |

## 7. ProfitTrack Data Sources

| # | Status | Question | Answer / Notes |
|---|---|---|---|
| 7.1 | ❓ | ProfitTrack version? | 📋 Check when installing |
| 7.2 | ❓ | Reports DB schema docs available? | 📋 Inspect after install |
| 7.3 | ❓ | EJ data structured (SQL) or text logs? | 📋 Inspect after install |
| 7.4 | ❓ | Existing reports to mimic? | G:\Drive has PT Reporting docs — may be useful |
| 7.5 | ❓ | Payment/EFTPOS data fields? | 📋 Inspect after install |
| 7.6 | ❓ | Staff/terminal tracking in EJ? | 📋 Inspect after install |

## 8. Security

| # | Status | Question | Answer / Notes |
|---|---|---|---|
| 8.1 | ✅ | Commercially sensitive data? | Yes — sales figures, multi-tenant |
| 8.2 | ❓ | PCI data? | Should NOT store card numbers — verify EJ excludes them |
| 8.3 | ✅ | Encryption at rest? | Managed Postgres includes this |
| 8.4 | ❓ | IP-restrict API or public with auth? | Public with auth (site agents have dynamic IPs) |

## 9. Multi-Tenancy & SaaS

| # | Status | Question | Answer / Notes |
|---|---|---|---|
| 9.1 | ✅ | SaaS for any PT customer? | Yes |
| 9.2 | ✅ | Extensible to optics ERP? | Yes — pluggable source adapters planned |
| 9.3 | ❓ | Tenant onboarding flow? | Self-service signup or manual? |
| 9.4 | ❓ | Per-tenant data isolation requirements? | Row-level (tenant_id) sufficient or need schema-per-tenant? |
| 9.5 | ❓ | Super admin role (Pat) to see all tenants? | You as platform owner — need a super-admin tier above tenant admin |
| 9.6 | ❓ | Billing/subscription for tenants? | v1 free, v2 paid? Or paid from start? |

## 10. Things Pat Might Have Missed

| # | Status | Item | Notes |
|---|---|---|---|
| 10.1 | ❓ | Alerting | Threshold alerts (sales down, no data from site)? |
| 10.2 | ✅ | Data deduplication | Idempotency by (site_id, ej_seq) — planned |
| 10.3 | ✅ | Gap detection | Watermark tracking — planned |
| 10.4 | ✅ | Time zones | Store UTC, convert for display |
| 10.5 | ❓ | Panel config persistence | Per-user or per-tenant? |
| 10.6 | ✅ | Multi-customer path | SaaS from day one |
| 10.7 | ❓ | Offline dashboard fallback | Probably not needed — confirm |
| 10.8 | ✅ | Audit trail | Planned in schema |
| 10.9 | ✅ | Data freshness indicator | Per-panel "last updated" — planned |
| 10.10 | ❓ | Scheduled reports (email PDF) | Needed? |
| 10.11 | ❓ | Currency integration | FX rates for display? Multi-currency sites? |
| 10.12 | ❓ | Agent update mechanism | Manual install, auto-update, or packaged installer? |
| 10.13 | ❓ | Super-admin tier | Pat needs platform-level access above tenant admins |
