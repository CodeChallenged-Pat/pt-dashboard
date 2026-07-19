# PT Dashboard

Multi-tenant SaaS dashboard for ProfitTrack POS data aggregation, visualization, and reporting.

## Overview

Cloud-hosted dashboard that consolidates electronic journal (EJ) data from ProfitTrack POS installations across multiple sites and customers. Each site runs a lightweight agent that relays transactional data to a central cloud API. The dashboard provides configurable, role-aware panels with theming/branding per tenant.

## Key Architecture Decisions

- **Multi-tenant SaaS** — any ProfitTrack customer can register, onboard sites, and see their data
- **Pluggable source adapters** — designed for ProfitTrack EJ data now, extensible to other POS/ERP systems (optics retail ERP with Josh)
- **Heartbeat model** — site agents relay data at defined intervals (not real-time)
- **Role-aware panels** — each panel carries role access config; users see only panels their roles permit
- **Self-hosted dev/staging** — Linux NUC for development; cloud hosting for production
- **Postgres** — consolidated transactional database in the cloud

## Architecture

```
SITES (per customer)                    CLOUD
┌──────────────┐                       ┌─────────────────────────────┐
│ ProfitTrack  │                       │  React Dashboard (browser)   │
│  ├─ PT DB    │                       │  - Role-aware panels        │
│  └─ Reports  │                       │  - Per-tenant theming       │
│     DB (EJ)  │                       │  - Cog config per panel     │
│      │        │                       └──────────┬──────────────────┘
│ ┌────▼─────┐ │     HTTPS + auth      ┌──────────▼──────────────────┐
│ │Site Agent│ │ ──────────────────────►│  FastAPI Cloud API          │
│ │(relay EJ │ │                       │  - Site registration/auth   │
│ │ → cloud) │ │                       │  - EJ ingest endpoint       │
│ └──────────┘ │                       │  - Query API for dashboard  │
└──────────────┘                       │  - Panel config CRUD        │
                                       │  - Tenant/user management   │
                                       └──────────┬──────────────────┘
                                                  │
                                       ┌──────────▼──────────────────┐
                                       │  Postgres (consolidated DB) │
                                       │  - Tenant registry          │
                                       │  - Site registry + auth keys│
                                       │  - Transactional EJ data    │
                                       │  - Panel configs            │
                                       │  - User accounts + roles    │
                                       └─────────────────────────────┘
```

## Repo Structure (planned)

```
pt-dashboard/
├── docs/
│   ├── plans/           # Implementation plans
│   ├── schema/          # Database schema docs
│   └── architecture/   # Architecture decision records
├── cloud-api/           # FastAPI backend (cloud side)
│   ├── app/
│   │   ├── main.py
│   │   ├── models/      # SQLAlchemy models
│   │   ├── routes/      # API endpoints
│   │   ├── auth/        # Tenant + user auth
│   │   ├── ingest/      # EJ data ingestion
│   │   └── config.py
│   ├── alembic/         # DB migrations
│   ├── tests/
│   └── pyproject.toml
├── dashboard-web/       # React frontend
│   ├── src/
│   │   ├── components/  # Panel components, shell, theming
│   │   ├── pages/       # Dashboard, admin, settings
│   │   ├── lib/         # API client, auth
│   │   └── styles/
│   ├── package.json
│   └── vite.config.ts
├── site-agent/          # Local relay agent (runs on customer site)
│   ├── agent/
│   │   ├── main.py      # Heartbeat loop, relay logic
│   │   ├── readers/     # Pluggable source adapters (PT EJ, future ERP)
│   │   ├── config.py
│   │   └── auth.py
│   ├── tests/
│   └── pyproject.toml
└── docker-compose.yml   # Dev environment (API + Postgres)
```

## Development Phases

See `docs/plans/` for detailed task-by-task implementation plans.

## Status

**Phase 0 — Scoping & Understanding** (current)

Awaiting:
- ProfitTrack installation + copy databases for schema inspection
- Heartbeat interval definition
- Reports database schema understanding
