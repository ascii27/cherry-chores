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

## Current Endpoints (Phase 0)

- `GET /healthz` → `{ status: "ok" }`
- `GET /version` → `{ name, version }`
- In production builds, the API also serves the static SPA from `web/dist` with SPA fallback.

## Notes

- Tests use mocks only; runtime uses Postgres via `pg` with simple SQL init.
- For Phase 1 runtime, set `USE_DB=true` and `DATABASE_URL` for Postgres connection. Compose sets these for you.
- Vitest is configured with globals and jest-dom for the web project; Jest + ts-jest for the API.
- CI runs on PRs and main branch pushes.

## Roadmap (see specs/ImplementationPlan.md)

- Phase 0: Bootstrap, CI, single-container runtime (DONE)
- Phase 1: Auth & Family Setup
- Phase 2: Chore Management & Child Dashboard
- Phase 3: Bank, Ledger, Weekly Payout
- Phase 4: Saver Items & Goals
- Phase 5: Bonus Opportunities & Claims
- Phase 6: UX Customization & Accessibility
