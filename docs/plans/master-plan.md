# PT Dashboard — Master Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement task-by-task.

**Goal:** Build a multi-tenant SaaS dashboard that consolidates ProfitTrack POS electronic journal data from multiple sites, displays it in configurable role-aware panels, and is extensible to other POS/ERP systems.

**Architecture:** Three components — (1) site agent (local relay), (2) cloud API (FastAPI + Postgres), (3) React dashboard frontend. Multi-tenant from the ground up with per-customer isolation. Heartbeat-based data relay at defined intervals.

**Tech Stack:** Python/FastAPI, Postgres, React/TypeScript/Vite, Docker for dev, Linux NUC for staging

---

## Phase 0 — Foundation & Understanding (CURRENT)

We are here. No building until ProfitTrack is installed and we can inspect the reports DB schema.

### 0.1 ProfitTrack Installation & Schema Discovery
- [ ] Pat installs ProfitTrack on this machine
- [ ] Pat provides copy databases from a client
- [ ] Inspect reports DB schema — tables, columns, relationships
- [ ] Inspect PT POS DB schema — understand what EJ data contains
- [ ] Document EJ data model in `docs/schema/ej-data-model.md`
- [ ] Identify key fields: sales totals, line items, payment types, EFTPOS, voids, staff, timestamps, terminal IDs
- [ ] Determine if reports DB is separate FDB file or tables within main DB

### 0.2 Heartbeat Interval Definition
- [ ] Define relay interval (e.g., every 5 min, 15 min, hourly)
- [ ] Define what data is relayed per heartbeat (full EJ snapshot vs delta/changes-since-last)
- [ ] Define backoff/retry logic for offline sites
- [ ] Define data watermark tracking (last successfully relayed record timestamp/sequence)

### 0.3 Dev Environment Setup (Linux NUC)
- [ ] Confirm NUC availability and SSH access
- [ ] Install Docker + docker-compose on NUC
- [ ] Deploy Postgres container
- [ ] Deploy cloud-api container (once built)
- [ ] Set up local DNS or use NUC IP for dev access
- [ ] Document NUC setup in `docs/dev-nuc-setup.md`

### 0.4 Repo & Tooling Setup
- [ ] Create private GitHub repo `pt-dashboard`
- [ ] Initialize project structure (see README.md)
- [ ] Set up `.env.example` for each component
- [ ] Set up GitHub Issues as backlog from this plan
- [ ] Create `docker-compose.yml` for local dev (API + Postgres + Adminer)

---

## Phase 1 — Cloud Database Schema Design

### 1.1 Multi-Tenant Core Tables
- [ ] `tenants` — customer organizations (id, name, branding_config JSONB, created_at, active)
- [ ] `tenant_users` — dashboard users (id, tenant_id, email, password_hash, role, active)
- [ ] `roles` — role definitions per tenant (admin, manager, viewer, etc.)
- [ ] `user_roles` — user-to-role mapping

### 1.2 Site Registry & Auth
- [ ] `sites` — registered POS sites (id, tenant_id, name, store_code, timezone, active, created_at)
- [ ] `site_api_keys` — auth keys for site agents (id, site_id, key_hash, active, created_at, last_used_at)
- [ ] `site_heartbeats` — heartbeat log (site_id, last_seen_at, records_sent, status)

### 1.3 Consolidated Transactional Data
- [ ] `ej_transactions` — sales transactions (id, tenant_id, site_id, ej_seq, timestamp, terminal_id, operator_id, total_amount, payment_method, ...)
- [ ] `ej_line_items` — transaction line items (id, transaction_id, product_code, description, qty, unit_price, line_total, category)
- [ ] `ej_payments` — payment breakdown (id, transaction_id, method, amount, eftpos_approval_code, terminal_id)
- [ ] `ej_voids_refunds` — voids and refunds (id, transaction_id, original_transaction_id, reason, amount, operator_id)
- [ ] `ej_cash_events` — cash drawer events (id, site_id, timestamp, event_type, amount, operator_id)
- [ ] `ej_operators` — staff performance summary (id, tenant_id, site_id, operator_id, operator_name, date, transaction_count, total_sales)
- [ ] All EJ tables include `tenant_id` + `site_id` for isolation, `ej_seq` + `ej_timestamp` for dedup/gap detection

### 1.4 Panel Configuration
- [ ] `dashboard_panels` — panel definitions (id, tenant_id, name, panel_type, data_source_query, config JSONB, role_access JSONB, position, active)
- [ ] `panel_types` — catalog of available panel types (kpi, line_chart, bar_chart, table, pie, gauge, currency)
- [ ] `panel_configs` — per-panel config (data source, time range, refresh interval, display format, thresholds, colors)

### 1.5 Theming & Branding
- [ ] `tenant_themes` — per-tenant visual config (id, tenant_id, primary_color, secondary_color, logo_url, font_family, dark_mode_default, layout_preset)

### 1.6 Audit & System
- [ ] `audit_log` — config changes, user actions, site registrations (id, tenant_id, user_id, action, entity_type, entity_id, timestamp, details JSONB)
- [ ] `data_watermarks` — per-site last relayed record tracking (site_id, last_ej_seq, last_ej_timestamp, updated_at)

### 1.7 Migration
- [ ] Create Alembic migration for all above tables
- [ ] Add seed data: default roles, default panel types, default theme
