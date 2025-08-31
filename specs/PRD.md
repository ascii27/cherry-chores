# Cherry Chores – Product Requirements Document (PRD)

## 1) Overview
Cherry Chores is a simple, family-centered chore tracking and allowance app. Parents define chores and bonuses, assign them to kids, review completions, and manage weekly payouts in “coins.” Kids see what’s due today and this week, complete tasks, track progress, and plan savings toward goals.

- Objective: Make daily/weekly chores clear and motivating; make allowance predictable and transparent; keep setup/admin simple for busy parents.
- Platforms: Web (mobile-first responsive). Native apps out of scope for MVP.
- Initial stack (for future specs): Node backend, simple web framework frontend, PostgreSQL storage, container-ready for AWS; RDS later.

## 2) Users & Personas
- Children (Primary)
  - Goals: See today’s chores, check them off, track coins, set savings goals, claim bonuses.
  - Constraints: Simple flows, large touch targets, minimal reading, low friction; optionally requires parent approval for certain items.
- Parents (Administrators)
  - Goals: Set up family, create child accounts, configure chores and bonuses, approve completions, manage payouts and balances.
  - Constraints: Fast entry, bulk assignment/recurrence, clear approval queue, auditability for adjustments.

## 3) Value Proposition & Success Metrics
- Value: Reduces friction around chores and allowance, adds motivation via clear goals, provides structure for parents.
- Success Metrics (MVP)
  - D1 retention for families created: >60% of families return the next day.
  - Weekly active families: >50% of created families active in week 1.
  - Average chore completion rate: >70% of assigned daily chores per week.
  - Task approval turnaround: median <24 hours.

## 4) Definitions / Glossary
- Family: Group with ≥1 parent and ≥1 child.
- Chore: Recurring task assigned to one or more children (daily/weekly for MVP) with a coin value and optional parent approval requirement.
- Bonus: Optional extra earning opportunity, claimable by kids, always requires parent approval. May be one-time or unlimited.
- Coins: Virtual currency unit (integers) earned from approved chores/bonuses.
- Bank Account: Per-child balance tracked by a ledger. Updated weekly on Sunday for approved chores; updated immediately upon bonus approval and manual parent adjustments.
- Saver Item: A thing a child wants, with image, description, and target cost.
- Goal: A saver item that a child marks as a goal and optionally earmarks auto-savings toward; reserved funds are separated from available balance.
- Approval: Parent verification step required before awarding coins for marked chores (when configured) and all bonus claims.

## 5) Scope (MVP)
- Family setup: Parent signs in (Google), creates family, adds children (username/password).
- Chore management: Parents can create, update, assign, and delete chores; daily/weekly recurrence; coin value; optional approval requirement.
- Child dashboard: Today’s chores, this week’s chores, mark/unmark done; submit for approval when required.
- Approvals: Parent sees a queue to approve/reject chores requiring approval and bonus claims.
- Bank account: Per-child balance and ledger; weekly payout on Sundays for all eligible completions; manual parent adjustments; children can “spend” coins (balance decreases) with a simple record.
- Saver & Goals: Children create saver items (image URL upload or paste), mark some as goals, see affordability, and (optionally) allocate auto-savings toward goals.
- Bonus: Parents create bonus opportunities (one-time or unlimited, optional child-specific). Children can claim; parent approves/rejects.

### Out of Scope (MVP)
- Real money transfers; gift cards; marketplace integrations.
- Native mobile apps; push notifications; email/SMS (in-app notifications only).
- Complex recurrence (only daily/weekly for MVP; monthly/custom later).
- Media uploads storage at scale (initially image URL or simple lightweight upload; advanced moderation later).
- Advanced analytics or reporting beyond summaries.

## 6) User Stories

### Children
- As a child, I can see my chores due today and for the rest of the week.
- As a child, I can mark a chore as done; if approval is required, it moves to “pending approval.”
- As a child, I can unmark a chore before it’s approved.
- As a child, I can see how many coins I’ve earned so far this week and how many I can still earn.
- As a child, I can view my bank balance with available coins and reserved-for-goals coins.
- As a child, I can create and manage saver items (image, description, target coins) and see which I can afford now.
- As a child, I can mark saver items as goals and set auto-savings allocation percentages per goal.
- As a child, I can see and claim bonus opportunities to request extra coins (requires parent approval).
- As a child, I can spend coins, creating a spend record that reduces my balance.

### Parents
- As a parent, I can sign in with Google and create a family.
- As a parent, I can create child accounts (username/password) and manage their status.
- As a parent, I can create chores with name, description, recurrence (daily/weekly), value, approval requirement, due day/time (optional), and assignment to one or more children.
- As a parent, I can edit and delete chores and reassign them.
- As a parent, I can view an approvals queue to approve/reject completed chores and bonus claims.
- As a parent, I can define bonus opportunities (global or child-specific), including coin value and whether claim is one-time or unlimited.
- As a parent, I can view and adjust a child’s balance via manual credit/debit with reasons (e.g., reward/penalty/transfer).
- As a parent, I can see a weekly summary of completions and payouts.

## 7) Functional Requirements

### 7.1 Authentication & Family Setup
- Parent accounts: Google OAuth sign-in; can belong to multiple families; one family at a time UI context.
- Child accounts: Simple username/password created by parent; only accessible within assigned family.
- Family model: ≥1 parent, ≥1 child; parents can invite additional parents; family name configurable.
- Roles & permissions: Parent (admin), Child (limited). No cross-child visibility for children.

### 7.2 Chore Management
- Create chore: name, description, value (coins), recurrence (daily/weekly), due day (for weekly), optional due time, requires approval (bool), assignment to one or more children, active/inactive state.
- Edit/delete chore: parent-only; history preserved for audit (soft delete recommended later).
- Child experience: “Today” list (based on recurrence and today’s date), “This week” list, mark/unmark done; if approval required, completion goes to parent approvals; if not, it is immediately eligible for payout.
- Edge cases: Late/missed chores do not roll over for MVP; unmarking after approval is blocked; parents can reverse via manual adjustment.

### 7.3 Bonus Management
- Define bonus: name, description, value, claim type (one-time or unlimited), visibility (all children or specific children).
- Claim bonus: child submits claim; enters optional note; always requires parent approval.
- Approve/reject: parent action awards coins (approve) or dismisses (reject) with optional reason.

### 7.4 Bank Account & Ledger
- Per-child ledger with immutable entries: type (payout, bonus, manual credit, manual debit, spend, reserve, release), amount, timestamp, actor, reference (chore/bonus/id), memo.
- Balance view: shows available coins and reserved-for-goals coins.
- Weekly payout: every Sunday at 00:00 local family time, sum eligible completions (approved or auto-eligible) for prior week; create single payout ledger entry. Idempotent to avoid double payouts.
- Manual adjustments: parent can credit/debit with memo; visible in ledger.
- Spend: child records a spend; balance decreases immediately; optional parent confirmation (MVP: no approval required; parent can adjust if needed).

### 7.5 Saver & Goals
- Saver items: per child; fields include name, description, image (URL or lightweight upload), target coins.
- Goals: child can mark any saver item as a goal; set auto-allocation percentage per goal (sum across goals <= 100%).
- Auto-allocation: when coins are added (weekly payout/bonus/credit), allocate reserved amounts to goals per percentages; available balance shows remainder.
- Affordability indicator: visually indicate which items are currently affordable with available balance.

### 7.6 Approvals & Notifications (MVP in-app only)
- Approvals queue for parents: filters for chores vs bonuses; actions approve/reject; bulk approve for chores.
- In-app badges: parent sees count of pending approvals; child sees status (pending/approved/rejected).
- Activity feed: optional simple list of recent events.

### 7.7 Timezone & Scheduling
- Family-level timezone; weekly payout scheduled accordingly.
- Daily chores roll at local midnight; weekly chores due on configured day.

## 8) UX Overview

### Visual Style & Tone
- Family-friendly: fun, simple, and positive tone using light colors, soft shadows, and rounded corners.
- Kid-focused clarity: large tap targets, minimal text with supportive icons, simple progress bars, and celebratory feedback (confetti/sparkles) on completion.
- Dual-audience feel: kid-friendly visuals that still feel clean and professional for parents; admin areas remain uncluttered and efficient.
- Motion with purpose: subtle animations for state changes; prefers-reduced-motion respected.

### Customization & Avatars
- Avatars: all users can select from a curated set of cartoon avatars or upload their own image (with basic size/type validation; moderation policies to be defined later).
- Kid theming: children can personalize their experience with:
  - Accent color selection from a safe palette.
  - Optional background images/patterns (curated set + optional upload).
  - Optional avatar accessories/stickers (stretch goal; MVP supports avatar + accent + background).
- Per-user persistence: customization settings are stored per account and applied on sign-in without affecting other users in the family.

### Framework & Components
- CSS framework: use a modern, simple library (Bootstrap) for consistent layout, grid, and components.
- Theming: expose CSS variables (tokens) for colors, radius, spacing; allow per-user accent overrides while maintaining accessible contrast.
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
- Sizes (min touch targets; height x padding x font-size)
  - Small: 40px, 12–14px x 14–16px, 14px
  - Medium (default): 48px, 14–16px x 16–20px, 16px
  - Large: 56–64px, 16–18px x 20–24px, 18px
- Shape & spacing: radius 12px; icon gap 8px; group gap 8–12px; full-width on mobile where appropriate.
- States: hover (+4% tint), active (pressed shadow reduce), disabled (30% opacity, no shadow), focus-visible (2px outline, Primary 50% alpha, offset 2px).
- Loading: inline spinner left of label; keep width stable.
- Destructive: use Danger background, confirm on irreversible actions.

### Component Specs (Samples)
- Cards
  - Container: radius 16px; padding 16–20px; elevation levels: 0 (flat), 1 (subtle shadow), 2 (modal/sheet).
  - Content: title + optional subtitle; body; optional footer actions. Use status stripe or badge for states (e.g., Pending Approval).
  - Interaction: entire card tappable only if single primary action; otherwise use clear buttons.
- Checkboxes / Toggles
  - Size: 28–32px box; 3px checkmark stroke; label area is part of hit target.
  - State labels: include short helper text where ambiguity possible (e.g., Requires approval).
  - Use toggles for on/off settings; checkboxes for multi-select lists (e.g., assign to multiple children).
- Progress Rings (Chores/Goals)
  - Sizes: 64px default (child dashboard), 96px large (summary), 40px compact.
  - Style: track #E5E7EB; progress uses Primary or Success; thickness 6–8px; rounded caps.
  - Data: center label shows count or %; sublabel for coins earned vs potential.
  - Motion: 400–600ms ease-out on updates; respect reduced-motion.

### Kid-Friendly Best Practices (Research-Informed)
- Colors: playful palette with high contrast between foreground and background; limit simultaneous colors to avoid overload; use color purposefully for status and rewards.
- Typography: large, readable type (min 16–18px body on mobile), generous line spacing, sentence case; avoid dense paragraphs; support dyslexia-friendly readability (simple sans-serif).
- Navigation: shallow hierarchy, clear labels, big buttons (min 44×44px tap targets), persistent primary actions; avoid hamburger-only for kids—surface key sections directly.
- Visual cues: use icons + short labels together; progress bars, checkmarks, stickers; consistent patterns so kids learn once.
- Interactions: immediate feedback on tap (ripple/scale), success celebrations (confetti/sparkles) with restraint; micro-animations under 250ms; respect reduced-motion.
- Gamification: streaks, badges, progress rings, celebratory states; emphasize personal progress over competition between siblings; optional gentle reminders vs. punitive language.
- Copy & tone: simple, positive, action-oriented (“Tap to finish”, “Great job!”); support pre-readers with icons and minimal words; avoid sarcasm or ambiguous phrasing.
- Content chunking: break tasks into small steps; keep decision sets small (3–5 options); use cards and sections to group.
- Forms: few fields, large inputs, clear error states with inline hints; numeric keypad for numbers; sensible defaults.
- Imagery & characters: friendly mascots/avatars to guide; diverse, inclusive illustrations; avoid frightening imagery or loud auto-play audio.
- Safety & privacy: no public profiles; parent gate for sensitive actions (uploads, spending, deletion); minimal PII; image upload size/type validation.
- Accessibility: color not sole indicator; sufficient contrast; keyboard and screen-reader semantics; alt text on critical imagery.
- Mobile ergonomics: primary actions in thumb zone; avoid edge swipes that conflict with OS; prevent accidental taps with spacing and confirmation on destructive actions.
- Performance: keep pages lightweight; defer non-critical assets; skeleton loaders to reassure.

### 8.1 Information Architecture
- Parent Dashboard: pending approvals, quick stats (this week’s completions, upcoming payouts), quick actions (add chore/bonus, adjust balance).
- Child Dashboard: Today’s chores, This week, progress and “coins so far / potential,” quick access to Bonuses and Saver/Goals, balance card (available vs reserved).
- Approvals: list/table with filters; bulk approve chores.
- Chore Builder: simple form with recurrence/assignment; preview “who sees what when.”
- Bank: per-child balance, ledger list, manual adjustment (parent), spend action (child).
- Saver/Goals: card grid of items; “Make goal”; set allocation sliders; affordability labels.
- Settings: family profile, children management, parents management, timezone.

### 8.2 Key Flows (Happy Paths)
- Child completes chore requiring approval: Dashboard > mark done > status shows “Pending approval.” Parent: Approvals > Approve > Child sees “Approved.”
- Weekly payout: Sunday cron calculates prior week totals > creates payout ledger entry > child balance updates > bank view reflects available/reserved change.
- Parent creates weekly chore: Dashboard > Add chore > set Weekly, due day Sun, assignment: Child A > save; appears on child’s weekly list.
- Child sets a goal: Saver > New item > mark as “Goal” > set 30% allocation > future earnings reserve 30% to that goal.

### 8.3 Accessibility & Mobile
- Mobile-first layouts; large tap targets, clear contrast, readable fonts.
- Minimal text; supportive icons; consistent color semantics for status.
 - Tap targets ≥44×44px; ergonomic placement within thumb reach on phones.
 - Respect system settings (reduced motion, prefers dark); keep animations subtle and skippable.
 - Input optimization (numeric keypad, autocomplete, native pickers) and clear, inline errors.

## 9) Non-Functional Requirements
- Security/Privacy: Parent-controlled child accounts; minimal PII (names, emails for parents). No external sharing. COPPA-conscious design; data used only to provide service.
- Reliability: Weekly payout job must be idempotent and auditable; ledger entries immutable.
- Performance: Dashboard loads <1s on typical mobile; operations <200ms server-side for common actions.
- Observability: Basic application logs and error tracking (tech spec will detail).
- Internationalization: English only MVP; single currency concept “coins.”

## 10) Milestones
- M1: Auth & family setup; chore CRUD; child dashboard (today/week); mark done; approvals queue; weekly payout (basic); bank ledger; manual adjustments.
- M2: Saver items and goals; balance reservations with auto-allocation; affordability indicators.
- M3: Bonus opportunities and claims; approvals integration; basic activity feed.
- M4: Polishing: bulk approvals, summaries, in-app notifications, settings (timezone), basic analytics/export.

## 11) Acceptance Criteria (MVP)
- Parent can create family, add ≥1 child, sign in again without data loss.
- Parent can create a daily and a weekly chore and assign to a child.
- Child sees the correct list for today/this week; can mark/unmark prior to approval.
- Parent can approve a completed chore; it appears as eligible for weekly payout.
- Weekly payout runs on Sunday and creates ledger entries with the correct totals per child.
- Bank shows correct available vs reserved balances; manual adjustments reflect immediately.
- Parent can create a bonus; child can claim; parent can approve and coins are credited.
- Child can create saver items, mark as goals, set allocations; balances reserve correctly on new credits.

## 12) Open Questions
- Should spending require parent approval by default, or be configurable per family/child?
- Evidence for chores/bonuses (photo, note) required/optional? Storage and moderation implications.
- Handling missed chores: allow late completion within a grace window? For MVP, no rollovers.
- Can parents mark chores as “skipped” without penalty? Should there be partial credit?
- Editing coin values mid-week: applies retroactively or from edit date forward?
- Multiple timezones across parents? For MVP, single family timezone.
- Cap on weekly earnings or budget targets?
- Image handling for saver items: URL only vs upload; file size limits.

## 13) Risks & Mitigations
- Recurrence complexity: Keep MVP to daily/weekly; design model for extension.
- Payout correctness: Use idempotent jobs keyed by family+week; store run state; immutable ledger.
- OAuth/child auth flows: Clear separation of parent vs child login; ensure least privilege.
- Data integrity: Use transactions for approval→credit paths; append-only ledger.

---
This PRD defines MVP scope and guardrails for the functional and technical specs to follow.
