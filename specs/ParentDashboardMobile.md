# Parent Dashboard – Mobile Guidelines (S ≤ 640px)

This document translates the provided mobile-UX guidance into actionable, stack-aligned specs for the Parent Dashboard. The web app uses React + Bootstrap (via utility classes and simple custom CSS tokens). Tailwind snippets from the source context are preserved conceptually and mapped to Bootstrap-friendly patterns below.

## Mobile UX Goals
- No horizontal scroll on pages or key panes.
- Clear navigation via hamburger + off-canvas drawer.
- Wide tables collapse into stacked cards on small screens.
- “Week” views show one day at a time (pager) on small screens; full 7-day grid on md+.
- Primary actions are easy to reach (sticky bottom bar or FAB).

## Global Layout
- Wrap dashboard pages in a top bar + main stack layout.
- Prevent accidental horizontal scroll:
  - Add `html, body { overflow-x: hidden; }` in global CSS if not already present.
  - Use Bootstrap’s `text-wrap`/`text-break` (or `word-break: break-word; overflow-wrap: anywhere;`) on long strings.
- Spacing: vertical sections separated by ~16px (`.mb-3`/`.mb-4`) and container padding.

## AppShell & Drawer (Bootstrap-oriented)
- Top bar: title + hamburger. On md+, show inline actions; on small screens, show hamburger only.
- Off-canvas drawer: navigation links to Family, Parents, Children, Chores, Approvals, Week.
- Implementation options:
  - Use Bootstrap Offcanvas component; or
  - Use a simple custom aside + overlay (pattern already used in ChildDashboard) with `position: fixed`, translating X with CSS.

Example sketch (React):

```tsx
// Pseudocode – align styles with existing TopBar and sidebar pattern
function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div>
      <div className="cc-topbar border-bottom" style={{ background: 'var(--surface)' }}>
        <div className="container d-flex align-items-center justify-content-between py-2">
          <button className="btn btn-link p-0 d-md-none" aria-label="Open menu" onClick={()=>setOpen(true)}>
            <span aria-hidden>≡</span>
          </button>
          <h1 className="h6 mb-0">Parent Dashboard</h1>
          <div className="d-none d-md-flex align-items-center gap-2">
            {/* desktop actions here */}
          </div>
        </div>
      </div>

      {/* Off-canvas */}
      {open && <div role="button" aria-label="Close" onClick={()=>setOpen(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:1040 }} />}
      <aside aria-label="Main" style={{ position:'fixed', top:0, bottom:0, left:0, width:280, background:'var(--surface)', borderRight:'1px solid var(--border)', transform: open ? 'translateX(0)' : 'translateX(-100%)', transition:'transform 150ms ease', zIndex:1050 }}>
        <div className="p-3">
          <button className="btn btn-sm btn-outline-secondary mb-3" onClick={()=>setOpen(false)} aria-label="Close menu">Close</button>
          {['Family','Parents','Children','Chores','Approvals','Week'].map((item) => (
            <a key={item} href={`#${item.toLowerCase()}`} className="d-block text-decoration-none py-2">{item}</a>
          ))}
        </div>
      </aside>

      <main className="container py-3">
        {children}
      </main>
    </div>
  );
}
```

## Children & Chores: Table → Stacked Cards
- On md+, keep tables for density and scanning.
- On small screens, render stacked cards and hide tables to avoid horizontal scrolling.
- Use Bootstrap visibility utilities:
  - Cards shown on small only: `d-block d-md-none`
  - Table shown md+: `d-none d-md-block`
- Compact actions on mobile: arrange `+ Credit`, `– Debit`, `Rename`, `Delete` into a 2×2 grid or use a small “More” menu.

Example (mobile card):

```tsx
// Inside ParentDashboard children section
<section className="d-block d-md-none">
  {children.map((c: any) => (
    <div key={c.id} className="card mb-2 shadow-sm">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start">
          <div>
            <div className="fw-semibold">{c.displayName}</div>
            <div className="text-muted small">@{c.username}</div>
          </div>
          <span className="small fw-medium">Total: {(balances[c.id]?.available ?? 0)+(balances[c.id]?.reserved ?? 0)}</span>
        </div>
        <div className="row row-cols-2 g-2 small mt-2">
          <div><span className="text-muted">Available</span> <span>{balances[c.id]?.available ?? 0}</span></div>
          <div><span className="text-muted">Allocated</span> <span>{balances[c.id]?.reserved ?? 0}</span></div>
        </div>
        <div className="row row-cols-2 g-2 mt-2">
          <button className="btn btn-outline-success btn-sm">+ Credit</button>
          <button className="btn btn-outline-danger btn-sm">– Debit</button>
          <button className="btn btn-outline-secondary btn-sm">Rename</button>
          <button className="btn btn-outline-secondary btn-sm text-danger">Delete</button>
        </div>
      </div>
    </div>
  ))}
  
</section>

<div className="d-none d-md-block table-responsive">
  {/* existing table here */}
  
</div>
```

## Approvals & Primary Actions: Sticky Bar (Mobile)
- On small screens, anchor primary actions in a bottom sticky bar.
- Style: subtle border-top, blurred/opaque white background, safe tap targets.

Example:

```tsx
function StickyActions() {
  return (
    <div className="d-md-none" style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:1040, background:'rgba(255,255,255,0.95)', backdropFilter:'blur(6px)', borderTop:'1px solid var(--border)' }}>
      <div className="container py-2 d-flex gap-2">
        <button className="btn btn-primary w-100">Run payout</button>
        <button className="btn btn-outline-secondary" style={{ minWidth: 120 }}>Add child</button>
      </div>
    </div>
  );
}
```

## Week Overview: 7 Columns → Day Pager (Mobile)
- Small screens: show a single day with prev/next chevrons; list each child’s progress for that day.
- md+: keep the full 7-column grid.

Example:

```tsx
function WeekOverviewMobile({ data }: { data: { children: any[]; days: string[]; progress: Record<string, string[]> } }) {
  const [dayIndex, setDayIndex] = React.useState(0);
  return (
    <section className="card d-block d-md-none">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-2">
          <button className="btn btn-link p-0" aria-label="Prev" onClick={()=>setDayIndex((d)=> (d+6)%7)}>‹</button>
          <div className="fw-semibold">{data.days[dayIndex]}</div>
          <button className="btn btn-link p-0" aria-label="Next" onClick={()=>setDayIndex((d)=> (d+1)%7)}>›</button>
        </div>
        <ul className="list-unstyled mb-0">
          {data.children.map((c) => (
            <li key={c.id} className="d-flex justify-content-between py-2 border-bottom">
              <span>{c.name}</span>
              <span className="text-muted small">{data.progress[c.id][dayIndex]}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
```

## Week Details: Collapsible per Child (Mobile)
- Each child’s weekly details are an accordion/disclosure.
- Tap row to expand; show day tiles with chore badges.

Example:

```tsx
function WeekDetailsItem({ child }: { child: any }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="card mb-2">
      <button className="btn text-start w-100 px-3 py-2 d-flex justify-content-between align-items-center" onClick={()=>setOpen(o=>!o)} aria-expanded={open}>
        <span className="fw-semibold">{child.name}</span>
        <span className="text-muted small">Coins: {child.coins} / {child.weekTotal}</span>
      </button>
      {open && (
        <div className="px-3 pb-3">
          <div className="row row-cols-2 row-cols-sm-3 g-2">
            {child.days.map((d: any) => (
              <div key={d.day} className="border rounded p-2">
                <div className="text-muted small">{d.day}</div>
                {d.items.map((it: any) => (
                  <div key={it.id} className="mt-1 small">
                    {it.name}
                    <span className="ms-1 badge bg-light text-dark">+{it.value}</span>
                    {it.status === 'Due' ? (
                      <span className="ms-2 text-danger small">Due</span>
                    ) : (
                      <span className="ms-2 text-success small">{it.status}</span>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

## Chores Editor: Responsive Form
- Single column on small screens; two columns on md+ using Bootstrap grid.
- “Assign to” chips should wrap on small screens.

Example:

```tsx
<form className="row g-3">
  <div className="col-12 col-md-6">
    <label className="form-label">Name</label>
    <input className="form-control" />
  </div>
  <div className="col-12 col-md-6">
    <label className="form-label">Recurrence</label>
    <select className="form-select"><option>Daily</option><option>Weekly</option></select>
  </div>
  <div className="col-12">
    <label className="form-label">Assign to</label>
    <div className="d-flex flex-wrap gap-2">
      {/* map children to pill checkboxes */}
      <label className="border rounded-pill px-3 py-1 d-inline-flex align-items-center gap-2">
        <input type="checkbox" className="form-check-input m-0" /> Alex
      </label>
    </div>
  </div>
  <div className="col-12 d-flex justify-content-end gap-2">
    <button className="btn btn-primary">Save chore</button>
  </div>
  
</form>
```

## Accessibility & Tap Targets
- Minimum touch target: 44×44px for primary controls; avoid tiny icon-only buttons without labels on mobile.
- Use `aria-expanded`, `aria-controls` for collapsibles; maintain visible focus rings for keyboard users.
- Provide text labels next to icons for clarity on small screens.

## Performance & Polish
- Lazy-render expanded content in Week Details (render lists only when open).
- Consider `content-visibility: auto` on long lists/sections.
- Typography that scales reasonably on mobile (e.g., avoid very small text; use Bootstrap’s `.small` sparingly).

## Utility Cheatsheet (Bootstrap)
- Visibility: `d-none d-md-block` (desktop only), `d-block d-md-none` (mobile only).
- Tables: wrap with `.table-responsive` to avoid page-level scroll; prefer cards on small.
- Text wrapping: `.text-wrap`, `.text-break`, or custom CSS `overflow-wrap: anywhere`.
- Sticky actions: fixed bottom container with border-top and blurred/opaque background.

## Acceptance Checklist
- App shell with sticky header + off-canvas drawer (hamburger visible on `md` and below).
- No horizontal scrolling; long text wraps.
- Children & Chores render stacked cards on mobile; tables remain on md+.
- Per-row actions condensed for mobile (grid or “More” menu).
- Week Overview uses a day pager on small; full 7-column grid on md+.
- Week Details collapsible per child with chore badges.
- Sticky bottom action bar (mobile) for primary actions (e.g., Run payout, Add child).
- Forms collapse to single column on small; chips wrap.
- A11y attributes and 44px tap targets included.
- Lazy-render expanded content; consider `content-visibility: auto` for long lists.

---
Notes:
- The Tailwind-based snippets in the original guidance map 1:1 to these behaviors. If we introduce Tailwind later, we can lift those directly; for now, Bootstrap utilities achieve the same UX.
