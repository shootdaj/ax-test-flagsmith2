# Roadmap: Feature Flag Service

**Created:** 2026-03-10
**Phases:** 5
**Depth:** Standard

## Overview

| # | Phase | Goal | Requirements | Success Criteria |
|---|-------|------|--------------|------------------|
| 1 | Core API & Storage | CRUD operations for feature flags with in-memory storage | FLAG-01, FLAG-02, FLAG-03, FLAG-04, FLAG-05 | 5 |
| 2 | Environment Scoping & Evaluation | Per-environment flag states and basic evaluation endpoint | ENV-01, ENV-02, ENV-03, EVAL-01, EVAL-02 | 5 |
| 3 | Targeting Rules & Auth | Percentage rollout, allowlists/blocklists, API key auth | TARG-01, TARG-02, TARG-03, TARG-04, EVAL-03, EVAL-04, EVAL-05, AUTH-01, AUTH-02, AUTH-03 | 5 |
| 4 | Analytics & Dashboard | Evaluation logging, analytics, and full frontend dashboard | ANLYT-01, ANLYT-02, ANLYT-03, DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, DASH-06 | 5 |
| 5 | Integration Testing & Deployment | End-to-end testing, Vercel deployment configuration, polish | All | 4 |

---

## Phase 1: Core API & Storage

**Goal:** Build the Express server foundation with CRUD API for feature flags and in-memory storage layer.

**Requirements:** FLAG-01, FLAG-02, FLAG-03, FLAG-04, FLAG-05

**Success Criteria:**
1. Express server starts and responds to health check at GET /health
2. POST /api/flags creates a flag and returns it with auto-generated id and created_at
3. GET /api/flags returns all flags; GET /api/flags/:id returns one flag
4. PUT /api/flags/:id updates a flag's name, description, or enabled state
5. DELETE /api/flags/:id removes a flag and returns 204

---

## Phase 2: Environment Scoping & Evaluation

**Goal:** Add per-environment flag states (dev/staging/production) and a basic flag evaluation endpoint.

**Requirements:** ENV-01, ENV-02, ENV-03, EVAL-01, EVAL-02

**Success Criteria:**
1. Flag data structure includes per-environment enabled state (environments: { dev: true, staging: false, production: false })
2. CRUD operations accept and persist environment-specific states
3. POST /api/evaluate accepts { userId, environment } and returns all flag states for that environment
4. Evaluation respects the per-environment enabled/disabled state
5. Invalid environment returns 400 error with clear message

---

## Phase 3: Targeting Rules & Authentication

**Goal:** Implement targeting rules (percentage rollout, allowlists, blocklists) and API key authentication for the evaluation endpoint.

**Requirements:** TARG-01, TARG-02, TARG-03, TARG-04, EVAL-03, EVAL-04, EVAL-05, AUTH-01, AUTH-02, AUTH-03

**Success Criteria:**
1. Flags support targeting rules: percentage (0-100), allowlist (array of userIds), blocklist (array of userIds)
2. Evaluation applies targeting rules with correct priority: blocklist > allowlist > percentage
3. Percentage rollout is deterministic for a given userId (hash-based, not random)
4. API key is generated on server start and required via X-API-Key header for /api/evaluate
5. CRUD endpoints (/api/flags/*) work without authentication

---

## Phase 4: Analytics & Dashboard

**Goal:** Add evaluation logging/analytics and build the complete frontend dashboard.

**Requirements:** ANLYT-01, ANLYT-02, ANLYT-03, DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, DASH-06

**Success Criteria:**
1. Every flag evaluation increments per-flag counters (total evaluations, true count, false count)
2. GET /api/flags/:id/analytics returns evaluation counts and true/false ratio
3. Dashboard at / lists all flags with toggle switches that call the API
4. Dashboard has create/edit form with targeting rule fields (percentage, allowlist, blocklist)
5. Dashboard has environment switcher and per-flag analytics display

---

## Phase 5: Integration Testing & Deployment

**Goal:** Comprehensive end-to-end testing, Vercel deployment configuration, and final polish.

**Requirements:** All (validation pass)

**Success Criteria:**
1. All unit, integration, and scenario tests pass
2. vercel.json properly configured with api/index.js entry point
3. Application deploys and runs successfully on Vercel
4. Health endpoint, flag CRUD, evaluation, and dashboard all work in deployed environment

---

*Roadmap created: 2026-03-10*
