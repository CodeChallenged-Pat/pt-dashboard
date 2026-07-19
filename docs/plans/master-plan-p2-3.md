# Phase 1 (cont.) — Cloud API

## Phase 2 — Cloud API (FastAPI)

### 2.1 Project Scaffold
- [ ] `cloud-api/` project structure, pyproject.toml, dependencies (fastapi, sqlalchemy, alembic, asyncpg, pydantic, python-jose, passlib)
- [ ] Config module (Pydantic settings: DB URL, JWT secret, CORS origins)
- [ ] Database session management (async SQLAlchemy)
- [ ] Health check endpoint `GET /health`

### 2.2 Authentication & Multi-Tenancy
- [ ] Password hashing (passlib/bcrypt)
- [ ] JWT token issuance for dashboard users (access + refresh)
- [ ] JWT middleware — extracts tenant_id from token
- [ ] API key auth for site agents (X-API-Key header → site lookup)
- [ ] Tenant isolation dependency — enforces tenant_id scoping on all queries
- [ ] Role-based access control (RBAC) dependency — checks user role for endpoint access
- [ ] `POST /auth/register` — tenant signup (creates tenant + admin user)
- [ ] `POST /auth/login` — user login, returns JWT
- [ ] `POST /auth/refresh` — refresh token

### 2.3 Site Registration & Management
- [ ] `POST /sites` — register a new site (generates API key)
- [ ] `GET /sites` — list sites for current tenant
- [ ] `GET /sites/{id}` — site details + heartbeat status
- [ ] `PATCH /sites/{id}` — update site config (name, timezone, active)
- [ ] `DELETE /sites/{id}` — deactivate site (soft delete, keep data)
- [ ] `POST /sites/{id}/regenerate-key` — rotate API key

### 2.4 EJ Data Ingestion
- [ ] `POST /ingest/ej` — bulk EJ relay endpoint (site agent → cloud API)
  - Accepts batch of EJ records (transactions, line items, payments, voids)
  - Idempotency: dedup by (site_id, ej_seq)
  - Updates data watermark on success
  - Returns accepted/rejected/duplicate counts
- [ ] `POST /ingest/heartbeat` — site agent heartbeat (no data, just "I'm alive")
- [ ] Rate limiting per site (configurable, default 60 requests/hour)
- [ ] Ingest validation — reject malformed records, log errors

### 2.5 Dashboard Query API
- [ ] `GET /panels` — list panels for current user (filtered by role_access)
- [ ] `POST /panels` — create panel (admin only)
- [ ] `PATCH /panels/{id}` — update panel config (cog icon)
- [ ] `DELETE /panels/{id}` — delete panel
- [ ] `GET /panels/{id}/data` — fetch data for a panel (executes configured query)
  - Supports time range, site filter, aggregation params
  - Returns data in panel-type-appropriate format
- [ ] `GET /panels/types` — list available panel types
- [ ] `GET /dashboards` — list saved dashboard layouts for current user
- [ ] `PUT /dashboards/{id}` — save dashboard layout (panel positions, visibility)

### 2.6 Theming API
- [ ] `GET /theme` — current tenant theme
- [ ] `PUT /theme` — update tenant theme (admin only)

### 2.7 User & Role Management
- [ ] `GET /users` — list users for current tenant (admin only)
- [ ] `POST /users` — invite/create user (admin only)
- [ ] `PATCH /users/{id}` — update user role
- [ ] `DELETE /users/{id}` — deactivate user
- [ ] `GET /roles` — list available roles

### 2.8 Audit & Health
- [ ] `GET /audit` — audit log (admin only, paginated)
- [ ] `GET /sites/{id}/health` — site data flow status (last heartbeat, data freshness, gap detection)
- [ ] `GET /admin/stats` — system-wide stats (super admin only)

## Phase 3 — Site Agent

### 3.1 Project Scaffold
- [ ] `site-agent/` project structure, pyproject.toml
- [ ] Config module (site_id, api_key, cloud_api_url, heartbeat_interval, db_path)
- [ ] Local config file format (YAML or TOML)
- [ ] Windows service wrapper (or scheduled task config)

### 3.2 ProfitTrack EJ Reader (Pluggable Adapter)
- [ ] Abstract `BaseReader` interface (get_records_since(watermark) → list[dict])
- [ ] `ProfitTrackEJReader` — reads EJ data from local reports DB (Firebird)
  - Connect to reports FDB (read-only)
  - Query EJ tables using watermark (timestamp or sequence)
  - Return normalized record batch
- [ ] Reader registry — maps source type to reader class
- [ ] Future: `OpticsERPReader` stub (for Josh's ERP)

### 3.3 Relay Logic
- [ ] Heartbeat loop (asyncio):
  1. Read new EJ records since last watermark
  2. Batch records (configurable batch size)
  3. POST to cloud API `/ingest/ej` with API key auth
  4. On success: update local watermark
  5. On failure: retry with backoff (exponential, max 5 attempts)
  6. If still failing: queue locally, continue retrying next heartbeat
- [ ] Send heartbeat ping every interval (even if no new data)
- [ ] Offline queue (SQLite local buffer) — store records when cloud unreachable
- [ ] Queue replay when connectivity restored

### 3.4 Agent Configuration & Setup
- [ ] CLI: `site-agent init` — interactive setup (prompt for site_id, api_key, cloud_url, db_path)
- [ ] CLI: `site-agent test` — test connection to cloud API + local DB
- [ ] CLI: `site-agent run` — start heartbeat loop
- [ ] CLI: `site-agent status` — show current watermark, queue size, last heartbeat
- [ ] Windows installer or NSSM service wrapper
- [ ] Log rotation
