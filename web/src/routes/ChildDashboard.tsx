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
import GoldCoin from '../components/GoldCoin';

export default function ChildDashboard() {
  const nav = useNavigate();
  const [child, setChild] = useState<{ id: string; familyId: string; displayName?: string | null; avatarUrl?: string | null; themeColor?: string | null } | null>(null);
  const [celebrate, setCelebrate] = useState(0);
  const [today, setToday] = useState<any[]>([]);
  const [weekData, setWeekData] = useState<{ days: any[]; totalPlanned: number; totalApproved: number; today: number } | null>(null);
  const [balance, setBalance] = useState<{ available: number; reserved: number } | null>(null);
  const [ledger, setLedger] = useState<any[]>([]);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const { push } = useToast();
  const [savers, setSavers] = useState<any[]>([]);
  const [editing, setEditing] = useState<{ id: string; field: 'name' | 'target' | 'coins' } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [section, setSection] = useState<'home' | 'bank' | 'goals' | 'profile'>('home');
  const [cuteBg, setCuteBg] = useState(false);

  const avatarSrc = useMemo(() => {
    const u = child?.avatarUrl || null;
    if (!u) return null;
    if (u.startsWith('/uploads/serve')) {
      try { const tok = localStorage.getItem('childToken'); if (tok && !u.includes('token=')) return u + (u.includes('?') ? '&' : '?') + 'token=' + encodeURIComponent(tok); } catch {}
    }
    return u;
  }, [child]);
  const [avatarUploads, setAvatarUploads] = useState<{ id: string; url: string }[]>([]);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [patternUploads, setPatternUploads] = useState<{ id: string; url: string }[]>([]);
  const [patternFile, setPatternFile] = useState<File | null>(null);

    async function uploadToS3(scope: 'avatars' | 'patterns', file: File): Promise<{ key: string; url: string }>{
    const tok = localStorage.getItem('childToken');
    const contentType = file.type || (scope === 'patterns' ? 'image/svg+xml' : 'application/octet-stream');
    const pre = await fetch('/uploads/presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: tok ? `Bearer ${tok}` : '' },
      body: JSON.stringify({ filename: file.name, contentType, scope })
    });
    if (!pre.ok) throw new Error('presign failed');
    const data = await pre.json();
    if (data?.method === 'POST' && data?.post?.url && data?.post?.fields) {
      const fd = new FormData();
      Object.entries(data.post.fields as Record<string,string>).forEach(([k, v]) => fd.append(k, v));
      fd.append('file', file);
      const r = await fetch(data.post.url, { method: 'POST', body: fd, mode: 'cors' });
      if (!r.ok) { const msg = await r.text().catch(()=>'' ); throw new Error('upload failed ' + msg); }
      const key = data.key as string;
      const prox = `/uploads/serve?key=${encodeURIComponent(key)}${tok ? `&token=${encodeURIComponent(tok)}` : ''}`;
      return { key, url: prox };
    }
    const { uploadUrl, key } = data;
    if (!uploadUrl || !key) throw new Error('invalid presign response');
    const put = await fetch(uploadUrl, { method: 'PUT', mode: 'cors', headers: { 'Content-Type': contentType }, body: file });
    if (!put.ok) { const msg = await put.text().catch(()=>'' ); throw new Error('upload failed ' + msg); }
    const prox = `/uploads/serve?key=${encodeURIComponent(key)}${tok ? `&token=${encodeURIComponent(tok)}` : ''}`;
    return { key, url: prox };
  }


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
            document.documentElement.style.setProperty('--pattern-image', `url("${patt}")`);
            document.body.classList.add('cute-bg-on');
            setCuteBg(true);
          }
          const pSizeVar = localStorage.getItem(`child_pattern_size_${data.id}`);
          const pOp = localStorage.getItem(`child_pattern_opacity_${data.id}`);
          const pCol = localStorage.getItem(`child_pattern_color_${data.id}`);
          if (pSizeVar) document.documentElement.style.setProperty('--pattern-size', pSizeVar);
          if (pOp) document.documentElement.style.setProperty('--pattern-opacity', pOp);
          if (pCol) document.documentElement.style.setProperty('--pattern-color', pCol);
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
        avatar={avatarSrc}
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
              {(() => {
                const plannedCount = weekData ? weekData.days.reduce((s, d) => s + d.items.length, 0) : 0;
                const completedCount = weekData ? weekData.days.reduce((s, d) => s + d.items.filter((it: any) => it.status === 'approved' || it.status === 'pending').length, 0) : 0;
                const todayCount = (selectedDay != null && weekData) ? (weekData.days[selectedDay]?.items?.length || 0) : today.length;
                return (
                  <>
                    <div className="col-6 col-lg-3"><StatCard icon="📋" label={selectedDay != null && weekData ? new Date(weekData.days[selectedDay].date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Today'} value={todayCount} /></div>
                    <div className="col-6 col-lg-3"><StatCard icon="💰" label="Total Coins" value={(balance?.available ?? 0) + (balance?.reserved ?? 0)} /></div>
                    <div className="col-6 col-lg-3"><StatCard icon="✅" label="Completed" value={completedCount} /></div>
                    <div className="col-6 col-lg-3"><StatCard icon="⭐" label="This week" value={plannedCount} /></div>
                  </>
                );
              })()}
            </div>
            {/* Today (left), This Week (right) */}
            <div className="row g-3">
        <div className="col-12">
          <div className="card card--interactive h-100">
            <div className="card-body">
              <h2 className="h6 today">{selectedDay != null && weekData ? new Date(weekData.days[selectedDay].date).toLocaleDateString(undefined, { weekday:'long', month: 'short', day: 'numeric' }) : 'Today'}</h2>
              {(selectedDay != null && weekData ? (weekData.days[selectedDay]?.items || []) : today).length === 0 ? (
                <div className="text-muted">No chores for today.</div>
              ) : (
                <ul className="list-group list-group-flush">
                  {(selectedDay != null && weekData ? (weekData.days[selectedDay]?.items || []) : today).map((t: any) => {
                    const status = t.status as string | null | undefined;
                    const canUncomplete = (status === 'pending' || status === 'approved');
                    const canComplete = (!status || status === 'due' || status === 'planned' || status === 'missed');
                    return (
                    <li key={t.id} className="list-group-item d-flex justify-content-between align-items-center">
                      <div>
                        <div className="fw-semibold d-flex align-items-center gap-2">
                          <span>{t.name}</span>
                          <span className="d-inline-flex align-items-center" title={`+${t.value} coins`}>
                            {Array.from({ length: Math.min(t.value || 0, 5) }).map((_, idx) => (
                              <span key={idx} className="ms-1" style={{ display: 'inline-flex' }}><GoldCoin /></span>
                            ))}
                            {(t.value || 0) > 5 && <span className="ms-1" aria-hidden>…</span>}
                          </span>
                        </div>
                        <div className="small text-muted">{t.description || ''}</div>
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        {status === 'pending' && <span className="cc-chip cc-chip--pending">Pending</span>}
                        {status === 'approved' && <span className="cc-chip cc-chip--done">Done</span>}
                        {canUncomplete && (
                          <button
                            className="btn btn-sm btn-outline-secondary"
                            onClick={async () => {
                              const cid = child?.id;
                              if (!cid) return;
                               const res = await fetch(`/chores/${t.id}/uncomplete`, {
                                 method: 'POST',
                                 headers: { 'Content-Type': 'application/json' },
                                 body: JSON.stringify({ childId: cid, ...(selectedDay != null && weekData ? { date: weekData.days[selectedDay].date } : {}) })
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
                        {canComplete && (
                          <button
                            className="btn btn-primary btn-lg"
                            onClick={async () => {
                              const cid = child?.id;
                              if (!cid) return;
                               const res = await fetch(`/chores/${t.id}/complete`, {
                                 method: 'POST',
                                 headers: { 'Content-Type': 'application/json' },
                                 body: JSON.stringify({ childId: cid, ...(selectedDay != null && weekData ? { date: weekData.days[selectedDay].date } : {}) })
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
                  );})}
                </ul>
              )}
            </div>
          </div>
        </div>
        <div className="col-12">
          <div className="card card--interactive h-100">
            <div className="card-body">
              <section className="wk-card" aria-label="This Week">
                <header className="wk-head">
                  <h2>This Week</h2>
                  {!weekData ? (
                    <div className="wk-meta">No chores this week.</div>
                  ) : (
                    (() => {
                      const plannedCount = weekData.days.reduce((s, d) => s + d.items.length, 0);
                      const completedCount = weekData.days.reduce((s, d) => s + d.items.filter((it: any) => it.status === 'approved' || it.status === 'pending').length, 0);
                      const completedCoins = weekData.days.reduce((s, d) => s + d.items.filter((it: any) => it.status === 'approved' || it.status === 'pending').reduce((ss: number, it: any) => ss + (it.value || 0), 0), 0);
                      const pct = plannedCount ? Math.round((completedCount / plannedCount) * 100) : 0;
                      return (
                        <>
                          <div className="wk-meta">
                            <span>Completed: <strong className="chip">{completedCount} / {plannedCount}</strong></span>
                            <span>•</span>
                            <span>Coins: <strong className="chip">{completedCoins} / {weekData.totalPlanned}</strong></span>
                          </div>
                          <div className="wk-progress" role="progressbar" aria-valuemin={0} aria-valuemax={plannedCount} aria-valuenow={completedCount}>
                            <span style={{ width: `${pct}%` }} />
                          </div>
                        </>
                      );
                    })()
                  )}
                </header>
                {weekData && (
                  <>
                  <div className="wk-grid Calendar--desktop" role="grid" aria-label="Week grid">
                    {weekData.days.map((day, i) => {
                      const dd = new Date(day.date);
                      const weekday = dd.toLocaleDateString(undefined, { weekday: 'short' });
                      const mday = dd.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                      return (
                        <div key={`h-${day.date}`} className="wk-col">
                          <div className="wk-col-head"><div className="wk-day">{weekday} <span className="wk-daydate">{mday}</span></div></div>
                        </div>
                      );
                    })}
                    {weekData.days.map((day, i) => {
                      const items = day.items as any[];
                      const maxVisible = 4;
                      const visible = items.slice(0, maxVisible);
                      const more = Math.max(0, items.length - visible.length);
                      return (
                        <div key={day.date} className="wk-col">
                          <div
                            className={`wk-cell ${selectedDay === i || weekData.today === i ? 'is-selected' : ''}`}
                            tabIndex={0}
                            role="gridcell"
                            aria-label={new Date(day.date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                            onClick={() => setSelectedDay(i)}
                          >
                            {items.length === 0 ? (
                              <div className="wk-meta">No tasks</div>
                            ) : (
                              <div>
                                {visible.map((it: any) => {
                                  const status = it.status;
                                  const isDone = status === 'approved';
                                  const isMiss = status === 'missed';
                                  return (
                                    <div key={it.id} className="wk-task">
                                      <span className={`wk-box ${isDone ? 'ok' : isMiss ? 'miss' : ''}`} aria-label={isDone ? 'Done' : isMiss ? 'Missed' : 'Not completed'}>
                                        {isDone ? '✓' : isMiss ? '✕' : ''}
                                      </span>
                                      <span className="name">{it.name}</span>
                                    </div>
                                  );
                                })}
                                {more > 0 && (
                                  <div className="wk-task">
                                    <a className="name" href="#" onClick={(e) => e.preventDefault()} style={{ color: 'var(--wk-brand)' }}>+{more} more</a>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {/* Mobile accordion */}
                  <div className="wk-accordion Calendar--mobile" aria-label="Week list">
                    {weekData.days.map((day, i) => {
                      const d = new Date(day.date);
                      const dow = d.toLocaleDateString(undefined, { weekday: 'short' }).toUpperCase();
                      const dmd = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                      const items = day.items as any[];
                      const completedTasks = items.filter((it: any) => it.status === 'approved' || it.status === 'pending').length;
                      const totalTasks = items.length;
                      const coinsDone = day.approvedValue || 0;
                      const coinsTotal = day.plannedValue || 0;
                      const open = selectedDay === i || weekData.today === i;
                      const pv = items.slice(0, 2);
                      return (
                        <article key={`m-${day.date}`} className="wk-daycard" aria-expanded={open}>
                          <button
                            type="button"
                            className="wk-dayhdr"
                            aria-expanded={open}
                            aria-controls={`day-${i}`}
                            id={`btn-${i}`}
                            onClick={() => setSelectedDay(i)}
                          >
                            <div className="d-flex align-items-center gap-2">
                              <div className="wk-dow">{dow}</div>
                              <div className="wk-date-sm">{dmd}</div>
                            </div>
                            <div className="wk-metrics">
                              <span className="wk-badge progress">✓ {completedTasks}/{totalTasks}</span>
                              <span className="wk-badge coins"><span className="wk-coin-14"><GoldCoin /></span> {coinsDone}/{coinsTotal}</span>
                              <svg className="wk-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 9l4 4 4-4"/></svg>
                            </div>
                          </button>
                          {pv.length > 0 && (
                            <div className="wk-preview">
                              {pv.map((it: any) => (
                                <span key={it.id} className={`wk-pv ${it.status === 'approved' ? 'done' : ''}`}>{it.name}</span>
                              ))}
                              {items.length > pv.length && (
                                <a className="wk-pv" href="#" onClick={(e) => { e.preventDefault(); setSelectedDay(i); }}>+{items.length - pv.length} more…</a>
                              )}
                            </div>
                          )}
                          <div className="wk-panel" id={`day-${i}`} role="region" aria-labelledby={`btn-${i}`}>
                            {items.length === 0 ? (
                              <div className="text-muted">No tasks</div>
                            ) : (
                              items.map((it: any) => (
                                <div key={it.id} className="wk-task-row">
                                  <span className={`wk-box ${it.status === 'approved' ? 'ok' : it.status === 'missed' ? 'miss' : ''}`}>{it.status === 'approved' ? '✓' : it.status === 'missed' ? '✕' : ''}</span>
                                  <span className="wk-coin-14"><GoldCoin /></span>
                                  <span className="name">{it.name}</span>
                                  {it.status === 'approved' && <span className="wk-badge done">Done</span>}
                                  {it.status === 'missed' && <span className="wk-badge missed">Missed</span>}
                                </div>
                              ))
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                  </>
                )}
              </section>
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
                {savers.length > 0 && (
                  <div className="mt-3">
                    <div className="mb-2 fw-semibold">Active goals</div>
                    {savers.filter((s) => s.isGoal && !s.completed).length === 0 ? (
                      <div className="text-muted small">No active goals.</div>
                    ) : (
                      <ul className="list-group list-group-flush">
                        {savers.filter((s) => s.isGoal && !s.completed).map((s) => {
                          const saved = s.reserved || 0;
                          const target = s.target || 0;
                          const weeklyTotal = weekData?.totalPlanned || 0;
                          const coinsPerWeek = weeklyTotal > 0 ? Math.round((s.allocation || 0) * weeklyTotal / 100) : 0;
                          const pct = target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0;
                          return (
                            <li key={s.id} className="list-group-item">
                              <div className="d-flex justify-content-between align-items-center gap-3">
                                <div className="flex-grow-1">
                                  {editing?.id === s.id && editing.field === 'name' ? (
                                    <input
                                      className="form-control form-control-sm"
                                      style={{ maxWidth: 420 }}
                                      defaultValue={s.name || ''}
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur();
                                        if (e.key === 'Escape') setEditing(null);
                                      }}
                                      onBlur={async (e) => {
                                        const name = e.currentTarget.value.trim() || 'Untitled';
                                        if (name === s.name) { setEditing(null); return; }
                                        try {
                                          const tok = localStorage.getItem('childToken');
                                          const r = await fetch(`/savers/${s.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: tok ? `Bearer ${tok}` : '' }, body: JSON.stringify({ name }) });
                                          if (r.ok) {
                                            const updated = await r.json();
                                            setSavers((prev) => prev.map((x) => x.id === s.id ? updated : x));
                                            push('success', 'Renamed');
                                          } else {
                                            push('error', 'Rename failed');
                                          }
                                        } catch {
                                          push('error', 'Rename failed');
                                        } finally {
                                          setEditing(null);
                                        }
                                      }}
                                    />
                                  ) : (
                                    <div
                                      role="button"
                                      className="fw-semibold"
                                      onClick={() => setEditing({ id: s.id, field: 'name' })}
                                      title="Click to rename"
                                    >
                                      {s.name || 'Untitled'}
                                    </div>
                                  )}
                                  <div className="small text-muted">Saved {saved} / {target}</div>
                                  <div className="mt-1"><ProgressBar value={pct} /></div>
                                </div>
                                <div className="d-flex align-items-center gap-3 ms-auto">
                                  {/* Target inline edit, right-justified */}
                                  <div>
                                    {editing?.id === s.id && editing.field === 'target' ? (
                                      <input
                                        type="number"
                                        min={1}
                                        className="form-control form-control-sm text-end"
                                        style={{ width: 120 }}
                                        defaultValue={String(target || 1)}
                                        autoFocus
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur();
                                          if (e.key === 'Escape') setEditing(null);
                                        }}
                                        onBlur={async (e) => {
                                          const val = parseInt((e.currentTarget.value || '0'), 10);
                                          const nextTarget = Number.isFinite(val) && val > 0 ? val : target;
                                          if (nextTarget === target) { setEditing(null); return; }
                                          try {
                                            const tok = localStorage.getItem('childToken');
                                            const r = await fetch(`/savers/${s.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: tok ? `Bearer ${tok}` : '' }, body: JSON.stringify({ target: nextTarget }) });
                                            if (r.ok) {
                                              const updated = await r.json();
                                              setSavers((prev) => prev.map((x) => x.id === s.id ? updated : x));
                                              push('success', 'Target updated');
                                            } else {
                                              push('error', 'Update failed');
                                            }
                                          } catch {
                                            push('error', 'Update failed');
                                          } finally {
                                            setEditing(null);
                                          }
                                        }}
                                      />
                                    ) : (
                                      <div
                                        role="button"
                                        className="text-muted"
                                        title="Click to edit target"
                                        onClick={() => setEditing({ id: s.id, field: 'target' })}
                                      >
                                        Target: <span className="fw-semibold">{target}</span>
                                      </div>
                                    )}
                                  </div>
                                  {/* Weekly allocation in coins per week (behaves like target) */}
                                  <div>
                                    {editing?.id === s.id && editing.field === 'coins' ? (
                                      <input
                                        id={`wk-${s.id}`}
                                        type="number"
                                        min={0}
                                        className="form-control form-control-sm text-end"
                                        style={{ width: 120 }}
                                        defaultValue={String(coinsPerWeek)}
                                        autoFocus
                                        onKeyDown={(e) => { if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur(); if (e.key === 'Escape') setEditing(null); }}
                                        onBlur={async (e) => {
                                          const val = parseInt((e.currentTarget.value || '0'), 10);
                                          const wk = Number.isFinite(val) && val >= 0 ? val : coinsPerWeek;
                                          if (wk === coinsPerWeek || weeklyTotal <= 0) { setEditing(null); return; }
                                          let pct = Math.round((wk / weeklyTotal) * 100);
                                          pct = Math.max(0, Math.min(100, pct));
                                          try {
                                            const tok = localStorage.getItem('childToken');
                                            const r = await fetch(`/savers/${s.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: tok ? `Bearer ${tok}` : '' }, body: JSON.stringify({ allocation: pct }) });
                                            if (r.ok) {
                                              const updated = await r.json();
                                              setSavers((prev) => prev.map((x) => x.id === s.id ? updated : x));
                                              push('success', 'Weekly allocation updated');
                                            } else {
                                              push('error', 'Allocation failed');
                                            }
                                          } catch {
                                            push('error', 'Allocation failed');
                                          } finally {
                                            setEditing(null);
                                          }
                                        }}
                                      />
                                    ) : (
                                      <div
                                        role="button"
                                        className="text-muted text-end"
                                        title="Click to edit coins per week"
                                        onClick={() => setEditing({ id: s.id, field: 'coins' })}
                                        style={{ width: 120 }}
                                      >
                                        coins/wk: <span className="fw-semibold">{coinsPerWeek}</span>
                                      </div>
                                    )}
                                  </div>
                                  {/* Delete */}
                                  <button
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={async () => {
                                      if (!confirm('Delete this item? Reserved coins (if any) will be released.')) return;
                                      try {
                                        const tok = localStorage.getItem('childToken');
                                        const r = await fetch(`/savers/${s.id}`, { method: 'DELETE', headers: { Authorization: tok ? `Bearer ${tok}` : '' } });
                                        if (r.ok) {
                                          setSavers((prev) => prev.filter((x) => x.id !== s.id));
                                          push('success', 'Deleted');
                                        } else {
                                          push('error', 'Delete failed');
                                        }
                                      } catch {
                                        push('error', 'Delete failed');
                                      }
                                    }}
                                  >Delete</button>
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}

                    {savers.some((s) => s.completed) && (
                      <div className="mt-4">
                        <div className="mb-2 fw-semibold">Achieved</div>
                        <ul className="list-group list-group-flush">
                          {savers.filter((s) => s.completed).map((s) => (
                            <li key={s.id} className="list-group-item">
                              <div className="d-flex justify-content-between align-items-start gap-3">
                                <div className="flex-grow-1">
                                  <div className="fw-semibold">{s.name || 'Untitled'}</div>
                                  <div className="small text-muted">Target {s.target}</div>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
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
                          (document.getElementById('prof-avatar-id') as HTMLInputElement).value = '';
                          (document.getElementById('prof-avatar-url') as HTMLInputElement).value = u;
                          const prev = document.getElementById('prof-avatar-preview') as HTMLImageElement | null;
                          if (prev) prev.src = u;
                        }}>
                          <img src={u} alt="avatar option" style={{ width: 28, height: 28 }} />
                        </button>
                      ))}
                      {avatarUploads.map((a) => (
                        <button key={a.id} type="button" className="btn btn-outline-secondary" onClick={() => {
                          (document.getElementById('prof-avatar-id') as HTMLInputElement).value = a.id;
                          (document.getElementById('prof-avatar-url') as HTMLInputElement).value = '';
                          const prev = document.getElementById('prof-avatar-preview') as HTMLImageElement | null;
                          if (prev) prev.src = a.url;
                        }}>
                          <img src={a.url} alt="uploaded avatar" style={{ width: 28, height: 28 }} />
                        </button>
                      ))}
                      <div className="d-flex align-items-center gap-2">
                        <input type="file" accept="image/*" className="form-control" style={{ maxWidth: 260 }} onChange={(ev) => {
                          const f = (ev.target as HTMLInputElement).files?.[0] || null;
                          setAvatarFile(f);
                        }} />
                        <button type="button" className="btn btn-primary" disabled={!avatarFile} onClick={async () => {
                          const f = avatarFile; if (!f) return;
                          try {
                            const { key, url } = await uploadToS3('avatars', f);
                            setAvatarUploads((prev) => [{ id: key, url }, ...prev]);
                            (document.getElementById('prof-avatar-id') as HTMLInputElement).value = key;
                            (document.getElementById('prof-avatar-url') as HTMLInputElement).value = '';
                            const prevImg = document.getElementById('prof-avatar-preview') as HTMLImageElement | null;
                            if (prevImg) prevImg.src = url;
                            setAvatarFile(null);
                          } catch (e) { try { push('error', 'Upload failed'); } catch {} }
                        }}>Upload</button>
                      </div>
                      <input id="prof-avatar-url" className="form-control" placeholder="Avatar URL (fallback)" style={{ maxWidth: 420 }} defaultValue={child?.avatarUrl || ''} />
                      <input id="prof-avatar-id" type="hidden" />
                      <div className="mt-2">
                        <img id="prof-avatar-preview" alt="avatar preview" style={{ width: 40, height: 40, borderRadius: '50%' }} src={child?.avatarUrl || ''} />
                      </div>
                    </div></div>
                  <div className="col-12">
                    <label className="form-label">Background pattern</label>
                    {cuteBg ? (
                      <div className="d-flex align-items-center gap-2 flex-wrap">
                        {patternSvgs.map((u) => (
                          <button key={u} type="button" className="btn btn-outline-secondary" onClick={() => {
                            if (child?.id) localStorage.setItem(`child_pattern_${child.id}`, u);
                            localStorage.removeItem(`child_pattern_id_${child?.id || ''}`);
                            document.documentElement.style.setProperty('--pattern-image', `url("${u}")`);
                            document.body.classList.add('cute-bg-on');
                            setCuteBg(true);
                          }}>
                            <img src={u} alt="pattern option" style={{ width: 28, height: 28 }} />
                          </button>
                        ))}
                        {patternUploads.map((patt) => (
                          <button key={patt.id} type="button" className="btn btn-outline-secondary" onClick={() => {
                            if (child?.id) {
                              localStorage.setItem(`child_pattern_id_${child.id}`, patt.id);
                              localStorage.setItem(`child_pattern_${child.id}`, patt.url);
                            }
                            document.documentElement.style.setProperty('--pattern-image', `url("${patt.url}")`);
                            document.body.classList.add('cute-bg-on');
                            setCuteBg(true);
                          }}>
                            <img src={patt.url} alt="uploaded pattern" style={{ width: 28, height: 28 }} />
                          </button>
                        ))}
                        <div className="d-flex align-items-center gap-2">
                          <input id="prof-pattern-upload" type="file" accept="image/svg+xml" className="form-control" style={{ maxWidth: 420 }} onChange={(ev) => { const f = (ev.target as HTMLInputElement).files?.[0] || null; setPatternFile(f); }} />
                          <button type="button" className="btn btn-primary" disabled={!patternFile} onClick={async () => {
                            const f = patternFile; if (!f) return;
                            try {
                              const { key, url } = await uploadToS3('patterns', f);
                              setPatternUploads((prev) => [{ id: key, url }, ...prev]);
                              if (child?.id) { localStorage.setItem(`child_pattern_id_${child.id}`, key); localStorage.setItem(`child_pattern_${child.id}`, url); }
                              document.documentElement.style.setProperty('--pattern-image', `url("${url}")`);
                              document.body.classList.add('cute-bg-on');
                              setCuteBg(true);
                              setPatternFile(null);
                            } catch (e) { try { push('error', 'Upload failed'); } catch {} }
                          }}>Upload</button>
                        </div>
                        <div className="row g-2 w-100 mt-1"></div>
                      </div>
                    ) : (
                      <div className="text-muted small">Toggle the switch below to customize a background pattern.</div>
                    )}
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
                        const r = await fetch(`/children/${cid}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: tok ? `Bearer ${tok}` : '' }, body: JSON.stringify({ displayName: name, themeColor: color, avatarImageId: (document.getElementById('prof-avatar-id') as HTMLInputElement).value || undefined, avatarUrl: (document.getElementById('prof-avatar-id') as HTMLInputElement).value ? undefined : ((document.getElementById('prof-avatar-url') as HTMLInputElement).value || null) }) });
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
