# Cherry Chores – Product Requirements Document (PRD)

_Last updated: 2026-03-17 | Revision 2_

## 1) Overview
Cherry Chores is a simple, family-centered chore tracking and allowance app. Parents define chores and bonuses, assign them to kids, review completions, and manage weekly payouts in "coins." Kids see what's due today and this week, complete tasks, track progress, and plan savings toward goals.

- **Objective:** Make daily/weekly chores clear and motivating; make allowance predictable and transparent; keep setup/admin simple for busy parents.
- **Platforms:** Web (mobile-first responsive). Native apps out of scope for MVP.
- **Voice:** Amazon Alexa skill for hands-free chore and balance queries.
- **Initial stack:** Node backend (Express + TypeScript), React + Vite frontend, PostgreSQL storage, container-ready for AWS.

## 2) Users & Personas

### Child (Primary User)
- **Age:** 5–14 years old
- **Goals:** See today's chores, check them off, track coins, set savings goals, claim bonuses.
- **Constraints:** Simple flows, large touch targets, minimal reading, low friction; optionally requires parent approval for certain items.
- **Tech comfort:** Variable; design for low-literacy/pre-reader with icon-first UI.

### Parent (Administrator)
- **Age:** 25–45 years old
- **Goals:** Set up family, create child accounts, configure chores and bonuses, approve completions, manage payouts and balances.
- **Constraints:** Fast entry, bulk assignment/recurrence, clear approval queue, auditability for adjustments; often managing on mobile between tasks.

## 3) Value Proposition & Success Metrics

### Value
Reduces friction around chores and allowance, adds motivation via clear goals, provides structure for parents—all without requiring any financial plumbing.

### Success Metrics (MVP)
- D1 retention for families created: >60% of families return the next day.
- Weekly active families: >50% of created families active in week 1.
- Average chore completion rate: >70% of assigned daily chores per week.
- Task approval turnaround: median <24 hours.

## 4) Definitions / Glossary
- **Family:** Group with ≥1 parent and ≥1 child.
- **Chore:** Recurring task assigned to one or more children (daily/weekly for MVP) with a coin value and optional parent approval requirement.
- **Bonus:** Optional extra earning opportunity, claimable by kids, always requires parent approval. May be one-time or unlimited.
- **Coins:** Virtual currency unit (integers) earned from approved chores/bonuses.
- **Bank Account:** Per-child balance tracked by a ledger. Updated weekly on Sunday for approved chores; updated immediately upon bonus approval and manual parent adjustments.
- **Saver Item:** A thing a child wants, with image, description, and target cost.
- **Goal:** A saver item that a child marks as a goal and optionally earmarks auto-savings toward; reserved funds are separated from available balance.
- **Approval:** Parent verification step required before awarding coins for marked chores (when configured) and all bonus claims.
- **Activity Feed:** Chronological log of family events (completions, approvals, payouts, adjustments) visible to parents.
- **API Token:** Long-lived bearer token tied to a parent account, used to authenticate external integrations (e.g., Alexa skill) without requiring repeated OAuth.

## 5) Scope (MVP)
- **Family setup:** Parent signs in (Google), creates family, adds children (username/password).
- **Chore management:** Parents can create, update, assign, and delete chores; daily/weekly recurrence; coin value; optional approval requirement.
- **Child dashboard:** Today's chores, this week's chores, mark/unmark done; submit for approval when required.
- **Approvals:** Parent sees a queue to approve/reject chores requiring approval and bonus claims; bulk-approve chores.
- **Bank account:** Per-child balance and ledger; weekly payout on Sundays for all eligible completions; manual parent adjustments; children can "spend" coins (balance decreases) with a simple record.
- **Saver & Goals:** Children create saver items (image URL or upload), mark some as goals, see affordability, and optionally allocate auto-savings toward goals.
- **Bonus:** Parents create bonus opportunities (one-time or unlimited, optional child-specific). Children can claim; parent approves/rejects.
- **Voice (Alexa):** Parents and children can query chores and balances and mark completions via Alexa.
- **Integrations:** Parents can generate long-lived API tokens to connect external services.
- **Settings:** Family name, timezone (for payout scheduling), and child account management.
- **Activity Feed:** Parent-visible log of recent family events.

### Out of Scope (MVP)
- Real money transfers; gift cards; marketplace integrations.
- Native mobile apps; push notifications; email/SMS (in-app only).
- Complex recurrence (only daily/weekly for MVP; monthly/custom later).
- Advanced analytics or reporting beyond summaries.
- Dark mode (future).
- Multi-timezone per parent (single family timezone for MVP).

## 6) Resolved Design Decisions

The following questions have been resolved for MVP:

| Question | Decision |
|---|---|
| Should spending require parent approval? | **No** — children can spend freely; parents can use manual adjustments to reverse if needed. Reduces friction for kids while keeping parents in control. |
| Evidence for chores (photo/note)? | **Optional note only** — children may add a short text note when marking a chore done. Photo evidence is post-MVP. |
| Late/missed chore grace window? | **No grace window** — missed chores do not roll over. Parent can grant coins manually via adjustment. |
| Skip chores without penalty? | **Not supported as a first-class action** — parent uses manual adjustment if partial/skip credit is warranted. |
| Editing coin values mid-week? | **Forward-only** — edits apply to future completions only; already-credited amounts are not retroactively changed. |
| Cap on weekly earnings? | **No cap in MVP** — budget targets are out of scope; parents manage expectations through chore configuration. |

## 7) Functional Requirements

### 7.1 Authentication & Family Setup
- Parent accounts: Google OAuth sign-in; can belong to multiple families; one family at a time UI context.
- Child accounts: Simple username/password created by parent; only accessible within assigned family.
- Family model: ≥1 parent, ≥1 child; parents can invite additional parents; family name configurable.
- Roles & permissions: Parent (admin), Child (limited). No cross-child visibility for children.

### 7.2 Chore Management
- **Create chore:** name, description, value (coins), recurrence (daily/weekly), due day (for weekly), optional due time, requires approval (bool), assignment to one or more children, active/inactive state.
- **Edit/delete chore:** parent-only; history preserved for audit (soft delete).
- **Child experience:** "Today" list (based on recurrence and today's date), "This week" list, mark/unmark done; optional note on completion; if approval required, completion goes to parent approvals; if not, immediately eligible for payout.
- **Edge cases:** Late/missed chores do not roll over; unmarking after approval is blocked; parents can reverse via manual adjustment.

### 7.3 Bonus Management
- **Define bonus:** name, description, value (coins), claim type (one-time or unlimited), visibility (all children or specific children named), active/inactive state.
- **Claim bonus:** child submits claim with an optional note; always requires parent approval; child sees pending status after claim.
- **Approve/reject:** parent action awards coins immediately via ledger entry (approve) or dismisses (reject) with optional reason shown to child.
- **One-time enforcement:** a one-time bonus can only be claimed once per child; subsequent claim attempts are rejected with a clear error.
- **Parent view:** bonus list shows claim count and pending claims; filterable in approvals queue.

### 7.4 Bank Account & Ledger
- **Per-child ledger** with immutable entries: type (payout, bonus, adjustment, spend, reserve, release), amount, timestamp, actor, reference id, memo.
- **Balance view:** shows available coins and reserved-for-goals coins separately.
- **Weekly payout:** every Sunday at 00:00 family timezone, sum eligible completions (approved or auto-eligible) for prior week; create single payout ledger entry per child. Idempotent—re-running does not double-pay.
- **Manual adjustments:** parent can credit/debit with memo; visible in ledger.
- **Spend:** child records a spend; balance decreases immediately; no approval required; optional note.

### 7.5 Saver & Goals
- **Saver items:** per child; fields include name, description, image (URL or S3 upload), target coins.
- **Goals:** child marks any saver item as a goal; sets auto-allocation percentage per goal (sum across goals ≤ 100%).
- **Auto-allocation:** when coins are added (weekly payout/bonus/credit), allocate reserved amounts to goals per percentages; available balance shows remainder.
- **Affordability indicator:** visually indicate which items are currently affordable with available balance.
- **Purchase flow:** child (or parent on their behalf) purchases a saver item; reserved coins released then full target spent; item marked completed.

### 7.6 Approvals & In-App Notifications
- **Approvals queue** for parents: filters for chores vs bonuses; actions approve/reject; bulk-approve chores.
- **In-app badges:** parent sees count of pending approvals in navigation; child sees status on each chore/bonus (pending/approved/rejected).
- **Activity feed:** parent-visible chronological log of family events: completions, approvals/rejections, payouts, manual adjustments. Shows actor, event type, amount, and timestamp. No per-event detail drilldown required for MVP.

### 7.7 Voice Integration (Alexa)
- **Skill invocation:** "Alexa, open Cherry Chores"
- **Supported intents:**
  - `GetChoresIntent` — list today's chores for a named child or the signed-in parent's default child.
  - `GetRemainingChoresIntent` — how many chores are still incomplete today.
  - `CompleteChoreIntent` — mark a named chore done for a named child (no-approval chores only; approval-required chores respond with "this chore needs parent review").
  - `GetBalanceIntent` — get available coin balance for a named child.
- **Authentication:** Alexa skill uses a parent's long-lived API token (configured in app settings) via `X-Api-Key` header.
- **Error handling:** graceful responses when child name is ambiguous, chore not found, or token is invalid.
- **Future intents (post-MVP):** ClaimBonusIntent, GetGoalsIntent, ApproveChoreIntent.

### 7.8 API Tokens & Integrations
- **Token management:** parents can create, label, and revoke long-lived bearer tokens from the settings screen.
- **Token scopes (MVP):** tokens have full parent-level access; granular scoping is post-MVP.
- **Token expiry:** optional; tokens may be set to never expire or given an explicit expiry date.
- **Security:** tokens are hashed on storage; raw token shown only at creation time.
- **Use case:** primary use is the Alexa skill; secondary use is any custom automation a tech-savvy parent wishes to build.

### 7.9 Settings
- **Family settings:** family name, timezone (IANA timezone string; used for payout scheduling and daily chore rollover).
- **Children management:** rename child, reset password, deactivate/delete child account.
- **Parents management:** view co-parents; remove self from family.
- **API tokens:** create, label, view (masked), revoke tokens.

### 7.10 Timezone & Scheduling
- Family-level timezone stored on family record.
- Daily chores roll at local midnight; weekly chores due on configured day.
- Weekly payout scheduled for Sunday 00:00 in family timezone.

## 8) UX Overview

### Visual Style & Tone
- Family-friendly: fun, simple, and positive tone using light colors, soft shadows, and rounded corners.
- Kid-focused clarity: large tap targets, minimal text with supportive icons, simple progress bars, and celebratory feedback (confetti/sparkles) on completion.
- Dual-audience feel: kid-friendly visuals that still feel clean and professional for parents; admin areas remain uncluttered and efficient.
- Motion with purpose: subtle animations for state changes; prefers-reduced-motion respected.

### Customization & Avatars
- Avatars: all users can select from a curated set of cartoon avatars or upload their own image.
- Kid theming: children can personalize with accent color (from safe palette) and optional background image/pattern (curated set + optional upload).
- Per-user persistence: customization settings stored per account, applied on sign-in.

### Framework & Components
- CSS framework: Bootstrap for consistent layout, grid, and components.
- Theming: CSS variables (tokens) for colors, radius, spacing; per-user accent overrides.
- Icons/illustrations: friendly, consistent icon set; lightweight illustrative elements to guide kids.
- Responsiveness: mobile-first layouts with adaptive components for tablet/desktop.

### Design Tokens: Color Palette
- Base colors (light theme)
  - Background: #FAFAFB (app), #FFFFFF (surfaces)
  - Text: #111827 (primary), #6B7280 (muted), #9CA3AF (subtle)
  - Border/Dividers: #E5E7EB
- Brand & status
  - Primary: #5B8DEF (buttons/links, focus ring)
  - Success: #22C55E, Warning: #F59E0B, Danger: #EF4444, Info: #06B6D4
- Kid accent choices (safe palette; selectable per child)
  - Blue #60A5FA, Green #34D399, Purple #A78BFA, Pink #F472B6, Orange #F97316, Teal #14B8A6
- Contrast rules
  - Text on solid colors uses white (#FFFFFF) unless contrast < 4.5:1, then use near-black (#111827).
  - Never use color as the only status indicator; pair with icon/label.

### Buttons (Sizes, States)
- Small: 40px height; Medium (default): 48px; Large: 56–64px.
- Shape: radius 12px; icon gap 8px; full-width on mobile where appropriate.
- States: hover (+4% tint), active (pressed shadow reduce), disabled (30% opacity), focus-visible (2px outline).
- Destructive: use Danger background, confirm on irreversible actions.

### Component Specs
- **Cards:** radius 16px; padding 16–20px; elevation s2; title + optional subtitle + body + footer actions.
- **Checkboxes/Toggles:** 28–32px box; use toggles for on/off settings; checkboxes for multi-select.
- **Progress Rings:** 64px default; track #E5E7EB; progress uses Primary or accent; 400–600ms ease-out.

### Kid-Friendly Best Practices
- Large, readable type (min 16–18px body on mobile), generous line spacing, sentence case.
- Shallow navigation hierarchy, big buttons (min 44×44px), persistent primary actions.
- Icons + short labels together; progress bars, checkmarks; consistent patterns.
- Immediate feedback on tap; success celebrations (confetti) with restraint; micro-animations <250ms.
- Gamification: streaks, progress rings; emphasize personal progress over competition between siblings.
- Simple, positive copy: "Tap to finish", "Great job!"; avoid sarcasm or ambiguous phrasing.
- Safety & privacy: no public profiles; parent gate for sensitive actions; minimal PII.

### 8.1 Information Architecture
- **Parent Dashboard:** pending approvals badge, quick stats (this week's completions, upcoming payouts), quick actions (add chore/bonus, adjust balance), week overview, activity feed.
- **Child Dashboard:** Today's chores, This week, progress ("coins so far / potential"), Bonuses, Saver/Goals, balance card (available vs reserved).
- **Approvals:** list/table with chore/bonus filter; bulk-approve chores.
- **Chore Builder:** simple form with recurrence/assignment.
- **Bank:** per-child balance, ledger list, manual adjustment (parent), spend action (child).
- **Saver/Goals:** card grid of items; "Make goal"; set allocation sliders; affordability labels.
- **Settings:** family profile, timezone, children management, parents management, API tokens.

### 8.2 Key Flows (Happy Paths)
- **Child completes approval-required chore:** Dashboard > mark done (optional note) > status shows "Pending approval." Parent: Approvals > Approve > Child sees "Approved."
- **Weekly payout:** Sunday cron calculates prior week totals > creates payout ledger entry per child > child balance updates > bank view reflects change.
- **Parent creates weekly chore:** Dashboard > Add chore > set Weekly, due day Sun, assignment: Child A > save; appears on child's weekly list.
- **Child sets a goal:** Saver > New item > mark as "Goal" > set 30% allocation > future earnings reserve 30% to that goal.
- **Child claims a bonus:** Child Dashboard > Bonuses > Claim > optional note > shows Pending. Parent: Approvals > Bonus tab > Approve > coins credited immediately.
- **Parent configures Alexa:** Settings > API Tokens > Create token > copies token into Alexa skill configuration.
- **Alexa query:** "Alexa, ask Cherry Chores what chores Alex has today" > Alexa responds with list of incomplete chores.

### 8.3 Accessibility & Mobile
- Mobile-first layouts; large tap targets (≥44×44px), clear contrast, readable fonts.
- Minimal text; supportive icons; consistent color semantics for status.
- Respect system settings (reduced motion, prefers dark); keep animations subtle and skippable.
- Input optimization (numeric keypad, autocomplete, native pickers) and clear, inline errors.

## 9) Non-Functional Requirements
- **Security/Privacy:** Parent-controlled child accounts; minimal PII (names, emails for parents). No external sharing. COPPA-conscious design; data used only to provide service. API tokens hashed at rest.
- **Reliability:** Weekly payout job must be idempotent and auditable; ledger entries immutable. Alexa skill must degrade gracefully when API is unavailable.
- **Performance:** Dashboard loads <1s on typical mobile; operations <200ms server-side for common actions.
- **Observability:** Basic application logs and error tracking; structured logs per request.
- **Internationalization:** English only MVP; single currency concept "coins."

## 10) Milestones
- **M1 (Done):** Auth & family setup; chore CRUD; child dashboard (today/week); mark done; approvals queue; weekly payout; bank ledger; manual adjustments.
- **M2 (Done):** Saver items and goals; balance reservations with auto-allocation; affordability indicators; UX polish, avatars, theming, mobile-responsive parent dashboard.
- **M3 (Done):** Alexa voice skill; long-lived API tokens for external integrations; S3 image uploads.
- **M4 (Current):** Bonus opportunities and claims; activity feed; in-app notification badges; family settings (timezone, API token management); bulk approvals.

## 11) Acceptance Criteria (MVP Complete)
- Parent can create family, add ≥1 child, sign in again without data loss.
- Parent can create a daily and a weekly chore and assign to a child.
- Child sees the correct list for today/this week; can mark/unmark prior to approval; can add optional note.
- Parent can approve a completed chore; it appears as eligible for weekly payout.
- Weekly payout runs on Sunday and creates ledger entries with correct totals per child; idempotent.
- Bank shows correct available vs reserved balances; manual adjustments reflect immediately.
- Parent can create a bonus; child can claim with optional note; parent can approve and coins are credited immediately.
- One-time bonus cannot be claimed twice by the same child.
- Child can create saver items, mark as goals, set allocations; balances reserve correctly on new credits.
- Parent can generate and revoke API tokens; token visible once at creation.
- Alexa skill can list chores, get balance, and mark non-approval chores done using a valid API token.
- Activity feed shows parent a log of recent family events.
- Family timezone setting affects payout scheduling.
- Bulk-approve chores in a single parent action.

## 12) Risks & Mitigations
- **Recurrence complexity:** Keep MVP to daily/weekly; design model for extension.
- **Payout correctness:** Use idempotent jobs keyed by family+week; store run state; immutable ledger.
- **OAuth/child auth flows:** Clear separation of parent vs child login; ensure least privilege.
- **Data integrity:** Use transactions for approval→credit paths; append-only ledger.
- **Voice NLU accuracy:** Alexa slot filling for child names and chore names may be ambiguous; implement confirmation prompts for destructive actions (mark complete).
- **Token security:** Display raw token only once; hash on storage; provide easy revocation.

---
_This PRD reflects the product as of M3 completion and defines requirements for M4 (current sprint). Revision history maintained in git._
