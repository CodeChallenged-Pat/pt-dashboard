# Hosting Research & Recommendation

## Constraints
- Low budget (start small, scale later)
- Multi-tenant SaaS (multiple customers' data isolated)
- Postgres database (consolidated transactional data)
- FastAPI backend
- React static frontend
- Need managed backups (delegate responsibility)
- Dev/staging on Linux NUC first

## Option A: Fully Managed Split (Recommended for MVP → Scale)

| Layer | Provider | Free Tier | Paid | Backups |
|---|---|---|---|---|
| Frontend | Vercel or Netlify | Yes (unlimited static) | $0 | Git-based redeploy |
| API | Railway | $5/mo hobby (500hrs) | $20/mo pro | Snapshots included |
| Database | Neon Postgres | 3GB free, 100 compute hours | $19/mo scale | Automated PITR |
| Email | Resend | 100/day free | $20/mo | N/A |
| **Total MVP** | | | **~$5/mo** | |
| **Total scaled** | | | **~$45/mo** | |

**Pros:** Zero infra management, backups delegated, each layer scales independently, Git-based deploys
**Cons:** Three services to configure, Neon free tier has compute hour limits (suspends after idle)

## Option B: Single VPS (Cheapest)

| Layer | Provider | Cost | Backups |
|---|---|---|---|
| Everything | Hetzner CX22 | €4.50/mo (~$7 NZD) | Manual (cron pg_dump → B2) |
| Everything | Oracle Cloud Free | $0 (ARM, 4 core, 24GB) | Manual |
| Everything | DigitalOcean Droplet | $4-6/mo | Manual (snapshots $0.06/GB) |

**Pros:** One bill, full control, cheapest
**Cons:** You manage backups, single point of failure, no auto-scaling

## Option C: Hybrid (NUC Dev + Cloud Prod)

| Stage | Where | Cost |
|---|---|---|
| Dev/Staging | Linux NUC (self-hosted) | $0 (hardware you own) |
| Prod MVP | Vercel (frontend) + Railway (API) + Neon (DB) | ~$5/mo |
| Prod Scale | Migrate to dedicated VPS or managed k8s | $20-50/mo |

## Recommendation

### Phase 1: Dev on NUC (now)
- Docker-compose with Postgres + FastAPI + Nginx serving React build
- Full multi-tenant stack running on NUC
- Test with Pat's ProfitTrack copy databases
- Zero monthly cost

### Phase 2: Cloud MVP (first paying customer)
- **Frontend:** Vercel free tier (auto-deploy from GitHub)
- **API:** Railway hobby tier ($5/mo)
- **DB:** Neon free tier → Scale plan when data > 3GB ($19/mo)
- **Total: ~$5/mo** until data grows

### Phase 3: Scale (many customers)
- Evaluate moving to dedicated VPS (Hetzner €10-20/mo) with self-managed Postgres
- OR stay on managed stack (Neon + Railway) which scales linearly
- Add monitoring (UptimeRobot free, Sentry free tier)
- Add email (Resend free tier → paid when volume grows)

## Cost Trajectory

```
Month 1-3 (dev):      $0  (NUC)
Month 4-6 (MVP):      $5/mo  (Vercel + Railway + Neon free)
Month 7-12 (early):   $24/mo (Neon Scale + Railway + Vercel)
Year 2 (growth):      $50/mo (larger DB + API + email + monitoring)
```

## Backup Strategy by Phase

| Phase | Strategy | Who's Responsible |
|---|---|---|
| NUC dev | cron pg_dump to local disk | Us (cron script) |
| Cloud MVP | Neon automated PITR (point-in-time recovery) | Neon (managed) |
| Cloud scale | Neon PITR + weekly pg_dump to B2 ($0.50/mo) | Neon + us (B2 copy) |

## Domain & TLS
- Register domain (~$15/yr from Cloudflare or Namecheap)
- Vercel handles TLS automatically (Let's Encrypt)
- API TLS via Railway or Caddy/Nginx reverse proxy
- No additional TLS cost

## Key Decision: Oracle Cloud Free Tier

Oracle's Always Free tier offers **4 ARM cores, 24GB RAM, 200GB storage** — enough to run the entire stack (API + Postgres + Nginx) for $0/mo indefinitely. This is the most generous free tier available.

**Risk:** Oracle has historically terminated idle free instances. Mitigate by ensuring the dashboard gets regular traffic (heartbeats count).

**Recommendation:** Use Oracle Free for dev/staging, not production. Production data is too important to risk Oracle account termination.

## Summary

| Question | Answer |
|---|---|
| Cheapest viable prod hosting | Vercel + Railway + Neon = ~$5/mo |
| Where to dev | Linux NUC (zero cost, full control) |
| When to move to cloud | When first customer needs 24/7 access |
| Who handles backups | Neon (managed PITR) — delegated as requested |
| Scale path | Neon + Railway scale linearly, or migrate to VPS |
