# Cherry Chores

Simple, family-friendly chore tracking with weekly “coins,” savings goals, and bonuses.

- Backend: Node.js (Express, TypeScript)
- Frontend: React + Vite (Bootstrap for styling)
- DB: PostgreSQL (introduced in later phases)
- Packaging: Single container (API serves built Web)

## Quick Start

- Dev (two processes):
  - Install deps once at root: `npm install`
  - Start dev servers: `npm run dev`
  - API: http://localhost:3000 (health: `/healthz`, version: `/version`)
  - Web: http://localhost:5173

- Tests:
  - API: `cd api && npm test`
  - Web: `cd web && npm test`

- Single-container (prod-like):
  - Build: `npm run build`
  - Start: `npm run start:prod`
  - App (web+api) at http://localhost:3000

- Docker (with Postgres for dev):
  - Compose: `docker compose up --build` (brings up app + Postgres)
  - The API auto-creates required tables on startup using simple SQL (no migration step required in dev).
  - Or manual: `docker build -t cherry-chores . && docker run -p 3000:3000 cherry-chores`

## Repo Structure

- `api/` Express API (TypeScript). Serves `web/dist` in production.
- `web/` React + Vite client using Bootstrap.
- `specs/` PRD and implementation plan.
- `Dockerfile` single container build (builds web+api, serves web via API).
- `.github/workflows/ci.yml` runs unit tests for api and web.

## Current Endpoints (Phase 3)

- Health and meta:
  - `GET /healthz` → `{ status: "ok" }`
  - `GET /version` → `{ name, version }`
  - In production builds, the API also serves the static SPA from `web/dist` with SPA fallback.

- Auth & family:
  - `POST /auth/google/callback` (mocked in tests)
  - `POST /auth/child/login`
  - `GET /me` (Bearer JWT)
  - `POST /families` (parent)
  - `GET /families` (parent)
  - `GET /families/:id` (parent)
  - `PATCH /families/:id` (parent)
  - `POST /families/:id/parents` (parent)
  - `GET /families/:id/parents` (parent)
  - `DELETE /families/:id/parents/:parentId` (parent)
  - `POST /children` (parent)
  - `GET /families/:id/children` (parent)
  - `PATCH /children/:id` (parent)
  - `DELETE /children/:id` (parent)

- Chores & approvals:
  - `POST /chores` (parent)
  - `PATCH /chores/:id` (parent)
  - `DELETE /chores/:id` (parent)
  - `GET /chores?familyId=...` (parent)
  - `GET /children/:childId/chores?scope=today|week`
  - `POST /chores/:id/complete` (child)
  - `POST /chores/:id/uncomplete` (child)
  - `GET /approvals?familyId=...` (parent)
  - `POST /approvals/:id/approve|reject` (parent)
  - `POST /approvals/bulk-approve|bulk-reject` (parent)

- Bank & ledger (Phase 3):
  - `GET /bank/:childId` → `{ balance: { available, reserved }, entries: [...] }`
  - `POST /bank/:childId/adjust` (parent) → credit/debit; ledger stores actor metadata
  - `POST /bank/:childId/spend` (child or parent) → debit with insufficient-funds check
  - `POST /bank/payout` (parent) → manual weekly payout for current week; idempotent per family+week

## Notes

- Tests use mocks only; runtime uses Postgres via `pg` with simple SQL init.
- For Phase 1 runtime, set `USE_DB=true` and `DATABASE_URL` for Postgres connection. Compose sets these for you.
- Vitest is configured with globals and jest-dom for the web project; Jest + ts-jest for the API.
- CI runs on PRs and main branch pushes.

## Roadmap (see specs/ImplementationPlan.md)

- Phase 0: Bootstrap, CI, single-container runtime (DONE)
- Phase 1: Auth & Family Setup (DONE)
- Phase 2: Chore Management & Child Dashboard (DONE)
- Phase 3: Bank, Ledger, Weekly Payout (in progress on `phase-3-bank-ledger`)
- Phase 4: Saver Items & Goals
- Phase 5: Bonus Opportunities & Claims
- Phase 6: UX Customization & Accessibility
