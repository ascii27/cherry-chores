# Agent Guide: Cherry Chores Repo Map

This file orients an agent (and humans) to the repo’s structure, key flows, and common commands.

## Overview
- Monorepo with `api/` (Express + TypeScript) and `web/` (React + Vite).
- Single-container runtime: API can statically serve the built web app.
- Dev runs API and Web separately; tests per package; CI runs both.

## Layout
- `api/`: Express API with TypeScript
  - `src/app.ts`: App factory wiring CORS, JSON, routes, JWT, static web serving.
  - `src/index.ts`: Boots server on `PORT` (default 3000).
  - `src/routes/*`: Route modules (`auth`, `families`, `children`, `chores`, `bank`, `savers`, `me`, `config`).
  - `src/middleware/auth.ts`: JWT bearer parsing and attach user context.
  - `src/auth.ts` + `src/auth.google.ts`: Dev auth provider and Google OAuth wiring (enabled via env).
  - `src/repositories.ts`: Interfaces + `InMemoryRepos` (Users, Families, Chores, Bank, Savers).
  - `src/repos.*.pg.ts`: Postgres-backed repos (`chores`, `bank`, `savers`) and `repos.pg.ts` helpers.
  - `src/bank.memory.ts`: In-memory bank for non-DB runs.
  - `src/*.types.ts`: Domain types for chores, bank, savers, shared user/family types.
  - `tests/*`: Jest tests (phased by feature set) + `tests/test.env.ts` harness.
  - `package.json`: Jest, ts-node-dev, tsc.

- `web/`: React + Vite client
  - `src/App.tsx`, `src/main.tsx`: App entry and router setup.
  - `src/routes/*`: `ParentDashboard`, `ChildDashboard` views.
  - `src/components/*`: UI pieces (TopBar, StatCard, ProgressBar, Toast, GoldCoin, etc.).
  - `src/styles/tokens.css`: Design tokens.
  - `vite.config.ts`, `vitest.config.ts`, `setupTests.ts`, `App.test.tsx`.
  - `package.json`: Vite, Vitest, Bootstrap.

- Root & ops
  - `README.md`: Quick start, endpoints, roadmap, structure.
  - `Dockerfile` (root): Single image build (web build + API) for prod-like run.
  - `docker-compose.yml`: Dev stack with Postgres; API auto-creates tables.
  - `.github/workflows/*.yml`: CI for API + Web and Docker image.
  - `specs/`: PRD and implementation plans.

## Dev Commands (root)
- Install: `npm install`
- Start dev (web+api): `npm run dev`
- Build all: `npm run build`
- Prod start (serves built web at `/`): `npm run start:prod`
- Tests (all): `npm test`

API-only
- Dev: `npm run dev -w api`
- Tests: `npm test -w api`

Web-only
- Dev: `npm run dev -w web`
- Tests: `npm test -w web`

## Runtime Modes
- In-memory (default): No DB; `InMemoryRepos` backs all features.
- Postgres (dev/prod-like): Set `USE_DB=true` and `DATABASE_URL`. Compose handles these.
  - On startup, `PgChoresRepo`, `PgBankRepo`, `PgSaversRepo` call `init()` to ensure tables exist.

## Key Endpoints (summary)
- Meta: `GET /healthz`, `GET /version`.
- Auth: Google OAuth callback (mocked in tests), child login, `GET /me`.
- Families/Children: CRUD and membership.
- Chores: CRUD, child complete/uncomplete, parent approvals.
- Bank: Balance, ledger, parent adjust, spend, weekly payout.
- Savers: Items/goals CRUD (Phase 4+ groundwork present).

## Static Web Serving
- On prod build, API serves `web/dist` if present and SPA-fallbacks unknown routes.
  - Path detection: `WEB_DIST` env or `../../web/dist` from `api/dist`.

## Environment
- `.env.example` shows typical envs. Common:
  - `PORT=3000`, `JWT_SECRET`, `USE_DB=true`, `DATABASE_URL=postgres://...`
  - Google OAuth creds enable Google auth routes.

## Docker
- Compose dev: `docker compose up --build` (brings app + Postgres).
- Manual image: `docker build -t cherry-chores .` then `docker run -p 3000:3000 cherry-chores`.

## Testing & CI
- API: Jest + ts-jest. Web: Vitest + jsdom.
- CI: `.github/workflows/ci.yml` runs both test suites; Docker workflow builds image.

## Where to Extend
- New API feature: add in `api/src/routes/*`, type in `*.types.ts`, storage in a repo (in-memory + pg), wire in `app.ts`.
- New Web view: create route under `web/src/routes` and components under `web/src/components`.
- DB schema changes: update `repos.*.pg.ts` `init()` and queries.

## Useful Files
- `api/src/app.ts`, `api/src/repositories.ts`, `web/src/App.tsx`, `README.md`.

