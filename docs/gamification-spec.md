# Cherry Chores — Child Dashboard Gamification Spec

**Status:** ✅ P0 Complete · P1 Planned
**Last updated:** 2026-03-21
**Feedback source:** Kids' user testing (March 2026)

---

## Problem Statement

Kids reported the design looks great but the main experience doesn't feel like a game and it's not easy to see what they need to do to reach their goals. The current dashboard was a task manager — chores and goals lived in separate sections with no visible connection between them.

---

## Goals

1. Make completing chores feel rewarding in the moment (game feedback loop)
2. Surface the path from "chore → coins → goal" on a single screen
3. Increase motivation to complete daily chores

---

## User Personas

**Alex, age 9** — Motivated by saving for a specific toy. Needs to know at a glance "how many more chores until I get it?"

**Jordan, age 12** — Competitive and streak-driven. Wants to feel progression and not break a streak.

---

## P0 — ✅ Shipped

### 1. Goal Hero Card ✅

The home screen opens with the child's active goal as the hero element. This is the emotional anchor — the reason they're doing chores.

In v2 (kid-ux-v2) this was updated to a **Shop Hero Card** — showing affordable catalog items the child can buy, rather than savers. See `kid-ux-v2-spec.md`.

**Logic:**
- `activeGoal` = first non-completed `isGoal` saver
- Progress bar = `reserved / target` (clamped to 100%)
- "X coins to go" = `target - reserved`
- "Today you can earn X" = sum of coin values of incomplete chores today
- If no active goal: show a friendly prompt "Add a goal to start saving!"
- If goal is 100% complete: show a celebration state "Goal reached! 🎉 Ask a parent to approve your payout."

### 2. Coin Burst Animation on Chore Completion ✅

When a child marks a chore as Done, coins burst from the button in a fan arc.

**Implementation:**
- `CoinBurst` component in `web/src/components/CoinBurst.tsx`
- 8 coin SVGs, CSS custom properties `--cb-angle`, `--cb-dist`, `--cb-delay`
- 700ms animation, fixed position at bottom 30% center
- Triggered by `coinBurst` state counter increment in `ChildDashboard`
- Respects `prefers-reduced-motion`: animation skipped

### 3. Quest Language ✅

| Before | After |
|---|---|
| Chores | Quests |
| Today | Today's Quests ⚔️ |
| No chores for today | No quests today — enjoy your day! |
| Done | ✓ Done |
| Bank Account | Treasure Chest / Coins |
| Goals | Wish List |
| Bonuses | Bonus Quests ⭐ |

---

## P1 — Next Sprint

### 4. Daily Streak Counter

```
🔥 5-day streak!  Don't break it today.
```

- Streak = consecutive days all today's chores were completed
- Computed server-side from chore history, surfaced on `/me` or a new `/children/:id/streak` endpoint
- Displayed in the goal hero card area or as a badge in the TopBar
- Recovery message when streak is 0: "Start a new streak today! 💪"

### 5. Weekly Badge Board

- Award an emoji badge for a perfect week (all chores completed Mon–Sun)
- Badges stored on the child's profile
- Displayed in the Profile section as a trophy shelf
- First set: 🏆 Perfect Week · ⚡ Early Bird · 💰 Coin Hoarder · 🚀 Goal Getter

### 6. Boss Week / Challenge Mode

- Parent can mark a week as a Challenge Week with a bonus reward attached
- Kid sees a special banner on the home screen
- Ties into existing Bonuses system — no new backend model needed

---

## Out of Scope (this release)

- Leaderboards between siblings (privacy concerns; future consideration)
- Sound effects (accessibility and parental preference concerns)
- Push notifications

---

## Accessibility

- All animations respect `prefers-reduced-motion`
- Coin burst is `aria-hidden`; completion state change is announced via existing button state
- Quest language changes are cosmetic — no aria-label regressions
- Progress bars use `role="progressbar"` with `aria-valuenow/min/max`

---

## Acceptance Criteria

- [x] Goal hero card appears at top of home section
- [x] Goal hero card shows accurate progress
- [x] Completing a chore triggers coin burst animation
- [x] All labels use quest language
- [x] No regressions on existing chore complete/uncomplete flow
- [x] All animations disabled under `prefers-reduced-motion`
- [x] Tests pass
