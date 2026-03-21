# Cherry Chores — Kid UX v2 Spec

**Status:** ✅ Core complete · 🔄 Polish ongoing
**Branch:** `feat/kid-ux-v2`
**Last updated:** 2026-03-21
**Feedback source:** Kids' user testing (March 2026) — "easy enough for a 10-year-old"

---

## Problem Statement

The v1 child dashboard had too many concepts for kids:
- Hamburger sidebar navigation was unfamiliar on iPad/touch
- "Wish List allocation" was confusing — kids didn't understand assigning coins to goals
- Bonus quests were hidden in a separate section
- No way for kids to spend their coins on real things

---

## Design Principles

1. **One tap to anything** — nothing more than one tap from the home screen
2. **Touch-first, 44px+ tap targets** — designed for iPad and phone, not mouse
3. **Spending feels real** — kids can see things they can actually buy with their coins
4. **Parents stay in control** — all catalog items are parent-curated; purchases need delivery confirmation

---

## Architecture Overview

```
Child                         Parent
─────────────────────────     ─────────────────────────────────
Bottom Tab Nav (4 tabs)       Parent Dashboard → Shop Catalog section
  ⚔️  Quests (home)             - Add items via URL (AI description)
  🛍️  Shop                      - Or add manually
  💰  Coins (Treasure Chest)    - Toggle active/inactive
  🎮  Me (Profile)              - See pending deliveries in Approvals → Shop tab
                                - Mark items as delivered
```

---

## Feature 1: Bottom Tab Navigation ✅

Replaces the hamburger sidebar with a fixed bottom bar — the iOS/iPad native pattern kids already know.

**Tabs:**

| Tab | Icon | Section |
|-----|------|---------|
| Quests | ⚔️ | Home (chores + weekly view + bonus quests) |
| Shop | 🛍️ | Catalog browser |
| Coins | 💰 | Treasure Chest (balance, ledger, savers) |
| Me | 🎮 | Profile, display name, theme color |

**CSS class:** `.kid-bottom-tab-bar` / `.kid-tab` / `.kid-tab.active`

**Specs:**
- Fixed at bottom, 64px height
- Safe area inset respected (`padding-bottom: env(safe-area-inset-bottom)`)
- Tab icon: 24px emoji; label: 11px text below
- Active tab: accent color + subtle scale animation

---

## Feature 2: Shop Catalog ✅

Kids browse parent-curated items and spend coins directly. No approval gate — coins deduct instantly; parent marks as delivered when the real item arrives.

### Child Flow

1. Open **Shop** tab
2. See grid of active catalog items — name, image, coin price
3. Tap an item → see description
4. Tap **Buy for X 🪙** → instant coin deduction
5. Item appears in purchase history with "Waiting for delivery 📦" status
6. When parent marks delivered → status updates to "Delivered ✅"

### Parent Flow

1. Go to **Shop Catalog** section in Parent Dashboard
2. Paste a product URL → AI generates kid-friendly name + description
3. Review/edit → set coin price → **Save to Catalog**
4. Or add manually without a URL
5. Toggle items active/inactive (inactive = hidden from kids)
6. Go to **Approvals → Shop tab** to see pending deliveries
7. Click **Mark Delivered** when the real item arrives

### UX Details

- **Affordable items highlighted** on Shop home: items the child can buy right now are shown first
- **Shop Hero Card** on Quests home tab: shows cheapest affordable item as a teaser ("You can afford this! 🛍️")
- If no catalog items exist: friendly empty state ("Ask a parent to add items to the shop!")

---

## Feature 3: Shop Hero Card on Home ✅

Replaces the v1 goal hero card concept. Surfaces the shop on the home tab without requiring a tab switch.

**Logic:**
- If child can afford ≥1 item: show the cheapest affordable item with "You can afford this! 🛍️" CTA
- If child cannot afford anything: show cheapest item overall with "X more coins to go" progress toward it
- If catalog is empty: show coin balance summary instead

**Component:** Inline JSX in `ChildDashboard` home section, reads `catalog` state

---

## Feature 4: Inline Bonus Quests on Home ✅

Bonus quests are now shown at the bottom of the home (Quests) tab, rather than in a separate navigation section. Reduces cognitive overhead — everything for "today" is in one place.

---

## Feature 5: Simplified Treasure Chest ✅

Allocation UI removed entirely from the child view. The **Coins** tab shows:
- Current balance (available coins)
- Savers list (progress toward savings goals)
- Ledger / transaction history

Kids no longer need to manually "allocate" coins to goals — that was confusing and felt like homework.

---

## Backend: Catalog API ✅

### Data Model

**`catalog_items`**

| Column | Type | Notes |
|--------|------|-------|
| id | text PK | `cat_{timestamp}_{random}` |
| family_id | text | FK to families |
| name | text | Item name |
| description | text | Kid-friendly description (AI-generated) |
| image_url | text | OG image or manual URL |
| price_coins | int | Coin cost |
| active | bool | Visible to children |
| source_url | text | Original product URL |
| created_at | timestamptz | |

**`catalog_purchases`**

| Column | Type | Notes |
|--------|------|-------|
| id | text PK | `cpurchase_{timestamp}_{random}` |
| item_id | text | FK to catalog_items |
| child_id | text | FK to users |
| item_name | text | Snapshot at purchase time |
| price_coins | int | Snapshot at purchase time |
| status | text | `pending_delivery` \| `delivered` |
| created_at | timestamptz | |
| resolved_at | timestamptz | Set on delivery |
| resolved_by | text | Parent user ID |

### API Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/families/:id/catalog` | parent or child | List items (child sees active only) |
| POST | `/api/families/:id/catalog` | parent | Create item |
| POST | `/api/families/:id/catalog/preview` | parent | Scrape URL + AI description |
| PATCH | `/api/catalog/:id` | parent | Update item |
| DELETE | `/api/catalog/:id` | parent | Delete item |
| POST | `/api/catalog/:id/buy` | child | Instant purchase (coin deduction) |
| GET | `/api/families/:id/catalog/purchases` | parent | List all purchases |
| PATCH | `/api/catalog/purchases/:id` | parent | Mark as delivered |

### URL Preview & AI Description

The `/preview` endpoint:
1. Server-side fetches the URL (avoids CORS, uses bot User-Agent)
2. Extracts `og:title`, `og:image`, `og:description` and `twitter:*` equivalents
3. Passes title + description to the configured LLM provider
4. Returns `{ title, description, imageUrl, sourceUrl }`

See `docs/llm-provider.md` for LLM configuration.

---

## CSS / Design Tokens

| Token / Class | Usage |
|---|---|
| `.kid-bottom-tab-bar` | Fixed bottom nav container |
| `.kid-tab` | Individual tab button |
| `.kid-tab.active` | Selected tab state |
| `.shop-grid` | CSS grid for catalog items |
| `.shop-item-card` | Individual item card |
| `.shop-item-img` | Item image (square, object-fit cover) |
| `.shop-hero` | Hero card on home tab |
| `.quest-item` | Chore row in quest list |
| `.quest-done-btn` | "Done" / "Undo" button on quest |
| `.goal-hero` | Goal/shop hero card container |
| `.coin-burst-particle` | Coin burst animation element |

All styles are scoped under `.arcade-app`.

---

## Known Limitations / Future Work

- **Amazon scraping**: Amazon returns robot-check pages; OG tags are often absent. Workaround: manually edit the fetched name/description in the preview form before saving.
- **Purchase history on child view**: currently not shown; planned for Coins tab
- **Saver → Catalog link**: kids can't yet "save for" a specific catalog item; savers and catalog are separate concepts
- **Streak counter**: P1 (see `gamification-spec.md`)
- **Sibling leaderboard**: Out of scope

---

## Acceptance Criteria

- [x] Bottom tab nav replaces hamburger sidebar on child dashboard
- [x] All 4 tabs (Quests, Shop, Coins, Me) navigate correctly
- [x] Shop tab shows catalog items; empty state when no items
- [x] Child can buy an item; coins deduct instantly
- [x] Insufficient coins → friendly error, no deduction
- [x] Shop hero card shows on home tab
- [x] Bonus quests appear inline on home tab
- [x] Treasure Chest shows balance + savers without allocation UI
- [x] Parent can add items via URL (auto-fetch on paste/Enter)
- [x] Parent can add items manually
- [x] Parent can toggle items active/inactive
- [x] Parent can delete items
- [x] Pending deliveries appear in Approvals → Shop tab
- [x] Parent can mark as delivered
- [x] Tab bar respects iOS safe area insets
- [x] All tap targets ≥ 44px
