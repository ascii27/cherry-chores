# Cherry Chores – UI Implementation Plan (Phase 5+)

Purpose: Raise the look and feel to a polished, kid‑friendly, modern education‑app UI while preserving clarity and accessibility. This plan defines visual language, components, and implementation steps.

Design References (Inspiration)
- EduWave – Education Website UI Design (visual tone, spacing, soft cards):
  - https://dribbble.com/shots/24950695-EduWave-Education-Website-UI-Design
- Apple Human Interface Guidelines (clarity, depth, deference)
- Material Design (elevation, motion)

Fonts & Typography
- Font: Inter or Poppins (Google Fonts). Inter default, Poppins optional for headers.
- Base: 16px; responsive scaling for headings.
- Weights: 400 (body), 600 (emphasis), 700 (title).
- Line heights: 1.5 body; 1.2 titles. Generous letter spacing for chips/badges.

Color System (CSS Variables)
- Surface/Background: `--bg: #f6f8fb`, `--surface: #ffffff`.
- Text: `--text: #0f172a`, `--text-muted: #64748b`.
- Primary (indigo/blue): `--primary: #4f46e5`, gradient to `#0ea5e9`.
- Success (mint/teal): `--success: #10b981`.
- Warning (amber): `--warning: #f59e0b`.
- Danger (rose): `--danger: #ef4444`.
- Accents (child theme): `--accent: <child.themeColor>` (inline style root override).

Elevation, Radii, Spacing
- Radii: `--radius-sm: 8px`, `--radius-md: 12px`, `--radius-lg: 16px`.
- Shadows:
  - s1: 0 1px 2px rgba(15,23,42,0.06)
  - s2: 0 4px 8px rgba(15,23,42,0.08)
  - s3: 0 8px 16px rgba(15,23,42,0.10)
- Spacing scale: 4, 8, 12, 16, 24, 32.

Global Styles & Tokens
- Create `web/src/styles/tokens.css` with CSS variables; import in `web/index.html`.
- Light background on body; cards use `--surface` with soft border and s2 shadow.
- Rounded inputs/buttons; pill buttons for primary actions.
- Override Bootstrap radii/shadows minimally via utility classes.

Components (Atomic → Composite)
1) Atoms
   - Button (primary/outline/ghost), Input (text/select), Badge/Chip (soft backgrounds), Icon (emoji or line-icon).
2) Molecules
   - Card (header/body/footer; optional gradient header band), ProgressBar (rounded), Toast, Avatar (image or emoji SVG), Stat (icon + number + label), TopBar.
3) Organisms
   - GoalItem (name, reserved/target, progress, Buy CTA), ChoreItem (name, description, status chip, action), BankSummary (Total/Available/Allocated with chips and allocation control), ProfileEditor (name, avatar picker, theme chips).

Layouts
- TopBar: persistent; left: app/child name + avatar; right: logout (and later: settings/notifications).
- Child Dashboard
  - Hero: greeting, avatar, quick stats (Today count, Coins total) via StatCards.
  - Row 1: Today (L), This Week (R) as cards with rounded list items and status chips.
  - Row 2: Bank (L) and Saver Goals (R). Bank shows big numbers; goals show progress bars; Achieved section below as a simple timeline.
  - Profile Editor: card with avatar grid and theme chips.
- Parent Dashboard
  - Header stats per child (optional next iteration): Total • Allocated • Today.
  - Children table: avatar + Total/Available/Allocated; Goals list shows reserved/target (read‑only) with small progress bar.
  - Approvals list: chips for states; compact Approve/Reject.

States & Feedback
- Toaster notifications (success/error) for save/purchase/spend.
- Celebration micro‑animation (🎉 overlay) for completion/purchase, respecting reduced motion.
- Empty states: friendly illustration/emoji + short guidance.

Accessibility
- Keyboard focus outlines visible; all actionable elements have aria‑labels/roles.
- Color contrast: ensure AAA for text on surfaces; chips use colored text on soft backgrounds.
- Respect `prefers-reduced-motion`: disable celebration animation and heavy transitions.

Motion (Subtle)
- Hover: small translateY(‑1px) and shadow lift on cards/buttons.
- Progress changes animate width over 200ms (disabled if reduced motion).

Iconography & Avatars
- Short‑term: emoji‑based SVG avatars (generated on the fly); curated set.
- Mid‑term: integrate a lightweight icon pack (Lucide/Feather) for chores/goals/bank.

Buttons & Inputs
- Primary button: pill, gradient background (indigo → sky), white text, bold.
- Secondary/Outline: soft border, text colored with `--primary`/`--accent`.
- Inputs: large hit targets, rounded, subtle inner shadow.

Progress & Badges
- ProgressBar: 8px height, fully rounded ends; soft background.
- Chips: soft bg with colored text (Pending: amber; Done: green; Allocated: indigo).

Theming
- Child theme color applied by setting `--accent` on a wrapper element; components reference it for borders/highlights.
- Potential dark mode later via toggling `data-theme` and alternate tokens.

Engineering Plan (Incremental)
1) Tokens & Global Setup
   - Add `tokens.css` with variables; import fonts (Inter or Poppins) in `web/index.html`.
   - Add a small utility CSS for cards, chips, stat text.
2) Core Components
   - Build `StatCard.tsx`, `ProgressBar.tsx`, and refine `TopBar` (done), `Toast`.
3) Child Dashboard Pass
   - Replace numeric displays with StatCards.
   - Restyle Today/Week list items: left icon, center text, right action; chips for status.
   - Bank summary: big numbers, rounded progress/chips; refine allocate control styling.
   - Goals: each as a row with name + ProgressBar + target + Buy; Achieved section styled.
   - Profile editor: keep UX; style with tokens.
4) Parent Dashboard Pass
   - Child rows: avatar + Totals; read‑only Goals with reserved/target progress.
   - Approvals list: chips + pill buttons; better empty state.
5) A11y & Motion
   - Add focus rings and aria labels; honor reduced motion.
6) Polish & QA
   - Cross‑browser visual checks; Lighthouse/axe a11y pass (informational). Iterate on spacing/contrast.

Deliverables & Definition of Done
- Global tokens in place, applied across key pages.
- Child Dashboard updated (TopBar, Today/Week, Bank, Goals, Profile).
- Parent Dashboard updated (Totals, Goals read‑only, clearer layout).
- Accessibility: focus, labels, and contrast meet guidelines; reduced motion respected.
- Visual QA against reference (soft cards, rounded corners, airy spacing, friendly typography).

