# Cherry Chores – Implementation Plan

_Last updated: 2026-03-17 | Revision 2_

## Purpose
Phased delivery of a usable product at the end of every iteration. Each phase develops on a feature branch and merges to `main` only when completion criteria (including tests) are met.

- **Backend:** Node.js (Express + TypeScript) + PostgreSQL
- **Frontend:** React + Vite + TypeScript + Bootstrap
- **Voice:** AWS Lambda (ESM) Alexa skill
- **Testing:** Jest + Supertest (API), Vitest + Testing Library (UI)
- **Packaging:** Docker, AWS-container-ready; single-container prod build

## Branching & CI
- Branch naming: `phase-N-description` (e.g., `phase-7-bonuses-activity`)
- Merge policy: PR with passing checks (lint, typecheck, unit tests, min coverage) and completion checklist.
- CI: GitHub Actions runs `lint`, `typecheck`, `test` on push/PR. No live DB required.

## Test Strategy
- Unit-first with dependency injection: repositories abstracted behind interfaces; InMemoryRepos for tests.
- Jest + Supertest for API routes; Vitest + Testing Library for UI components.
- Fake timers for scheduler tests; invoke job functions directly.
- Coverage gates (backend): statements 80%, branches 70%. Critical paths >90%.

---

## Phases 0–5: COMPLETE ✓

All foundational and core phases have shipped:

| Phase | Description | Status |
|---|---|---|
| 0 | Project bootstrap, CI, Docker, monorepo | ✓ Done |
| 1 | Auth (Google OAuth + child login), family CRUD | ✓ Done |
| 2 | Chore management, child dashboard, approvals queue | ✓ Done |
| 3 | Bank, ledger, weekly payout job (idempotent) | ✓ Done |
| 4 | Saver items, goals, auto-allocation, affordability | ✓ Done |
| 5 | UX polish, avatars, theming, mobile parent dashboard | ✓ Done |

**Also shipped (outside original phase plan):**
- Long-lived API tokens (`api/src/routes/tokens.ts`, `repos.tokens.pg.ts`)
- Alexa skill (`alexa/src/index.js`, `alexa/models/en-US.json`)
- S3 presigned image uploads (`api/src/routes/uploads.ts`, `repos.uploads.pg.ts`)

---

## Phase 7 – Bonus Opportunities and Claims
Branch: `phase-7-bonuses`

### Scope

**Backend**
1. `BonusRepository` interface in `repositories.ts`:
   ```typescript
   interface BonusRepository {
     createBonus(bonus: Bonus): Promise<Bonus>;
     updateBonus(bonus: Bonus): Promise<Bonus>;
     deleteBonus(id: string): Promise<void>;
     getBonusById(id: string): Promise<Bonus | undefined>;
     listBonusesByFamily(familyId: string): Promise<Bonus[]>;
     createClaim(claim: BonusClaim): Promise<BonusClaim>;
     getClaimById(id: string): Promise<BonusClaim | undefined>;
     listClaimsByBonus(bonusId: string): Promise<BonusClaim[]>;
     listPendingClaimsByFamily(familyId: string): Promise<BonusClaim[]>;
     hasChildClaimed(bonusId: string, childId: string): Promise<boolean>;
   }
   ```

2. `bonus.types.ts`:
   ```typescript
   type Bonus = {
     id: string; familyId: string;
     name: string; description?: string; value: number;
     claimType: 'one-time' | 'unlimited';
     childIds?: string[]; // undefined = all children
     active: boolean; createdAt: string;
   };
   type BonusClaim = {
     id: string; bonusId: string; childId: string;
     note?: string; status: 'pending' | 'approved' | 'rejected';
     rejectionReason?: string;
     createdAt: string; resolvedAt?: string; resolvedBy?: string;
   };
   ```

3. `api/src/routes/bonuses.ts` endpoints:
   - `GET /families/:familyId/bonuses` — list bonuses (parent); or list visible bonuses (child)
   - `POST /families/:familyId/bonuses` — create bonus (parent only)
   - `PATCH /bonuses/:id` — update bonus (parent only)
   - `DELETE /bonuses/:id` — delete bonus (parent only)
   - `POST /bonuses/:id/claim` — child submits claim (with optional note)
   - `GET /families/:familyId/bonuses/claims/pending` — pending claims (parent)
   - `POST /bonuses/claims/:claimId/approve` — parent approves → creates ledger entry (type: `bonus`) → triggers goal allocation
   - `POST /bonuses/claims/:claimId/reject` — parent rejects with optional reason

4. `InMemoryBonusRepo` in `repositories.ts`
5. `PgBonusRepo` in `repos.bonus.pg.ts`
6. Wire bonus routes into `app.ts`

**Frontend**

Child Dashboard:
- Add "Bonuses" section to `ChildDashboard.tsx`
- List available (active, visible to this child) bonuses with name, description, coin value chip
- "Claim" button → modal with optional note field → POST claim → show pending state
- Show previously claimed bonuses with status chip (Pending / Approved / Rejected + reason)

Parent Dashboard:
- Add bonus creation/management: form (name, description, value, claim type, visibility) in chores/bonuses tab
- Bonus list with edit/delete and claim counts
- Approvals queue: add "Bonuses" filter tab alongside existing chores tab
- Approve/reject claims with optional rejection reason

### Completion Criteria
- One-time bonus cannot be claimed twice by the same child (enforced at API level).
- Approving a claim immediately creates a ledger entry and triggers goal auto-allocation.
- All endpoints covered by unit/route tests with mocked repos.
- Child UI shows correct bonus list and claim status.
- Parent UI shows pending bonus claims in approvals queue.

### Validation Tests
- `POST /bonuses/:id/claim` twice for one-time bonus → second returns 409.
- `POST /bonuses/claims/:id/approve` → ledger entry created, balance updated.
- `GET /families/:id/bonuses/claims/pending` → returns pending claims only.
- Child can only see bonuses assigned to them or global bonuses.
- Parent-only routes return 403 for child token.

---

## Phase 8 – Activity Feed & In-App Notifications
Branch: `phase-8-activity-feed`

### Scope

**Backend**
1. `ActivityEntry` type in `activity.types.ts`:
   ```typescript
   type ActivityEntry = {
     id: string; familyId: string;
     eventType: 'chore_completed' | 'chore_approved' | 'chore_rejected' |
                'bonus_claimed' | 'bonus_approved' | 'bonus_rejected' |
                'payout' | 'adjustment' | 'spend' | 'purchase';
     childId: string; actorId?: string; actorRole?: 'parent' | 'child' | 'system';
     refId?: string; amount?: number; note?: string;
     createdAt: string;
   };
   ```

2. `ActivityRepository` interface + `InMemoryActivityRepo` + `PgActivityRepo`

3. Emit activity entries from existing route handlers (chores, bank, savers) and new bonus route.

4. `GET /families/:familyId/activity?limit=50&before=<cursor>` — paginated feed (parent only).

**Frontend**

Parent Dashboard:
- Activity feed section (below approvals or as a separate tab): last 20 events.
- Each entry shows: icon by event type, child name, description, amount (if applicable), relative timestamp.
- Empty state: friendly message when no activity yet.

In-App Badges:
- Pending approval count badge on parent nav/top bar (already polled via existing approvals endpoint; add bonus claim count).
- Child chore status chips already implemented; verify rejection reason is surfaced.

### Completion Criteria
- Activity entries created for: chore completions, approvals/rejections, payouts, adjustments, bonus claims/approvals/rejections, purchases.
- Parent can see paginated activity feed.
- Pending count badge on parent nav reflects both chore and bonus approvals.

### Validation Tests
- Completing a chore creates an activity entry.
- Approving a bonus claim creates an activity entry.
- `GET /families/:id/activity` returns entries sorted by createdAt desc, paginated.
- Parent-only route returns 403 for child token.

---

## Phase 9 – Settings & Family Configuration
Branch: `phase-9-settings`

### Scope

**Backend**
- `PATCH /families/:id` — update family name and/or timezone (parent only; already partially supported via `updateFamily`).
- Validate timezone against IANA list on server.
- Ensure payout job and daily rollover respect stored family timezone.

**Frontend**

Settings Page (`/settings`):
- **Family section:** edit family name, select timezone (searchable dropdown of IANA zones).
- **Children section:** list children; rename, reset password, deactivate/reactivate, delete.
- **Parents section:** list co-parents; "Leave family" action (with confirmation).
- **API Tokens section:** list tokens (label, created date, last used, masked); create new token (modal shows raw token once); revoke with confirmation.

Navigation:
- Add Settings link to parent top bar / navigation drawer.
- Child dashboard does not have a settings page; profile editor (avatar, theme) remains inline on child dashboard.

### Completion Criteria
- Family timezone change is persisted and used by payout job.
- Parent can create, view (masked), and revoke API tokens from Settings UI.
- Child rename and password reset work from Settings.
- Settings page is accessible on mobile without horizontal scroll.

### Validation Tests
- `PATCH /families/:id` with invalid timezone returns 400.
- Token created in Settings UI can authenticate Alexa-style API call.
- Child renamed in Settings shows new name in child dashboard immediately.

---

## Phase 10 – Bulk Approvals & UX Refinements
Branch: `phase-10-approvals-ux`

### Scope

**Backend**
- `POST /approvals/bulk-approve` — accept array of completion/claim IDs; approve all in a single request; atomic where possible.

**Frontend**
- Bulk-approve chores: select-all checkbox + "Approve Selected" button in approvals queue.
- Pending approvals count prominently displayed; auto-refresh or optimistic update after bulk approve.
- Empty state for approvals queue: friendly message, direct link to add a chore.

**Polish**
- Consistent loading skeletons across Parent and Child dashboards.
- Ensure all modals (chore edit, adjustment, bonus create) close properly and reset state.
- Verify celebration animation fires on chore completion and bonus approval.
- Cross-browser visual pass (Chrome, Safari, Firefox on mobile).

### Completion Criteria
- Bulk-approve endpoint handles partial failures gracefully (returns list of successes/failures).
- Selecting all chores and bulk-approving them processes correctly; page updates without full reload.
- No regressions in existing approval flows.

---

## Cross-Cutting Concerns
- **Migrations:** versioned SQL per phase; backward-compatible additions only.
- **Observability:** structured logs on all route handlers; error boundaries in React.
- **Security:** input validation on all new routes; authz check on every endpoint; minimal PII.
- **Documentation:** `README` updated each phase; OpenAPI spec evolves.

## Exit Criteria for MVP Complete (end of Phase 10)
- Parent can set up family, manage chores/bonuses, approve items, adjust balances.
- Child can complete chores, claim bonuses, track balance, set goals and personalization.
- Weekly payout correct and idempotent; ledger immutable and auditable.
- Activity feed gives parents visibility into family events.
- Settings page allows family configuration (name, timezone, API tokens, children).
- Alexa skill working end-to-end with API token authentication.
- CI green with required coverage; Docker images build and run correctly.
- No horizontal scroll on mobile; accessible tap targets throughout.
