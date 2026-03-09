# Requirements: Feature Flag Service

**Defined:** 2026-03-10
**Core Value:** Reliable flag evaluation — given a user context and flag configuration, the service must correctly evaluate which flags are on/off, respecting environment scoping, percentage rollouts, and user targeting rules.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Flag Management

- [ ] **FLAG-01**: User can create a feature flag with name, description, and initial enabled/disabled state
- [ ] **FLAG-02**: User can read/list all feature flags with their current state
- [ ] **FLAG-03**: User can update a feature flag's name, description, and enabled/disabled state
- [ ] **FLAG-04**: User can delete a feature flag
- [ ] **FLAG-05**: Each flag has an auto-generated created_at timestamp

### Environment Scoping

- [ ] **ENV-01**: User can set different enabled/disabled states per environment (dev, staging, production)
- [ ] **ENV-02**: User can switch between environments in the dashboard to view/manage flags per environment
- [ ] **ENV-03**: Flag evaluation respects the environment parameter in the request

### Targeting Rules

- [ ] **TARG-01**: User can configure percentage rollout for a flag (e.g., 25% of users see it enabled)
- [ ] **TARG-02**: User can add user IDs to an allowlist (flag always enabled for these users)
- [ ] **TARG-03**: User can add user IDs to a blocklist (flag always disabled for these users)
- [ ] **TARG-04**: Blocklist takes priority over allowlist which takes priority over percentage rollout

### Flag Evaluation

- [ ] **EVAL-01**: Evaluation endpoint accepts user context (userId, attributes) and returns evaluated flag states
- [ ] **EVAL-02**: Evaluation correctly applies environment scoping
- [ ] **EVAL-03**: Evaluation correctly applies targeting rules (percentage, allowlist, blocklist)
- [ ] **EVAL-04**: Percentage rollout is deterministic per userId (same user always gets same result)
- [ ] **EVAL-05**: Evaluation endpoint requires API key authentication

### Analytics

- [ ] **ANLYT-01**: Each flag evaluation is logged (increments evaluation count)
- [ ] **ANLYT-02**: True vs false evaluation counts are tracked separately per flag
- [ ] **ANLYT-03**: Per-flag analytics view shows evaluation counts and true/false ratio

### Dashboard

- [ ] **DASH-01**: Dashboard lists all feature flags with their current status
- [ ] **DASH-02**: Dashboard provides toggle switches to enable/disable flags
- [ ] **DASH-03**: Dashboard provides a create/edit form for flags including targeting rules
- [ ] **DASH-04**: Dashboard includes an environment switcher (dev/staging/prod)
- [ ] **DASH-05**: Dashboard shows per-flag analytics (evaluation counts, true/false ratio)
- [ ] **DASH-06**: Dashboard is served as static HTML/CSS/JS from Express

### API Authentication

- [ ] **AUTH-01**: System generates API keys for flag evaluation access
- [ ] **AUTH-02**: Evaluation endpoint rejects requests without valid API key
- [ ] **AUTH-03**: Dashboard endpoints (CRUD) do not require authentication

## v2 Requirements

### Persistence

- **PERS-01**: Flag data persists across server restarts (database integration)
- **PERS-02**: Evaluation logs persist to a time-series store

### Advanced Targeting

- **ADVT-01**: Attribute-based targeting (e.g., enable for users with plan=enterprise)
- **ADVT-02**: Flag scheduling (enable/disable at specific times)
- **ADVT-03**: Flag dependencies (flag B only active if flag A is active)

### Multi-tenancy

- **MULT-01**: Multiple projects/workspaces with separate flag namespaces
- **MULT-02**: User accounts and role-based access control for dashboard

## Out of Scope

| Feature | Reason |
|---------|--------|
| Database persistence | In-memory only for v1 — simplicity |
| User accounts for dashboard | Single-user internal tool for v1 |
| Webhooks / real-time updates | Polling is sufficient for v1 |
| Language SDKs | REST API is the integration point |
| A/B test statistical analysis | Just raw evaluation counts |
| Flag dependencies | Each flag is independent in v1 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FLAG-01 | Phase 1 | Pending |
| FLAG-02 | Phase 1 | Pending |
| FLAG-03 | Phase 1 | Pending |
| FLAG-04 | Phase 1 | Pending |
| FLAG-05 | Phase 1 | Pending |
| ENV-01 | Phase 2 | Pending |
| ENV-02 | Phase 2 | Pending |
| ENV-03 | Phase 2 | Pending |
| TARG-01 | Phase 3 | Pending |
| TARG-02 | Phase 3 | Pending |
| TARG-03 | Phase 3 | Pending |
| TARG-04 | Phase 3 | Pending |
| EVAL-01 | Phase 2 | Pending |
| EVAL-02 | Phase 2 | Pending |
| EVAL-03 | Phase 3 | Pending |
| EVAL-04 | Phase 3 | Pending |
| EVAL-05 | Phase 3 | Pending |
| ANLYT-01 | Phase 4 | Pending |
| ANLYT-02 | Phase 4 | Pending |
| ANLYT-03 | Phase 4 | Pending |
| DASH-01 | Phase 4 | Pending |
| DASH-02 | Phase 4 | Pending |
| DASH-03 | Phase 4 | Pending |
| DASH-04 | Phase 4 | Pending |
| DASH-05 | Phase 4 | Pending |
| DASH-06 | Phase 4 | Pending |
| AUTH-01 | Phase 3 | Pending |
| AUTH-02 | Phase 3 | Pending |
| AUTH-03 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 28 total
- Mapped to phases: 28
- Unmapped: 0

---
*Requirements defined: 2026-03-10*
*Last updated: 2026-03-10 after initial definition*
