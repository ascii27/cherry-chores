import React, { useEffect, useMemo, useState } from 'react';
// Bootstrap Icons (SVGs as URLs for avatars/patterns)
// Vite resolves '?url' imports to asset URLs at build time
// Emojis/Playful icons
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import emojiSmile from 'bootstrap-icons/icons/emoji-smile.svg?url';
// @ts-ignore
import emojiSunglasses from 'bootstrap-icons/icons/emoji-sunglasses.svg?url';
// @ts-ignore
import heartFill from 'bootstrap-icons/icons/heart-fill.svg?url';
// @ts-ignore
import starFill from 'bootstrap-icons/icons/star-fill.svg?url';
// @ts-ignore
import balloonFill from 'bootstrap-icons/icons/balloon-fill.svg?url';
// @ts-ignore
import rocketTakeoff from 'bootstrap-icons/icons/rocket-takeoff.svg?url';
// @ts-ignore
import flower1 from 'bootstrap-icons/icons/flower1.svg?url';
import { useToast } from '../components/Toast';
import { useNavigate } from 'react-router-dom';
import TopBar from '../components/TopBar';
import Celebration from '../components/Celebration';
import StatCard from '../components/StatCard';
import ProgressBar from '../components/ProgressBar';
import Coin from '../components/Coin';

export default function ChildDashboard() {
  const nav = useNavigate();
  const [child, setChild] = useState<{ id: string; familyId: string; displayName?: string | null; avatarUrl?: string | null; themeColor?: string | null } | null>(null);
  const [celebrate, setCelebrate] = useState(0);
  const [today, setToday] = useState<any[]>([]);
  const [weekData, setWeekData] = useState<{ days: any[]; totalPlanned: number; totalApproved: number; today: number } | null>(null);
  const [balance, setBalance] = useState<{ available: number; reserved: number } | null>(null);
  const [ledger, setLedger] = useState<any[]>([]);
  const { push } = useToast();
  const [savers, setSavers] = useState<any[]>([]);
  const [editing, setEditing] = useState<{ id: string; field: 'name' | 'target' } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [section, setSection] = useState<'home' | 'bank' | 'goals' | 'profile'>('home');
  const [cuteBg, setCuteBg] = useState(false);

  function hexToRgb(hex?: string | null): [number, number, number] | null {
    if (!hex) return null;
    const m = hex.trim().match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
    if (!m) return null;
    return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
  }

  const presetColors = useMemo(() => ['#7C5CFC', '#0EA5E9', '#22C55E', '#F59E0B', '#EF4444', '#FF6584'], []);
  const avatarSvgs = useMemo(() => [
    emojiSmile,
    emojiSunglasses,
    heartFill,
    starFill,
    balloonFill,
    rocketTakeoff,
    flower1
  ], []);
  const patternSvgs = useMemo(() => [
    starFill,
    balloonFill,
    rocketTakeoff,
    flower1,
    heartFill
  ], []);

  function setPatternTile(src: string | null | undefined, sizePx?: number, gapPx?: number) {
    if (!src) return;
    const size = sizePx ?? parseInt((document.getElementById('prof-pattern-size') as HTMLInputElement)?.value || '120', 10);
    const gap = gapPx ?? parseInt((document.getElementById('prof-pattern-gap') as HTMLInputElement)?.value || '0', 10);
    const tileW = size + gap;
    const x = Math.max(0, Math.floor(gap / 2));
    const y = Math.max(0, Math.floor(gap / 2));
    const svg = `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<svg xmlns='http://www.w3.org/2000/svg' width='${tileW}' height='${tileW}' viewBox='0 0 ${tileW} ${tileW}'>` +
      `<image href='${src}' x='${x}' y='${y}' width='${size}' height='${size}' preserveAspectRatio='xMidYMid meet'/>` +
      `</svg>`;
    const dataUrl = `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
    document.documentElement.style.setProperty('--pattern-tile', dataUrl);
    document.body.classList.add('cute-bg-on');
  }
  function emojiSvgDataUrl(e: string) {
    const svg = encodeURIComponent(`<?xml version="1.0" encoding="UTF-8"?><svg xmlns='http://www.w3.org/2000/svg' width='128' height='128'><rect width='100%' height='100%' rx='24' ry='24' fill='white'/><text x='50%' y='55%' dominant-baseline='middle' text-anchor='middle' font-size='72'>${e}</text></svg>`);
    return `data:image/svg+xml;utf8,${svg}`;
  }
  function hslToHex(h: number, s: number, l: number) {
    s /= 100; l /= 100;
    const k = (n: number) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    const toHex = (x: number) => Math.round(255 * x).toString(16).padStart(2, '0');
    return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
  }
  function updateMixerColor() {
    const h = parseInt((document.getElementById('mixer-h') as HTMLInputElement)?.value || '0', 10);
    const s = parseInt((document.getElementById('mixer-s') as HTMLInputElement)?.value || '80', 10);
    const l = parseInt((document.getElementById('mixer-l') as HTMLInputElement)?.value || '60', 10);
    const hex = hslToHex(h, s, l);
    const input = document.getElementById('prof-color') as HTMLInputElement;
    if (input) input.value = hex;
    const root = document.documentElement;
    root.style.setProperty('--accent', hex);
    const rgb = hexToRgb(hex);
    if (rgb) root.style.setProperty('--accent-rgb', `${rgb[0]},${rgb[1]},${rgb[2]}`);
  }


  useEffect(() => {
    const token = localStorage.getItem('childToken');
    if (!token) {
      nav('/');
      return;
    }
    (async () => {
      try {
        const me = await fetch('/me', { headers: { Authorization: `Bearer ${token}` } });
        if (!me.ok) { nav('/'); return; }
        const data = await me.json();
        if (!data?.id || data?.role === 'parent') { nav('/'); return; }
        setChild({ id: data.id, familyId: data.familyId, displayName: data.displayName || null, avatarUrl: data.avatarUrl || null, themeColor: data.themeColor || null });
        // Set theme variables on root for child-adjustable pastel background
        try {
          const root = document.documentElement;
          if (data.themeColor) root.style.setProperty('--accent', data.themeColor);
          const rgb = hexToRgb(data.themeColor);
          if (rgb) root.style.setProperty('--accent-rgb', `${rgb[0]},${rgb[1]},${rgb[2]}`);
        } catch {}
        // Restore cute background preference
        try {
          const pref = localStorage.getItem(`child_cute_${data.id}`);
          const on = pref === '1';
          setCuteBg(on);
          if (on) document.body.classList.add('cute-bg-on'); else document.body.classList.remove('cute-bg-on');
        } catch {}
        // profile editing moved off dashboard
        const r1 = await fetch(`/children/${data.id}/chores?scope=today`);
        const r2 = await fetch(`/children/${data.id}/chores/week`);
        setToday(r1.ok ? await r1.json() : []);
        setWeekData(r2.ok ? await r2.json() : null);
        const rs = await fetch(`/children/${data.id}/savers`, { headers: { Authorization: `Bearer ${token}` } });
        setSavers(rs.ok ? await rs.json() : []);
        const rb = await fetch(`/bank/${data.id}`);
        if (rb.ok) {
          const b = await rb.json();
          setBalance(b.balance);
          setLedger(b.entries || []);
        }
        // Restore background pattern if present
        try {
          const patt = localStorage.getItem(`child_pattern_${data.id}`);
          if (patt) {
            // Restore size/gap before composing tile
            const pSize = localStorage.getItem(`child_pattern_size_${data.id}`);
            const pGap = localStorage.getItem(`child_pattern_gap_${data.id}`);
            const sNum = pSize ? parseInt(pSize, 10) : 120;
            const gNum = pGap ? parseInt(pGap, 10) : 0;
            setPatternTile(patt, sNum, gNum);
            setCuteBg(true);
          }
          const pSizeVar = localStorage.getItem(`child_pattern_size_${data.id}`);
          const pGapVar = localStorage.getItem(`child_pattern_gap_${data.id}`);
          const pOp = localStorage.getItem(`child_pattern_opacity_${data.id}`);
          if (pSizeVar) document.documentElement.style.setProperty('--pattern-size', pSizeVar);
          if (pGapVar) document.documentElement.style.setProperty('--pattern-gap', pGapVar);
          if (pOp) document.documentElement.style.setProperty('--pattern-opacity', pOp);
        } catch {}
      } catch {
        nav('/');
      }
    })();
    return () => {
      // Cleanup theme override when leaving child dashboard
      try {
        const root = document.documentElement;
        root.style.removeProperty('--accent');
        root.style.removeProperty('--accent-rgb');
      } catch {}
      try { document.body.classList.remove('cute-bg-on'); } catch {}
    };
  }, [nav]);

  return (
    <React.Fragment>
      <TopBar
        name={child?.displayName || 'Welcome'}
        avatar={child?.avatarUrl || null}
        accent={child?.themeColor || null}
        onMenuToggle={() => setMenuOpen(true)}
        onLogout={() => { localStorage.removeItem('childToken'); nav('/'); }}
      />
      <Celebration trigger={celebrate} />
      {/* Sidebar overlay and panel */}
      {menuOpen ? (
        <div
          role="button"
          aria-label="Close menu"
          onClick={() => setMenuOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 1030 }}
        />
      ) : null}
      <aside
        aria-label="Navigation"
        style={{ position: 'fixed', top: 0, bottom: 0, left: 0, width: 260, background: 'var(--surface)', borderRight: '1px solid var(--border)', transform: menuOpen ? 'translateX(0)' : 'translateX(-100%)', transition: 'transform 150ms ease', zIndex: 1040, padding: '16px' }}
      >
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="fw-semibold">Menu</div>
          <button className="btn btn-sm btn-outline-secondary" onClick={() => setMenuOpen(false)} aria-label="Close menu">Close</button>
        </div>
        <nav className="nav flex-column">
          <button className={`btn text-start mb-2 ${section === 'home' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => { setSection('home'); setMenuOpen(false); }}>Home</button>
          <button className={`btn text-start mb-2 ${section === 'bank' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => { setSection('bank'); setMenuOpen(false); }}>Bank Account</button>
          <button className={`btn text-start mb-2 ${section === 'goals' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => { setSection('goals'); setMenuOpen(false); }}>Goals</button>
          <button className={`btn text-start ${section === 'profile' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => { setSection('profile'); setMenuOpen(false); }}>Profile</button>
        </nav>
      </aside>
      <div className="container py-4">
        {section === 'home' && (
          <React.Fragment>
            <div className="row g-3 mb-2">
              <div className="col-6 col-lg-3"><StatCard icon="📋" label="Today" value={today.length} /></div>
              <div className="col-6 col-lg-3"><StatCard icon="💰" label="Total Coins" value={(balance?.available ?? 0) + (balance?.reserved ?? 0)} /></div>
              <div className="col-6 col-lg-3"><StatCard icon="✅" label="Approved" value={weekData ? weekData.totalApproved : 0} /></div>
              <div className="col-6 col-lg-3"><StatCard icon="⭐" label="Planned" value={weekData ? weekData.totalPlanned : 0} /></div>
            </div>
            {/* Today (left), This Week (right) */}
            <div className="row g-3">
        <div className="col-12">
          <div className="card card--interactive h-100">
            <div className="card-body">
              <h2 className="h6">Today</h2>
              {today.length === 0 ? (
                <div className="text-muted">No chores for today.</div>
              ) : (
                <ul className="list-group list-group-flush">
                  {today.map((t) => (
                    <li key={t.id} className="list-group-item d-flex justify-content-between align-items-center">
                      <div>
                        <div className="fw-semibold d-flex align-items-center gap-2">
                          <span>{t.name}</span>
                          <span title={`+${t.value} coins`} className="align-middle"><Coin value={t.value || 0} /></span>
                        </div>
                        <div className="small text-muted">{t.description || ''}</div>
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        {t.status === 'pending' && <span className="cc-chip cc-chip--pending">Pending</span>}
                        {t.status === 'approved' && <span className="cc-chip cc-chip--done">Done</span>}
                        {t.status && (
                          <button
                            className="btn btn-sm btn-outline-secondary"
                            onClick={async () => {
                              const cid = child?.id;
                              if (!cid) return;
                              const res = await fetch(`/chores/${t.id}/uncomplete`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ childId: cid })
                              });
                              if (!res.ok) return;
                              const [r1, r2] = await Promise.all([
                                fetch(`/children/${cid}/chores?scope=today`),
                                fetch(`/children/${cid}/chores/week`)
                              ]);
                              setToday(r1.ok ? await r1.json() : []);
                              setWeekData(r2.ok ? await r2.json() : null);
                            }}
                          >
                            Not done
                          </button>
                        )}
                        {(!t.status || t.status === null) && (
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={async () => {
                              const cid = child?.id;
                              if (!cid) return;
                              const res = await fetch(`/chores/${t.id}/complete`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ childId: cid })
                              });
                              if (!res.ok) return;
                              const [r1, r2] = await Promise.all([
                                fetch(`/children/${cid}/chores?scope=today`),
                                fetch(`/children/${cid}/chores/week`)
                              ]);
                              setToday(r1.ok ? await r1.json() : []);
                              setWeekData(r2.ok ? await r2.json() : null);
                              setCelebrate((n) => n + 1);
                            }}
                          >
                            Done
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
        <div className="col-12">
          <div className="card card--interactive h-100">
            <div className="card-body">
              <h2 className="h6">This Week</h2>
              {!weekData ? (
                <div className="text-muted">No chores this week.</div>
              ) : (
                <React.Fragment>
                  {(() => {
                    const plannedCount = weekData.days.reduce((s, d) => s + d.items.length, 0);
                    const completedCount = weekData.days.reduce((s, d) => s + d.items.filter((it: any) => it.status === 'approved' || it.status === 'pending').length, 0);
                    const completedCoins = weekData.days.reduce((s, d) => s + d.items.filter((it: any) => it.status === 'approved' || it.status === 'pending').reduce((ss: number, it: any) => ss + (it.value || 0), 0), 0);
                    const pct = plannedCount ? Math.round((completedCount / plannedCount) * 100) : 0;
                    return (
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <div className="small text-muted">Completed: {completedCount} / {plannedCount} • Coins: {completedCoins} / {weekData.totalPlanned}</div>
                        <div className="flex-grow-1 ms-3">
                          <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={plannedCount} aria-valuenow={completedCount} style={{height: '10px'}}>
                            <div className="progress-bar" style={{ width: `${pct}%` }}></div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                  <div className="table-responsive">
                    <table className="table table-sm table-bordered align-middle mb-0 calendar-table">
                      <thead>
                        <tr>
                          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d, i) => (
                            <th key={d} className="calendar-header">{d}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          {weekData.days.map((day, i) => (
                            <td key={day.date} className={`calendar-cell ${weekData.today === i ? 'calendar-today' : ''}`}>
                              <div className="d-flex justify-content-between align-items-center small text-muted">
                                <span>{new Date(day.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                <span className="badge bg-light text-dark">{day.items.length}</span>
                              </div>
                              {day.items.length === 0 ? (
                                <span className="text-muted small">-</span>
                              ) : (
                                <ul className="list-unstyled mb-0 small">
                                  {day.items.map((it: any) => (
                                    <li key={it.id} className="d-flex justify-content-between align-items-center">
                                      <span className="d-flex align-items-center gap-2">
                                        <span>{it.name}</span>
                                        <span title={`+${it.value} coins`} className="align-middle"><Coin value={it.value || 0} size={18} /></span>
                                      </span>
                                      {it.status === 'approved' ? <span className="cc-chip cc-chip--done">Done</span> : it.status === 'pending' ? <span className="cc-chip cc-chip--pending">Pending</span> : it.status === 'missed' ? <span className="cc-chip">Missed</span> : null}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </React.Fragment>
              )}
            </div>
          </div>
        </div>
      </div>
          </React.Fragment>
        )}

      {/* Section: Bank Account */}
      {section === 'bank' && (
      <div className="row g-3 mt-1">
        <div className="col-12">
          <div className="card card--interactive h-100">
            <div className="card-body">
              <h2 className="h6">Bank</h2>
              <div className="mb-2 d-flex flex-wrap gap-3 align-items-center">
                <div><span className="text-muted me-1">Total:</span><span className="badge bg-light text-dark">{(balance?.available ?? 0) + (balance?.reserved ?? 0)}</span></div>
                <div><span className="text-muted me-1">Available:</span><span className="badge bg-success-subtle text-dark">{balance?.available ?? 0}</span></div>
                <div><span className="text-muted me-1">Allocated:</span><span className="badge bg-warning-subtle text-dark">{balance?.reserved ?? 0}</span></div>
              </div>
              {savers.filter((s) => (s.reserved || 0) > 0).length > 0 ? (
                <div className="mb-3">
                  <div className="small text-muted mb-1">Allocated to goals</div>
                  <ul className="list-unstyled small mb-0">
                    {savers.filter((s) => (s.reserved || 0) > 0).map((s) => (
                      <li key={`alloc-${s.id}`}>{s.name}: <span className="text-muted">{s.reserved}</span></li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <form className="d-flex gap-2" onSubmit={(e) => e.preventDefault()}>
                <input id="spend-amt" type="number" min={1} className="form-control" placeholder="Spend amount" />
                <button className="btn btn-outline-primary" onClick={async () => {
                    const cid = child?.id;
                    if (!cid) return;
                    const token = localStorage.getItem('childToken');
                    const amt = parseInt((document.getElementById('spend-amt') as HTMLInputElement).value || '0', 10);
                    if (!amt) return;
                    const res = await fetch(`/bank/${cid}/spend`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' },
                      body: JSON.stringify({ amount: amt, note: 'spend' })
                    });
                    if (res.ok) {
                      push('success', `Spent ${amt}`);
                      const rb = await fetch(`/bank/${cid}`);
                      if (rb.ok) {
                        const b = await rb.json();
                        setBalance(b.balance);
                        setLedger(b.entries || []);
                        (document.getElementById('spend-amt') as HTMLInputElement).value = '';
                      }
                    } else {
                      try {
                        const err = await res.json();
                        push('error', err?.error || 'Spend failed');
                      } catch {
                        push('error', 'Spend failed');
                      }
                    }
                  }}>Spend</button>
              </form>
              {/* Manual allocation to goals */}
              {savers.filter((s) => s.isGoal).length > 0 ? (
                <div className="mt-3">
                  <div className="small text-muted mb-1">Allocate to a goal</div>
                  <div className="d-flex gap-2">
                    <select id="alloc-saver" className="form-select">
                      {savers.filter((s) => s.isGoal).map((s) => (
                        <option key={`opt-${s.id}`} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    <input id="alloc-amt" type="number" min={1} className="form-control" placeholder="Coins" />
                    <button className="btn btn-outline-warning" onClick={async () => {
                      const cid = child?.id; if (!cid) return;
                      const tok = localStorage.getItem('childToken');
                      const saverId = (document.getElementById('alloc-saver') as HTMLSelectElement).value;
                      const amt = parseInt((document.getElementById('alloc-amt') as HTMLInputElement).value || '0', 10);
                      if (!saverId || !amt) return;
                      const r = await fetch(`/bank/${cid}/allocate`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: tok ? `Bearer ${tok}` : '' }, body: JSON.stringify({ saverId, amount: amt }) });
                      if (r.ok) {
                        push('success', 'Allocated');
                        (document.getElementById('alloc-amt') as HTMLInputElement).value = '';
                        const [rb, rs] = await Promise.all([
                          fetch(`/bank/${cid}`),
                          fetch(`/children/${cid}/savers`, { headers: { Authorization: tok ? `Bearer ${tok}` : '' } })
                        ]);
                        if (rb.ok) {
                          const b = await rb.json();
                          setBalance(b.balance);
                          setLedger(b.entries || []);
                        }
                        setSavers(rs.ok ? await rs.json() : []);
                      } else {
                        try { const err = await r.json(); push('error', err?.error || 'Allocation failed'); } catch { push('error', 'Allocation failed'); }
                      }
                    }}>Allocate</button>
                  </div>
                </div>
              ) : null}
              <hr />
              <div className="small text-muted mb-1">Recent activity</div>
              {ledger.length === 0 ? (
                <div className="text-muted small">No activity yet.</div>
              ) : (
                <ul className="list-unstyled small mb-0">
                  {ledger.slice(0, 5).map((e) => {
                    const when = e.createdAt ? new Date(e.createdAt).toLocaleString() : '';
                    const whoName = e.actor?.name || e.actor?.email || '';
                    const role = e.actor?.role ? ` (${e.actor.role})` : '';
                    const label = e.type === 'payout' ? 'Payout' : e.type === 'spend' ? 'Spend' : 'Adjust';
                    return (
                      <li key={e.id}>
                        <span className={e.amount >= 0 ? 'text-success' : 'text-danger'}>{e.amount >= 0 ? '+' : ''}{e.amount}</span>
                        {' '}• {label}
                        {(whoName || role) ? <React.Fragment> • <span className="text-muted">{whoName}{role}</span></React.Fragment> : null}
                        {when ? <React.Fragment> • <span className="text-muted">{when}</span></React.Fragment> : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
      )}

      {section === 'goals' && (
        <div className="row g-3 mt-1">
          <div className="col-12">
            <div className="card card--interactive h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h2 className="h6 mb-0">Saver Goals</h2>
                  <button
                    className="btn btn-sm btn-outline-primary"
                    onClick={async () => {
                      const cid = child?.id; if (!cid) return;
                      const token = localStorage.getItem('childToken');
                      const r = await fetch(`/children/${cid}/savers`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' }, body: JSON.stringify({ name: 'New item', target: 1 }) });
                      if (r.ok) { const created = await r.json(); setSavers((prev) => [created, ...prev]); setEditing({ id: created.id, field: 'name' }); push('success', 'Item added'); }
                    }}
                  >Add</button>
                </div>
                <div className="text-muted">{savers.length === 0 ? 'No saver items yet.' : `${savers.filter((x) => !x.completed).length} active, ${savers.filter((x) => x.completed).length} achieved.`}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {section === 'profile' && (
        <div className="row g-3 mt-1">
          <div className="col-12">
            <div className="card card--interactive h-100">
              <div className="card-body">
                <h2 className="h6">Your Profile</h2>
                <div className="row g-3 mt-1">
                  <div className="col-12 col-md-6">
                    <label className="form-label">Display name</label>
                    <input id="prof-name" className="form-control" defaultValue={child?.displayName || ''} />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">Theme color</label>
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      <input id="prof-color" type="color" className="form-control form-control-color" defaultValue={(child?.themeColor as string) || '#7C5CFC'} onChange={(e) => { const color = (e.target as HTMLInputElement).value; const root = document.documentElement; root.style.setProperty('--accent', color); const rgb = hexToRgb(color); if (rgb) root.style.setProperty('--accent-rgb', `${rgb[0]},${rgb[1]},${rgb[2]}`); }} />
                      {presetColors.map((c) => (
                        <button key={c} type="button" className="btn btn-outline-primary btn-sm" style={{ background: c, borderColor: c, color: '#fff' }} onClick={() => { const el = document.getElementById('prof-color') as HTMLInputElement; el.value = c; const root = document.documentElement; root.style.setProperty('--accent', c); const rgb = hexToRgb(c); if (rgb) root.style.setProperty('--accent-rgb', `${rgb[0]},${rgb[1]},${rgb[2]}`); }} aria-label={`Use color ${c}`}> </button>
                      ))}
                      <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => { const el = document.getElementById('color-mixer'); if (el) el.classList.toggle('d-none'); }}>Open color mixer</button>
                    </div>
                  </div>
                  <div id="color-mixer" className="col-12 d-none">
                    <div className="row g-2 align-items-center">
                      <div className="col-12 col-md-4">
                        <label className="form-label">Hue</label>
                        <input id="mixer-h" type="range" min={0} max={360} defaultValue={260} className="form-range" onChange={() => updateMixerColor()} />
                      </div>
                      <div className="col-6 col-md-4">
                        <label className="form-label">Saturation</label>
                        <input id="mixer-s" type="range" min={0} max={100} defaultValue={85} className="form-range" onChange={() => updateMixerColor()} />
                      </div>
                      <div className="col-6 col-md-4">
                        <label className="form-label">Lightness</label>
                        <input id="mixer-l" type="range" min={0} max={100} defaultValue={60} className="form-range" onChange={() => updateMixerColor()} />
                      </div>
                    </div>
                  </div>
                  <div className="col-12">
                    <label className="form-label">Avatar</label>
                    <div className="d-flex align-items-center gap-3 flex-wrap">
                      {avatarSvgs.map((u) => (
                        <button key={u} type="button" className="btn btn-outline-secondary" onClick={() => {
                          (document.getElementById('prof-avatar-url') as HTMLInputElement).value = u;
                        }}>
                          <img src={u} alt="avatar option" style={{ width: 28, height: 28 }} />
                        </button>
                      ))}
                      <input type="file" accept="image/*" className="form-control" style={{ maxWidth: 260 }} onChange={(ev) => {
                        const f = (ev.target as HTMLInputElement).files?.[0];
                        if (!f) return;
                        const r = new FileReader();
                        r.onload = () => { (document.getElementById('prof-avatar-url') as HTMLInputElement).value = String(r.result || ''); };
                        r.readAsDataURL(f);
                      }} />
                      <div className="row g-2 w-100 mt-1">
                        <div className="col-12 col-md-4">
                          <label className="form-label">Pattern size</label>
                          <input id="prof-pattern-size" type="range" min={40} max={320} defaultValue={120} className="form-range" onChange={(e) => {
                            const val = `${(e.target as HTMLInputElement).value}px`;
                            document.documentElement.style.setProperty('--pattern-size', val);
                            if (child?.id) localStorage.setItem(`child_pattern_size_${child.id}`, val);
                            const src = localStorage.getItem(`child_pattern_${child?.id}`);
                            if (src) setPatternTile(src);
                          }} />
                        </div>
                        <div className="col-12 col-md-4">
                          <label className="form-label">Pattern gap</label>
                          <input id="prof-pattern-gap" type="range" min={0} max={200} defaultValue={0} className="form-range" onChange={(e) => {
                            const val = `${(e.target as HTMLInputElement).value}px`;
                            document.documentElement.style.setProperty('--pattern-gap', val);
                            if (child?.id) localStorage.setItem(`child_pattern_gap_${child.id}`, val);
                            const src = localStorage.getItem(`child_pattern_${child?.id}`);
                            if (src) setPatternTile(src);
                          }} />
                        </div>
                        <div className="col-12 col-md-4">
                          <label className="form-label">Pattern transparency</label>
                          <input id="prof-pattern-opacity" type="range" min={0} max={100} defaultValue={15} className="form-range" onChange={(e) => {
                            const frac = Math.max(0, Math.min(1, parseInt((e.target as HTMLInputElement).value, 10) / 100));
                            document.documentElement.style.setProperty('--pattern-opacity', String(frac));
                            if (child?.id) localStorage.setItem(`child_pattern_opacity_${child.id}`, String(frac));
                          }} />
                        </div>
                      </div>
                      <input id="prof-avatar-url" className="form-control" placeholder="Avatar URL or auto-filled" style={{ maxWidth: 420 }} defaultValue={child?.avatarUrl || ''} />
                    </div>
                  </div>
                  <div className="col-12">
                    <label className="form-label">Background pattern</label>
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      {patternSvgs.map((u) => (
                        <button key={u} type="button" className="btn btn-outline-secondary" onClick={() => {
                          document.documentElement.style.setProperty('--pattern-image', `url("${u}")`);
                          document.body.classList.add('cute-bg-on');
                          setCuteBg(true);
                          if (child?.id) localStorage.setItem(`child_pattern_${child.id}`, u);
                        }}>
                          <img src={u} alt="pattern option" style={{ width: 28, height: 28 }} />
                        </button>
                      ))}
                      <input id="prof-pattern-upload" type="file" accept="image/svg+xml,image/png,image/jpeg" className="form-control" style={{ maxWidth: 420 }} onChange={(ev) => {
                        const f = (ev.target as HTMLInputElement).files?.[0];
                        if (!f) return;
                        const r = new FileReader();
                        r.onload = () => {
                          const dataUrl = String(r.result || '');
                          document.documentElement.style.setProperty('--pattern-image', `url("${dataUrl}")`);
                          document.body.classList.add('cute-bg-on');
                          setCuteBg(true);
                          if (child?.id) localStorage.setItem(`child_pattern_${child.id}`, dataUrl);
                        };
                        r.readAsDataURL(f);
                      }} />
                      <button type="button" className="btn btn-outline-secondary" onClick={() => {
                        document.body.classList.remove('cute-bg-on');
                        setCuteBg(false);
                        if (child?.id) localStorage.removeItem(`child_pattern_${child.id}`);
                      }}>Clear pattern</button>
                    </div>
                  </div>
                  <div className="col-12">
                    <div className="form-check form-switch">
                      <input id="prof-cute" className="form-check-input" type="checkbox" defaultChecked={cuteBg} onChange={(e) => {
                        const on = e.currentTarget.checked;
                        setCuteBg(on);
                        try { if (on) document.body.classList.add('cute-bg-on'); else document.body.classList.remove('cute-bg-on'); } catch {}
                        if (child?.id) localStorage.setItem(`child_cute_${child.id}`, on ? '1' : '0');
                      }} />
                      <label className="form-check-label" htmlFor="prof-cute">Add cute background images</label>
                    </div>
                  </div>
                  <div className="col-12">
                    <button className="btn btn-primary" onClick={async () => {
                      const cid = child?.id; if (!cid) return;
                      const tok = localStorage.getItem('childToken');
                      const name = (document.getElementById('prof-name') as HTMLInputElement).value;
                      const color = (document.getElementById('prof-color') as HTMLInputElement).value;
                      const avatarUrl = (document.getElementById('prof-avatar-url') as HTMLInputElement).value || null;
                      try {
                        const r = await fetch(`/children/${cid}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: tok ? `Bearer ${tok}` : '' }, body: JSON.stringify({ displayName: name, themeColor: color, avatarUrl }) });
                        if (r.ok) {
                          const updated = await r.json();
                          setChild((c) => c ? { ...c, displayName: updated.displayName, themeColor: updated.themeColor, avatarUrl: updated.avatarUrl } : c);
                          try {
                            const root = document.documentElement;
                            root.style.setProperty('--accent', color);
                            const rgb = hexToRgb(color);
                            if (rgb) root.style.setProperty('--accent-rgb', `${rgb[0]},${rgb[1]},${rgb[2]}`);
                          } catch {}
                          push('success', 'Profile updated');
                          setSection('home');
                        } else {
                          const e = await r.json().catch(() => ({}));
                          push('error', e?.error || 'Update failed');
                        }
                      } catch { push('error', 'Update failed'); }
                    }}>Save changes</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      
      </div>
    </React.Fragment>
  );
}
