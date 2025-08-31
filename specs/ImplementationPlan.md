# Cherry Chores – Implementation Plan

## Purpose
Phased delivery of a usable product at the end of every iteration. Each phase develops on a feature branch and merges to `main` only when completion criteria (including tests) are met.

- Backend: Node.js (Express) + PostgreSQL (via Prisma or Knex; decided in Tech Spec)
- Frontend: Web, mobile-first (React + Vite or SvelteKit; decided in Tech Spec) with Bootstrap
- Testing: Jest + Supertest (API), Testing Library (UI), all DB/auth/cloud dependencies mocked
- Packaging: Docker, ready for AWS container; RDS later

## Branching & CI
- Branch naming: `phase-0-bootstrap`, `phase-1-auth-family`, `phase-2-chores`, etc.
- Merge policy: PR with passing checks (lint, typecheck, unit tests, min coverage) and completion checklist.
- CI: GitHub Actions (or similar) runs `lint`, `typecheck`, `test` on push/PR. Cache deps. No live DB needed.

## Test Strategy
- Unit-first with dependency injection: repositories (DB), auth, scheduler abstracted behind interfaces.
- Use Jest mocks or test doubles; use Supertest to hit Express routes with mocked repositories.
- Fake timers for scheduler tests; invoke job functions directly.
- Contract tests for API request/response shapes; UI component tests for core flows; snapshots only for stable UI (icons/layout).
- Coverage gates (backend): statements 80%, branches 70% (raise over time). Critical paths >90%.

---

## Phase 0 – Project Bootstrap and CI
Branch: `phase-0-bootstrap`

Scope
- Repo scaffolding: monorepo or two folders (`api/`, `web/`) with shared `specs/`.
- Tooling: TypeScript, linting (ESLint), formatting (Prettier), basic env config.
- API stub: Express app with health (`/healthz`), version (`/version`). In production, also serves `web/dist` statically with SPA fallback.
- Web stub: Vite app with Bootstrap, base theme tokens, simple landing.
- Testing setup: Jest, Supertest (API); Testing Library (web). Example tests run in CI.
- Single-container packaging: root `Dockerfile` builds `web` and `api`; runtime serves the web build via the API process. Simplified `docker-compose.yml` with one service.
- Dev scripts: root `npm run dev` runs both servers concurrently; `npm run build` builds web then api; `npm run start:prod` runs the API which serves the web build.

Deliverables
- Running API and web locally (dev) and as a single container (prod-like). CI pipeline green.

Completion Criteria
- `npm run dev` works for `api` and `web`.
- `npm test` passes with example tests and >80% coverage on API stubs.
- Health endpoints return 200 and JSON payload.
 - Docker image builds and serves the SPA at `/` and API at `/healthz`, `/version`.

Validation Tests (examples)
- API: GET `/healthz` => 200 { status: "ok" }.
- API: GET `/version` => includes `version` from package.
- Web: renders landing, contains primary CTA button.

---

## Phase 1 – Auth & Family Setup
Branch: `phase-1-auth-family`

Scope
- Parent auth: Google OAuth (mocked in tests via adapter interface).
- Child accounts: parent creates username/password accounts; simple login for children.
- Family model: create family, add/remove parents (invite flow stub), add/remove children, set timezone.
- Roles/permissions middleware; session management.
- UI: parent sign-in, family dashboard (basic), add child form; child sign-in page and simple dashboard shell.

Deliverables
- Usable: a parent can sign in, create a family, add at least one child; child can sign in and see a placeholder dashboard.

Completion Criteria
- Parents and children authenticate; unauthorized access blocked by role guards.
- Family data persists to DB; migrations versioned.
- Tests for auth flows and family CRUD pass with mocks for Google and DB.

Validation Tests (examples)
- API: POST `/auth/google/callback` => creates/returns parent session (mock Google profile).
- API: POST `/families` => 201 creates family (parent only).
- API: POST `/children` => 201 creates child under family; child login works.
- RBAC: child cannot access parent-only routes (403).
- Web: parent can add child; child sees their name and empty chores list.

---

## Phase 2 – Chore Management & Child Dashboard
Branch: `phase-2-chores`

Scope
- Chores: CRUD with fields (name, description, value, recurrence daily/weekly, due day/time, requiresApproval, assignments, active).
- Recurrence engine: compute today/this week views (no rollovers in MVP).
- Child actions: mark done/unmark; if approval required, set status to pending.
- Approvals queue (parent): view pending, approve/reject (no ledger credit yet).
- UI: parent chore builder/list; child dashboard with Today and This Week; pending states.

Deliverables
- Usable: parent creates chores and assigns; child sees list and marks done; parent can approve/reject requiring-approval chores.

Completion Criteria
- Correct visibility of chores per day/week and per child.
- Approval-required chores move to pending and are visible in parent queue.
- All endpoints and views covered by unit/route tests with mocked DB.

Validation Tests (examples)
- API: POST `/chores` => 201; GET `/children/:id/chores?scope=today|week` returns correct items.
- API: POST `/chores/:id/complete` (child) => 200 sets pending/complete as configured; unmark allowed before approval.
- API: POST `/approvals/:id/approve|reject` => updates status.
- Recurrence unit tests: daily vs weekly due computation across week boundaries and timezones.
- Web: child dashboard renders today/week lists; approval badges visible.

---

## Phase 3 – Bank, Ledger, and Weekly Payout
Branch: `phase-3-bank-ledger`

Scope
- Per-child ledger: immutable entries (payout, manual credit/debit, spend, reserve/release placeholder for goals).
- Balance view: available vs reserved (reserved zero until goals phase).
- Weekly payout job: Sunday at 00:00 family timezone; idempotent per family+week; sums eligible (approved or auto-eligible) completions.
- Manual adjustments by parents; child "spend" record (no approval in MVP).
- UI: bank card on child dashboard; parent adjustments screen; ledger list.

Deliverables
- Usable: balances reflect approved chores each week; parents can adjust; children can record spends.

Completion Criteria
- Idempotent payout (re-running job does not double-pay).
- Ledger invariants: sum(entries) = balance; entries append-only.
- Tests cover payout math, idempotency, and manual/spend operations using mocked repos and fake timers.

Validation Tests (examples)
- Job: run payout twice for same week => one payout entry only.
- API: GET `/bank/:childId` => returns available/reserved totals and recent entries.
- API: POST `/bank/:childId/adjust` credit/debit => updates ledger.
- API: POST `/bank/:childId/spend` => creates spend entry; balance reduced.

---

## Phase 4 – Saver Items and Goals
Branch: `phase-4-saver-goals`

Scope
- Saver items per child: name, description, image URL/upload stub, target coins.
- Goals: mark saver items as goals; per-goal allocation percentages (total ≤ 100%).
- Auto-allocation: on credits (payout/bonus/manual credit), reserve per goal allocations; update available vs reserved.
- Affordability indicators.
- UI: saver grid, make-goal toggle, allocation sliders, affordability badges.

Deliverables
- Usable: kids add items, set goals, and see reserved vs available balances update on new credits.

Completion Criteria
- Allocation math correct; never over-reserves; reserved released when goal is purchased or un-goaled.
- Tests for allocation engine and edge cases.

Validation Tests (examples)
- Unit: allocate 30%/20% across two goals; verify reserved/available results.
- API: POST `/saver` creates item; PATCH `/saver/:id/goal` sets allocation; credit event triggers reserve entries.
- Web: affordability label updates when balance changes.

---

## Phase 5 – Bonus Opportunities and Claims
Branch: `phase-5-bonuses`

Scope
- Bonus definitions: name, description, value, claim type (one-time/unlimited), visibility (all vs child-specific).
- Claims: child submits claim; parent approves/rejects; approved awards coins immediately via ledger entry.
- UI: child bonus list and claim flow; parent approvals include bonus filter.

Deliverables
- Usable: kids can see and claim bonuses; parents approve and coins credit immediately.

Completion Criteria
- One-time bonus enforceable per child (idempotent claims).
- Tests for claim lifecycle and ledger interaction.

Validation Tests (examples)
- API: POST `/bonuses` creates; child GET `/bonuses` filtered by visibility.
- API: POST `/bonuses/:id/claim` => pending; parent approve => ledger credit; duplicate one-time claim rejected.

---

## Phase 6 – UX Polish, Customization, and Accessibility
Branch: `phase-6-ux-customization`

Scope
- Avatars: curated set + upload (validation), select per user.
- Kid theming: per-child accent color and optional background from curated set; persists to profile.
- In-app indicators: badges for pending approvals; gentle celebrations on completion.
- Accessibility pass: contrast, focus states, reduced motion support.

Deliverables
- Usable: kids can personalize their dashboard; visuals consistent and accessible.

Completion Criteria
- Theme settings persist and apply across sessions; no cross-user bleed.
- A11y checks: keyboard focus visible, color contrast passes, animations respect reduced-motion.

Validation Tests (examples)
- Web: theme context applies accent color; avatar selection persists (mock API).
- Lighthouse/axe checks for key pages (informational, not gating if minor issues).

---

## Cross-Cutting Concerns
- Migrations: versioned SQL or Prisma schema per phase; backward-compatible where possible.
- Feature flags: gate incomplete features during a phase to keep main releasable.
- Observability (added incrementally): structured logs, error boundaries on web, health/readiness endpoints.
- Security: input validation, authz on every route, minimal PII, safe file handling for images (later S3).
- Documentation: `README` updates per phase; API reference (OpenAPI) evolves.

## Scripts (planned)
- API: `dev`, `build`, `start`, `test`, `test:watch`, `lint`, `typecheck`, `coverage`.
- Web: `dev`, `build`, `preview`, `test`, `lint`, `typecheck`.
- Root: `lint`, `test`, `format`, `ci` (runs all with proper workspaces).

## Exit Criteria to MVP (end of Phase 6)
- Parent can set up family, manage chores/bonuses, approve items.
- Child can complete chores, claim bonuses, track balance, set goals and personalization.
- Weekly payout correct and idempotent; ledger immutable and auditable.
- CI green with required coverage; Docker images build and run locally.
