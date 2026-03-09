# Feature Flag Service

## What This Is

A full-stack Node.js/Express feature flag service with both a REST API and a frontend dashboard. It allows teams to manage feature flags with environment scoping (dev, staging, production), targeting rules (percentage rollout, user allowlists/blocklists), flag evaluation with user context, and evaluation analytics — all with in-memory storage and no database dependency.

## Core Value

Reliable flag evaluation — given a user context and flag configuration, the service must correctly evaluate which flags are on/off, respecting environment scoping, percentage rollouts, and user targeting rules.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] CRUD operations for feature flags (name, description, enabled/disabled, created_at)
- [ ] Environment scoping — flags can have different states per environment (dev, staging, production)
- [ ] Targeting rules — percentage rollout and user ID allowlists/blocklists
- [ ] Flag evaluation endpoint — given user context (userId, attributes), evaluate which flags are on
- [ ] Evaluation logging — track evaluation counts, true vs false counts per flag
- [ ] API key authentication for the evaluation endpoint
- [ ] Frontend dashboard — list flags, toggle status, create/edit with targeting rules
- [ ] Per-flag analytics view (evaluation counts, true/false ratio)
- [ ] Environment switcher in dashboard (dev/staging/prod)
- [ ] In-memory storage (no database needed)
- [ ] Clean, functional UI with vanilla HTML/CSS/JS

### Out of Scope

- Database persistence — in-memory only for v1
- User authentication/accounts for dashboard — single-user, no login needed
- Webhooks or real-time updates — polling is sufficient
- SDKs for other languages — REST API only
- Flag dependencies or prerequisites — each flag is independent
- A/B test statistical analysis — just raw counts

## Context

- Stack: Node.js with Express
- Frontend: Static HTML/CSS/JS served from Express (no framework)
- Storage: In-memory JavaScript objects (Maps/objects)
- Deployment target: Vercel
- No external services or databases required
- API key auth is for the evaluation endpoint only; dashboard is unauthenticated

## Constraints

- **Stack**: Node.js/Express — specified by project requirements
- **Storage**: In-memory only — no database dependency
- **Frontend**: Vanilla HTML/CSS/JS — no framework, served as static files from Express
- **Deployment**: Must deploy to Vercel — needs vercel.json with proper configuration
- **Architecture**: Single Express app serving both API and static frontend

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| In-memory storage over database | Simplicity, no external deps, fast for v1 | — Pending |
| Vanilla HTML/CSS/JS over framework | Minimal complexity, no build step, easy to serve | — Pending |
| Single Express app for API + frontend | Simple deployment, single Vercel function | — Pending |
| API key auth for evaluation only | Dashboard is internal tool, evaluation is external-facing | — Pending |

---
*Last updated: 2026-03-10 after initialization*
