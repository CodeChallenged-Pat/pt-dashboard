# Phase 4-5 — Dashboard Frontend

## Phase 4 — Dashboard Shell & Auth

### 4.1 Project Scaffold
- [ ] `dashboard-web/` — Vite + React + TypeScript
- [ ] Tailwind CSS for styling
- [ ] React Router for navigation
- [ ] API client library (`src/lib/api.ts`) — axios/fetch wrapper with JWT refresh
- [ ] Auth context provider — manages user, tenant, roles, theme
- [ ] `src/lib/auth.ts` — token storage, auth header builder

### 4.2 Auth Pages
- [ ] `/login` — email/password login, calls cloud API
- [ ] `/register` — tenant signup (company name, email, password → creates tenant + admin user)
- [ ] Auth guard component — redirects to /login if unauthenticated
- [ ] Auto-refresh JWT before expiry

### 4.3 Dashboard Shell
- [ ] App layout: top bar (logo, tenant name, user menu, theme toggle) + main content area
- [ ] Sidebar or tab navigation: Dashboard, Sites, Users, Settings (role-filtered)
- [ ] Theme provider — loads tenant theme from API, applies CSS variables
- [ ] Light/dark mode toggle with persistence

### 4.4 Panel Container Component (The Card)
- [ ] `PanelCard` — bounded quadrangle with rounded corners, heading, cog icon
- [ ] Props: title, panelType, data, config, onConfigClick
- [   ] Cog icon (top-right) → opens panel config modal
- [ ] "Last updated: X min ago" indicator in card footer
- [ ] Loading skeleton state
- [ ] Error state ("No data" / "Connection error")
- [ ] Responsive: grid that reflows (1 col mobile, 2 col tablet, 3+ col desktop)

### 4.5 Panel Config Modal (Cog Icon)
- [ ] Config form per panel type:
  - Data source / query type
  - Time range (today, 7d, 30d, custom)
  - Site filter (all sites, specific site)
  - Refresh interval (5m, 15m, 1h, manual)
  - Display format (currency, percentage, count)
  - Role access (checkbox list of roles who can see this panel)
  - Color/threshold overrides
- [ ] Save → `PATCH /panels/{id}` → refresh panel

## Phase 5 — Panel Types & Data Visualization

### 5.1 Panel Type Registry
- [ ] Registry pattern: each panel type is a React component + data transformer
- [ ] `KpiPanel` — single metric with label (e.g., "Today's Sales: $12,345")
- [ ] `LineChartPanel` — time series (sales over time) using Recharts
- [ ] `BarChartPanel` — categorical comparison (sales by store/category)
- [ ] `DataTablePanel` — sortable, paginated table (recent transactions)
- [ ] `PieChartPanel` — distribution (payment method breakdown)
- [ ] `GaugePanel` — target vs actual (progress toward goal)
- [ ] `CurrencyPanel` — live FX rate display (integration with exchange rate API)

### 5.2 Data Fetching
- [ ] Per-panel data hook: `usePanelData(panelId, params)`
- [ ] Polling based on panel refresh interval
- [ ] Shared data cache (React Query or SWR) — avoid duplicate fetches
- [ ] Date range picker in panel config affects query

### 5.3 Panel Layout & Customization
- [ ] Dashboard grid (CSS Grid or react-grid-layout)
- [ ] Drag-and-drop panel repositioning (optional for v1 — at minimum, fixed grid with config-based ordering)
- [ ] "Add Panel" button → choose type → create panel → appears on dashboard
- [ ] Panel visibility per role (hide panels user doesn't have access to)
- [ ] Dashboard layout persistence → `PUT /dashboards/{id}`

### 5.4 Multi-Site Views
- [ ] Site selector (dropdown: All Sites, or specific site)
- [ ] When "All Sites" selected, panels aggregate across sites
- [ ] When specific site selected, panels filter to that site
- [   ] Per-site drill-down: click a panel element → filter to that site
- [ ] Site health indicator (green/yellow/red) based on last heartbeat

## Phase 6 — Theming & Branding

### 6.1 Theme System
- [ ] CSS variables driven by tenant theme (primary, secondary, accent, background, surface, text)
- [ ] Font family override
- [ ] Logo upload + display in top bar
- [   ] Dark/light mode with theme-aware variables
- [ ] Theme preview in settings before saving

### 6.2 Theme Admin
- [ ] Settings page → Theme tab
- [ ] Color pickers for each theme variable
- [ ] Logo upload (file → cloud storage or base64 in DB)
- [ ] Layout preset selection (dense, comfortable, spacious)
- [ ] Reset to defaults button

## Phase 7 — Operational Features

### 7.1 Site Management Page
- [ ] List all sites for current tenant (name, code, status, last heartbeat, records relayed)
- [ ] Register new site → generates API key → shows installer instructions
- [ ] Deactivate/reactivate site
- [ ] Regenerate API key
- [ ] View site data flow health (watermark, gaps, errors)

### 7.2 User Management Page (admin)
- [ ] List users, invite users, assign roles, deactivate
- [ ] Role management: define custom roles per tenant (optional v2 — start with admin/manager/viewer)

### 7.3 Data Freshness & Health
- [ ] Global status bar: "All sites reporting" / "Site X last seen 2h ago — WARNING"
- [ ] Per-panel "Last updated" timestamp
- [ ] Gap detection alert: "Site Y may have missing data (gap in EJ sequence)"

### 7.4 Export
- [ ] Panel data export to CSV
- [ ] Dashboard snapshot export to PDF (print-optimized CSS or html2canvas)
- [ ] Date range export (all transactions for a period)

## Phase 8 — Production Readiness

### 8.1 Security Hardening
- [ ] Input validation on all API endpoints (Pydantic strict mode)
- [ ] SQL injection prevention (SQLAlchemy parameterized queries — already covered)
- [ ] CORS configuration (specific origins, not wildcard)
- [   ] Rate limiting on auth endpoints (prevent brute force)
- [ ] Audit logging for all config changes
- [ ] No PCI data stored — verify EJ relay excludes card numbers
- [ ] TLS everywhere (Let's Encrypt in production)

### 8.2 Hosting Deployment
- [ ] Dockerfile for cloud-api
- [   ] Dockerfile for dashboard-web (nginx serving built assets)
- [ ] docker-compose.yml for production (API + Postgres + Nginx reverse proxy)
- [ ] Environment variable management (no secrets in images)
- [ ] Database migration runner (Alembic upgrade on deploy)
- [ ] Health check endpoints for orchestrator
- [ ] Deploy to cloud (see hosting decision below)

### 8.3 Monitoring & Backups
- [ ] API health monitoring (uptime check)
- [ ] Postgres automated backups (managed provider or cron pg_dump to B2)
- [   ] Error tracking (Sentry free tier or simple log aggregation)
- [ ] Alerting: "No data from site X in N hours" → email/notification

### 8.4 Documentation
- [ ] API documentation (FastAPI auto-docs at /docs)
- [ ] Site agent installation guide (for customers)
- [ ] Dashboard user guide
- [ ] Admin guide (tenant setup, site registration, user management)
- [ ] Deployment guide
