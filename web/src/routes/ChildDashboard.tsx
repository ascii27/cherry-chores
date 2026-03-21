import React, { useEffect, useMemo, useState, useCallback } from 'react';
import '../styles/app-theme.css';
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
import CoinBurst from '../components/CoinBurst';
import StatCard from '../components/StatCard';
import ProgressBar from '../components/ProgressBar';
import Coin from '../components/Coin';
import GoldCoin from '../components/GoldCoin';

export default function ChildDashboard() {
  const nav = useNavigate();
  const [child, setChild] = useState<{ id: string; familyId: string; displayName?: string | null; avatarUrl?: string | null; themeColor?: string | null } | null>(null);
  const [celebrate, setCelebrate] = useState(0);
  const [coinBurst, setCoinBurst] = useState(0);
  const [today, setToday] = useState<any[]>([]);
  const [weekData, setWeekData] = useState<{ days: any[]; totalPlanned: number; totalApproved: number; today: number } | null>(null);
  const [balance, setBalance] = useState<{ available: number; reserved: number } | null>(null);
  const [ledger, setLedger] = useState<any[]>([]);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const { push } = useToast();
  const [savers, setSavers] = useState<any[]>([]);
  const [editing, setEditing] = useState<{ id: string; field: 'name' | 'target' | 'coins' } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [section, setSection] = useState<'home' | 'bank' | 'goals' | 'bonuses' | 'profile'>('home');
  const [cuteBg, setCuteBg] = useState(false);

  // Bonus state
  const [bonuses, setBonuses] = useState<any[]>([]);
  const [myBonusClaims, setMyBonusClaims] = useState<any[]>([]);
  const [claimingBonusId, setClaimingBonusId] = useState<string | null>(null);
  const [claimNote, setClaimNote] = useState('');

  const avatarSrc = useMemo(() => {
    const u = child?.avatarUrl || null;
    if (!u) return null;
    if (u.startsWith('/uploads/serve')) {
      const tok = localStorage.getItem('childToken');
      if (tok) return `${u}&token=${encodeURIComponent(tok)}`;
    }
    return u;
  }, [child]);
  const [avatarUploads, setAvatarUploads] = useState<{ id: string; url: string }[]>([]);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [patternUploads, setPatternUploads] = useState<{ id: string; url: string }[]>([]);
  const [patternFile, setPatternFile] = useState<File | null>(null);
  const [selectedAvatarId, setSelectedAvatarId] = useState<string | null>(null);
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState<string | null>(null);


  function dbg(label: string, data?: any) { try { console.log('[Profile]', label, data ?? ''); } catch {} }

  // Append the child auth token to /uploads/serve URLs so <img> tags can authenticate
  function serveImgUrl(url: string): string {
    if (!url.startsWith('/uploads/serve')) return url;
    const tok = localStorage.getItem('childToken');
    return tok ? `${url}&token=${encodeURIComponent(tok)}` : url;
  }


    async function uploadToS3(scope: 'avatars' | 'patterns' | 'goals', file: File): Promise<{ key: string; url: string }>{
    const tok = localStorage.getItem('childToken'); dbg('upload:auth', { hasToken: !!tok });
    const contentType = file.type || (scope === 'patterns' ? 'image/svg+xml' : 'application/octet-stream');
    dbg('presign:request', { scope, name: file.name, type: contentType });
    const pre = await fetch('/uploads/presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: tok ? `Bearer ${tok}` : '' },
      body: JSON.stringify({ filename: file.name, contentType, scope })
    });
    if (!pre.ok) { dbg('presign:fail', pre.status); throw new Error('presign failed'); } else { dbg('presign:ok'); }
    const data = await pre.json(); dbg('presign:response', data);
    if (data?.method === 'POST' && data?.post?.url && data?.post?.fields) {
      const fd = new FormData();
      Object.entries(data.post.fields as Record<string,string>).forEach(([k, v]) => fd.append(k, v));
      fd.append('file', file);
      dbg('upload:post:start', { url: data.post.url });
      // Same-origin local uploads use 'cors' so errors are readable; cross-origin S3 needs 'no-cors'
      const uploadMode = data.post.url.startsWith('/') ? 'cors' : 'no-cors';
      const uploadRes = await fetch(data.post.url, { method: 'POST', body: fd, mode: uploadMode });
      if (uploadMode === 'cors' && !uploadRes.ok) { dbg('upload:post:fail', uploadRes.status); throw new Error('upload failed: ' + uploadRes.status); }
      dbg('upload:post:done');
      dbg('complete:request', { key: data.key, scope });
      const rec = await fetch('/uploads/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: tok ? `Bearer ${tok}` : '' },
        body: JSON.stringify({ key: data.key, scope })
      });
      const rjson = rec.ok ? await rec.json() : { id: undefined }; dbg('complete:response', rjson);
      const key = (rjson?.key as string) || (data.key as string);
      const prox = `/uploads/serve?key=${encodeURIComponent(key)}`;
      return { key: (rjson as any)?.id || key, url: prox };
    }
    const { uploadUrl, key } = data;
    if (!uploadUrl || !key) throw new Error('invalid presign response');
    const put = await fetch(uploadUrl, { method: 'PUT', mode: 'cors', headers: { 'Content-Type': contentType }, body: file });
    if (!put.ok) { const msg = await put.text().catch(()=>'' ); throw new Error('upload failed ' + msg); }
    const prox = `/uploads/serve?key=${encodeURIComponent(key)}`;
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
    try { document.cookie = `auth=${encodeURIComponent(token)}; Path=/; SameSite=Lax; Max-Age=604800`; } catch {}
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
        // Fetch uploaded images for avatar/patterns
        try {
          const upA = await fetch(`/uploads?scope=avatars`, { headers: { Authorization: `Bearer ${token}` } });
          const upP = await fetch(`/uploads?scope=patterns`, { headers: { Authorization: `Bearer ${token}` } });
          const la = upA.ok ? await upA.json() : [];
          const lp = upP.ok ? await upP.json() : [];
          setAvatarUploads((la || []).map((r: any) => ({ id: r.id, url: r.url })));
          setPatternUploads((lp || []).map((r: any) => ({ id: r.id, url: r.url })));
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
        // Fetch bonuses
        try {
          const bonusToken = localStorage.getItem('childToken');
          const rBonuses = await fetch(`/api/families/${data.familyId}/bonuses`, { headers: { Authorization: bonusToken ? `Bearer ${bonusToken}` : '' } });
          setBonuses(rBonuses.ok ? await rBonuses.json() : []);
          // Fetch child's own bonus claims by getting all and filtering, or use the bonus list metadata
          // We'll track my claims via a dedicated state update after claiming
        } catch { setBonuses([]); }
        try { setSelectedAvatarUrl(data.avatarUrl || null); } catch {}
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

  useEffect(() => {
    document.body.classList.add('arcade-body');
    return () => document.body.classList.remove('arcade-body');
  }, []);

  return (
    <div className="arcade-app">
      <TopBar
        name={child?.displayName || 'Welcome'}
        avatar={avatarSrc}
        accent={child?.themeColor || null}
        onNameClick={() => setSection('profile')}
        onAvatarClick={() => setSection('profile')}
        onMenuToggle={() => setMenuOpen(true)}
        onLogout={() => { try { document.cookie = 'auth=; Path=/; Max-Age=0'; } catch {}; localStorage.removeItem('childToken'); nav('/'); }}
      />
      <Celebration trigger={celebrate} />
      <CoinBurst trigger={coinBurst} />
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
          <button className={`btn text-start mb-2 ${section === 'home' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => { setSection('home'); setMenuOpen(false); }}>🏠 Home</button>
          <button className={`btn text-start mb-2 ${section === 'bank' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => { setSection('bank'); setMenuOpen(false); }}>💰 Treasure Chest</button>
          <button className={`btn text-start mb-2 ${section === 'goals' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => { setSection('goals'); setMenuOpen(false); }}>🎯 Wish List</button>
          <button className={`btn text-start mb-2 ${section === 'bonuses' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => { setSection('bonuses'); setMenuOpen(false); }}>⭐ Bonus Quests</button>
          <button className={`btn text-start ${section === 'profile' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => { setSection('profile'); setMenuOpen(false); }}>🎮 Profile</button>
        </nav>
      </aside>
      <div className="container py-4">
        {section === 'home' && (
          <React.Fragment>
            {/* ── Goal Hero Card ── */}
            {(() => {
              const activeGoal = savers.find((s) => s.isGoal && !s.completed) ?? null;
              if (!activeGoal) {
                return (
                  <div className="goal-hero-empty">
                    <strong>No active goal yet 🎯</strong>
                    Set a goal in your Wish List to start saving!
                  </div>
                );
              }
              const saved = activeGoal.reserved || 0;
              const target = activeGoal.target || 1;
              const pct = Math.min(100, Math.round((saved / target) * 100));
              const coinsToGo = Math.max(0, target - saved);
              const todayEarnable = today
                .filter((t: any) => !t.status || t.status === 'due' || t.status === 'planned' || t.status === 'missed')
                .reduce((s: number, t: any) => s + (t.value || 0), 0);
              const isComplete = pct >= 100;
              return (
                <div className={`goal-hero${isComplete ? ' goal-hero-complete' : ''}`}>
                  <div className="goal-hero-inner">
                    <div className="goal-hero-img">
                      {activeGoal.imageUrl
                        ? <img src={activeGoal.imageUrl} alt={activeGoal.name} />
                        : '🎯'}
                    </div>
                    <div className="goal-hero-info">
                      <div className="goal-hero-label">Saving for</div>
                      <div className="goal-hero-name">{activeGoal.name}</div>
                      <div className="goal-hero-bar-track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${pct}% saved`}>
                        <div className="goal-hero-bar-fill" style={{ width: `${pct}%` }} />
                      </div>
                      {isComplete ? (
                        <div className="goal-hero-meta">
                          <span>🎉 Goal reached! Ask a parent to approve your payout.</span>
                        </div>
                      ) : (
                        <>
                          <div className="goal-hero-meta">
                            <span><strong>{saved}</strong> / {target} coins saved</span>
                            <span>·</span>
                            <span><strong>{coinsToGo}</strong> to go</span>
                          </div>
                          {todayEarnable > 0 && (
                            <div className="goal-hero-earn">
                              ✨ Complete today's quests to earn {todayEarnable} coins!
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ── Stat Cards ── */}
            <div className="row g-3 mb-2">
              {(() => {
                const plannedCount = weekData ? weekData.days.reduce((s, d) => s + d.items.length, 0) : 0;
                const completedCount = weekData ? weekData.days.reduce((s, d) => s + d.items.filter((it: any) => it.status === 'approved' || it.status === 'pending').length, 0) : 0;
                const todayCount = (selectedDay != null && weekData) ? (weekData.days[selectedDay]?.items?.length || 0) : today.length;
                return (
                  <>
                    <div className="col-6 col-lg-3"><StatCard icon="⚔️" label={selectedDay != null && weekData ? new Date(weekData.days[selectedDay].date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : "Today's Quests"} value={todayCount} /></div>
                    <div className="col-6 col-lg-3"><StatCard icon="💰" label="Total Coins" value={(balance?.available ?? 0) + (balance?.reserved ?? 0)} /></div>
                    <div className="col-6 col-lg-3"><StatCard icon="✅" label="Completed" value={completedCount} /></div>
                    <div className="col-6 col-lg-3"><StatCard icon="📅" label="This week" value={plannedCount} /></div>
                  </>
                );
              })()}
            </div>

            {/* ── Today's Quests + This Week ── */}
            <div className="row g-3">
        <div className="col-12">
          <div className="card card--interactive h-100">
            <div className="card-body">
              <h2 className="h6 today">{selectedDay != null && weekData ? new Date(weekData.days[selectedDay].date).toLocaleDateString(undefined, { weekday:'long', month: 'short', day: 'numeric' }) : "Today's Quests ⚔️"}</h2>
              {(selectedDay != null && weekData ? (weekData.days[selectedDay]?.items || []) : today).length === 0 ? (
                <div className="text-muted">No quests today — enjoy your day! 🌟</div>
              ) : (
                <div>
                  {(selectedDay != null && weekData ? (weekData.days[selectedDay]?.items || []) : today).map((t: any) => {
                    const status = t.status as string | null | undefined;
                    const canUncomplete = (status === 'pending' || status === 'approved');
                    const canComplete = (!status || status === 'due' || status === 'planned' || status === 'missed');
                    return (
                    <div key={t.id} className="quest-item">
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="quest-name">{t.name}</div>
                        {t.description && <div className="quest-desc">{t.description}</div>}
                      </div>
                      <div className="quest-coins" aria-label={`${t.value || 0} coins`}>
                        <GoldCoin size={18} />
                        {t.value || 0}
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        {status === 'pending' && <span className="cc-chip cc-chip--pending">Pending</span>}
                        {status === 'approved' && <span className="cc-chip cc-chip--done">✓ Done</span>}
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
                            className="quest-done-btn"
                            onClick={async () => {
                              const cid = child?.id;
                              if (!cid) return;
                               const res = await fetch(`/chores/${t.id}/complete`, {
                                 method: 'POST',
                                 headers: { 'Content-Type': 'application/json' },
                                 body: JSON.stringify({ childId: cid, ...(selectedDay != null && weekData ? { date: weekData.days[selectedDay].date } : {}) })
                                 });
                              if (!res.ok) return;
                              const [r1, r2, rb, rs] = await Promise.all([
                                fetch(`/children/${cid}/chores?scope=today`),
                                fetch(`/children/${cid}/chores/week`),
                                fetch(`/bank/${cid}`),
                                fetch(`/children/${cid}/savers`, { headers: { Authorization: `Bearer ${localStorage.getItem('childToken') ?? ''}` } }),
                              ]);
                              setToday(r1.ok ? await r1.json() : []);
                              setWeekData(r2.ok ? await r2.json() : null);
                              if (rb.ok) { const b = await rb.json(); setBalance(b.balance); setLedger(b.entries || []); }
                              setSavers(rs.ok ? await rs.json() : []);
                              setCelebrate((n) => n + 1);
                              setCoinBurst((n) => n + 1);
                            }}
                          >
                            ✓ Done
                          </button>
                        )}
                      </div>
                    </div>
                  );})}
                </div>
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
              <h2 className="h6">💰 Treasure Chest</h2>
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
                      const tok = localStorage.getItem('childToken'); dbg('upload:auth', { hasToken: !!tok });
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
                  <h2 className="h6 mb-0">🎯 Wish List</h2>
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
                                <div className="d-flex align-items-center gap-3">
                                  <div style={{ width: 48, height: 48, borderRadius: 6, overflow: 'hidden', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {s.imageUrl ? (
                                      <img src={s.imageUrl} alt="goal" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                      <span className="text-muted" aria-hidden>🖼️</span>
                                    )}
                                  </div>
                                  <div className="d-flex flex-column">
                                    <label className="btn btn-sm btn-outline-secondary mb-0" style={{ width: 'fit-content' }}>
                                      {s.imageUrl ? 'Change picture' : 'Add picture'}
                                      <input
                                        type="file"
                                        accept="image/*"
                                        style={{ display: 'none' }}
                                        onChange={async (ev) => {
                                          const f = (ev.target as HTMLInputElement).files?.[0] || null;
                                          if (!f) return;
                                          try {
                                            const { url } = await uploadToS3('goals', f);
                                            const tok = localStorage.getItem('childToken');
                                            const r = await fetch(`/savers/${s.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: tok ? `Bearer ${tok}` : '' }, body: JSON.stringify({ imageUrl: url }) });
                                            if (r.ok) {
                                              const updated = await r.json();
                                              setSavers((prev) => prev.map((x) => x.id === s.id ? updated : x));
                                              push('success', 'Picture updated');
                                            } else {
                                              push('error', 'Update failed');
                                            }
                                          } catch {
                                            push('error', 'Upload failed');
                                          } finally {
                                            (ev.target as HTMLInputElement).value = '';
                                          }
                                        }}
                                      />
                                    </label>
                                  </div>
                                </div>
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
                                          const tok = localStorage.getItem('childToken'); dbg('upload:auth', { hasToken: !!tok });
                                          const r = await fetch(`/savers/${s.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: tok ? `Bearer ${tok}` : '' }, body: JSON.stringify({ name }) });
                                          if (r.ok) {
                                            const updated = await r.json(); dbg('save:success', updated);
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
                                            const tok = localStorage.getItem('childToken'); dbg('upload:auth', { hasToken: !!tok });
                                            const r = await fetch(`/savers/${s.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: tok ? `Bearer ${tok}` : '' }, body: JSON.stringify({ target: nextTarget }) });
                                            if (r.ok) {
                                              const updated = await r.json(); dbg('save:success', updated);
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
                                            const tok = localStorage.getItem('childToken'); dbg('upload:auth', { hasToken: !!tok });
                                            const r = await fetch(`/savers/${s.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: tok ? `Bearer ${tok}` : '' }, body: JSON.stringify({ allocation: pct }) });
                                            if (r.ok) {
                                              const updated = await r.json(); dbg('save:success', updated);
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
                                        const tok = localStorage.getItem('childToken'); dbg('upload:auth', { hasToken: !!tok });
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

      {section === 'bonuses' && (
        <div className="row g-3 mt-1">
          <div className="col-12">
            <div className="card card--interactive h-100">
              <div className="card-body">
                <h2 className="h6 mb-3">🎁 Bonus Opportunities</h2>
                {bonuses.filter((b) => b.active).length === 0 ? (
                  <div className="text-muted">
                    <div className="fs-4 mb-1">🎁</div>
                    No bonus opportunities right now. Check back later!
                  </div>
                ) : (
                  <div className="row g-3">
                    {bonuses.filter((b) => b.active).map((bonus: any) => {
                      const myPending = myBonusClaims.find((cl) => cl.bonusId === bonus.id && (cl.status === 'pending' || cl.status === 'approved'));
                      const alreadyClaimed = bonus.claimType === 'one-time' && !!myPending;
                      return (
                        <div key={bonus.id} className="col-12 col-md-6">
                          <div className="card shadow-sm h-100">
                            <div className="card-body">
                              <div className="d-flex justify-content-between align-items-start gap-2">
                                <div className="flex-grow-1">
                                  <div className="fw-semibold">{bonus.name}</div>
                                  {bonus.description && <div className="small text-muted">{bonus.description}</div>}
                                </div>
                                <span className="badge bg-warning text-dark flex-shrink-0">+{bonus.value} coins</span>
                              </div>
                              <div className="mt-2">
                                <span className="badge bg-light text-dark small">{bonus.claimType === 'one-time' ? 'One-time bonus' : 'Unlimited claims'}</span>
                              </div>
                              {claimingBonusId === bonus.id ? (
                                <div className="mt-3">
                                  <label className="form-label small">Note (optional)</label>
                                  <textarea
                                    className="form-control form-control-sm mb-2"
                                    rows={2}
                                    placeholder="Tell your parent what you did..."
                                    value={claimNote}
                                    onChange={(e) => setClaimNote(e.target.value)}
                                    autoFocus
                                  />
                                  <div className="d-flex gap-2">
                                    <button
                                      className="btn btn-primary btn-sm"
                                      onClick={async () => {
                                        const tok = localStorage.getItem('childToken');
                                        const r = await fetch(`/api/bonuses/${bonus.id}/claim`, {
                                          method: 'POST',
                                          headers: { 'Content-Type': 'application/json', Authorization: tok ? `Bearer ${tok}` : '' },
                                          body: JSON.stringify({ note: claimNote || undefined }),
                                        });
                                        if (r.ok) {
                                          const claim = await r.json();
                                          setMyBonusClaims((prev) => [claim, ...prev]);
                                          setClaimingBonusId(null);
                                          setClaimNote('');
                                          push('success', 'Bonus claimed! Waiting for parent approval.');
                                          // Refresh bonus list to update one-time status
                                          const rBonuses = await fetch(`/api/families/${child?.familyId}/bonuses`, { headers: { Authorization: tok ? `Bearer ${tok}` : '' } });
                                          if (rBonuses.ok) setBonuses(await rBonuses.json());
                                        } else {
                                          try { const err = await r.json(); push('error', err?.error || 'Claim failed'); } catch { push('error', 'Claim failed'); }
                                        }
                                      }}
                                    >Submit Claim</button>
                                    <button className="btn btn-outline-secondary btn-sm" onClick={() => { setClaimingBonusId(null); setClaimNote(''); }}>Cancel</button>
                                  </div>
                                </div>
                              ) : (
                                <div className="mt-3">
                                  {alreadyClaimed ? (
                                    <button className="btn btn-sm btn-outline-secondary" disabled>Already claimed</button>
                                  ) : (
                                    <button
                                      className="btn btn-primary btn-sm"
                                      onClick={() => { setClaimingBonusId(bonus.id); setClaimNote(''); }}
                                    >Claim</button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {myBonusClaims.length > 0 && (
                  <div className="mt-4">
                    <h3 className="h6 mb-2">My Claims</h3>
                    <ul className="list-group list-group-flush">
                      {myBonusClaims.map((claim: any) => {
                        const bonus = bonuses.find((b) => b.id === claim.bonusId);
                        return (
                          <li key={claim.id} className="list-group-item d-flex justify-content-between align-items-start gap-2 px-0">
                            <div className="flex-grow-1">
                              <div className="fw-semibold">{bonus?.name || 'Bonus'}</div>
                              {claim.note && <div className="small text-muted">{claim.note}</div>}
                              {claim.status === 'rejected' && claim.rejectionReason && (
                                <div className="small text-danger">Reason: {claim.rejectionReason}</div>
                              )}
                            </div>
                            {claim.status === 'pending' && <span className="badge bg-warning text-dark">Pending</span>}
                            {claim.status === 'approved' && <span className="badge bg-success text-white">Approved</span>}
                            {claim.status === 'rejected' && <span className="badge bg-danger text-white">Rejected</span>}
                          </li>
                        );
                      })}
                    </ul>
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
                          setSelectedAvatarId(null);
                          setSelectedAvatarUrl(u);
                          
                        }}>
                          <img src={u} alt="avatar option" style={{ width: 28, height: 28 }} />
                        </button>
                      ))}
                      {avatarUploads.map((a) => (
                        <div key={a.id} className="position-relative d-inline-block">
                          <button type="button" className="btn btn-outline-secondary" onClick={() => {
                            setSelectedAvatarId(a.id);
                            setSelectedAvatarUrl(a.url);
                          }}>
                            <img src={serveImgUrl(a.url)} alt="uploaded avatar" style={{ width: 28, height: 28 }} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm position-absolute top-0 end-0 p-0 lh-1"
                            style={{ width: 16, height: 16, fontSize: 10, transform: 'translate(40%,-40%)', zIndex: 1 }}
                            title="Delete"
                            onClick={async () => {
                              const tok = localStorage.getItem('childToken');
                              const r = await fetch(`/uploads/${encodeURIComponent(a.id)}`, { method: 'DELETE', headers: { Authorization: tok ? `Bearer ${tok}` : '' } });
                              if (r.ok || r.status === 404) {
                                setAvatarUploads((prev) => prev.filter((x) => x.id !== a.id));
                                if (selectedAvatarId === a.id) { setSelectedAvatarId(null); setSelectedAvatarUrl(null); }
                              } else { try { push('error', 'Delete failed'); } catch {} }
                            }}
                          >×</button>
                        </div>
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
                            setSelectedAvatarId(key);
                            
                            setSelectedAvatarUrl(url);
                            setAvatarFile(null);
                          } catch (e) { try { push('error', 'Upload failed'); } catch {} }
                        }}>Upload</button>
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
                          <div key={patt.id} className="position-relative d-inline-block">
                            <button type="button" className="btn btn-outline-secondary" onClick={() => {
                              if (child?.id) {
                                localStorage.setItem(`child_pattern_id_${child.id}`, patt.id);
                                localStorage.setItem(`child_pattern_${child.id}`, patt.url);
                              }
                              document.documentElement.style.setProperty('--pattern-image', `url("${patt.url}")`);
                              document.body.classList.add('cute-bg-on');
                              setCuteBg(true);
                            }}>
                              <img src={serveImgUrl(patt.url)} alt="uploaded pattern" style={{ width: 28, height: 28 }} />
                            </button>
                            <button
                              type="button"
                              className="btn btn-danger btn-sm position-absolute top-0 end-0 p-0 lh-1"
                              style={{ width: 16, height: 16, fontSize: 10, transform: 'translate(40%,-40%)', zIndex: 1 }}
                              title="Delete"
                              onClick={async () => {
                                const tok = localStorage.getItem('childToken');
                                const r = await fetch(`/uploads/${encodeURIComponent(patt.id)}`, { method: 'DELETE', headers: { Authorization: tok ? `Bearer ${tok}` : '' } });
                                if (r.ok || r.status === 404) {
                                  setPatternUploads((prev) => prev.filter((x) => x.id !== patt.id));
                                  if (child?.id) {
                                    if (localStorage.getItem(`child_pattern_id_${child.id}`) === patt.id) {
                                      localStorage.removeItem(`child_pattern_id_${child.id}`);
                                      localStorage.removeItem(`child_pattern_${child.id}`);
                                    }
                                  }
                                } else { try { push('error', 'Delete failed'); } catch {} }
                              }}
                            >×</button>
                          </div>
                        ))}
                        <div className="d-flex align-items-center gap-2">
                          <input
                          id="prof-pattern-upload"
                          type="file"
                          accept="image/svg+xml"
                          className="form-control"
                          style={{ maxWidth: 420 }}
                          onChange={(ev) => {
                            const f = (ev.target as HTMLInputElement).files?.[0] || null;
                            dbg('pattern:file:change', f ? { name: f.name, type: f.type, size: f.size } : 'none');
                            setPatternFile(f);
                          }}
                        />
                          <button
                            type="button"
                            className="btn btn-primary"
                            disabled={!patternFile}
                            onClick={async () => {
                              const f = patternFile; if (!f) { dbg('pattern:upload:cancel', 'no file'); return; }
                              if (f.type && f.type !== 'image/svg+xml') { dbg('pattern:upload:blocked', { type: f.type }); push('error', 'Only SVG backgrounds are allowed'); return; }
                              try {
                                dbg('pattern:upload:start', { name: f.name, type: f.type });
                                const { key, url } = await uploadToS3('patterns', f);
                                dbg('pattern:upload:done', { key });
                                setPatternUploads((prev) => [{ id: key, url }, ...prev]);
                                if (child?.id) { localStorage.setItem(`child_pattern_id_${child.id}`, key); localStorage.setItem(`child_pattern_${child.id}`, url); }
                                document.documentElement.style.setProperty('--pattern-image', `url("${url}")`);
                                document.body.classList.add('cute-bg-on');
                                setCuteBg(true);
                                setPatternFile(null);
                              } catch (e) { dbg('pattern:upload:error', String(e)); try { push('error', 'Upload failed'); } catch {} }
                            }}
                          >Upload</button>
                        </div>
                        <div className="row g-2 w-100 mt-1">
                          <div className="col-12 col-md-6">
                            <label className="form-label">Pattern size</label>
                            <input
                              id="prof-pattern-size"
                              type="range"
                              min={40}
                              max={320}
                              defaultValue={(() => { try { return (localStorage.getItem(child ? `child_pattern_size_${child.id}` : '') || '120px').replace('px',''); } catch { return '120'; } })()}
                              className="form-range"
                              onChange={(e) => {
                                const val = `${(e.target as HTMLInputElement).value}px`;
                                document.documentElement.style.setProperty('--pattern-size', val);
                                try { if (child?.id) localStorage.setItem(`child_pattern_size_${child.id}`, val); } catch {}
                              }}
                            />
                          </div>
                        

                          <div className="col-12 col-md-6">
                            <label className="form-label">Pattern transparency</label>
                            <input
                              id="prof-pattern-opacity"
                              type="range"
                              min={0}
                              max={100}
                              defaultValue={(() => { try { const v = localStorage.getItem(child ? `child_pattern_opacity_${child.id}` : ''); return v ? String(Math.round(parseFloat(v) * 100)) : '15'; } catch { return '15'; } })()}
                              className="form-range"
                              onChange={(e) => {
                                const frac = Math.max(0, Math.min(1, parseInt((e.target as HTMLInputElement).value, 10) / 100));
                                document.documentElement.style.setProperty('--pattern-opacity', String(frac));
                                try { if (child?.id) localStorage.setItem(`child_pattern_opacity_${child.id}`, String(frac)); } catch {}
                              }}
                            />
                          </div></div>
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
                      const tok = localStorage.getItem('childToken'); dbg('upload:auth', { hasToken: !!tok });
                      const nameEl = document.getElementById('prof-name') as HTMLInputElement | null;
                      const colorEl = document.getElementById('prof-color') as HTMLInputElement | null;
                      const name = nameEl ? nameEl.value : (child?.displayName || '');
                      const color = colorEl ? colorEl.value : (child?.themeColor || '#7C5CFC');
                      dbg('save:payload', { name, color, selectedAvatarId, selectedAvatarUrl });
                                            try {
                        dbg('save:fetch');
                        const r = await fetch(`/children/${cid}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: tok ? `Bearer ${tok}` : '' }, body: JSON.stringify({ displayName: name, themeColor: color, avatarImageId: selectedAvatarId || undefined, avatarUrl: selectedAvatarId ? undefined : (selectedAvatarUrl || null) }) });
                        dbg('save:response', r.status);
                        if (r.ok) {
                          const updated = await r.json(); dbg('save:success', updated);
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
                          const e = await r.json().catch(() => ({})); dbg('save:error', e);
                          push('error', e?.error || 'Update failed');
                        }
                      } catch (err) { dbg('save:exception', String(err)); push('error', 'Update failed'); }
                    }}>Save changes</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      
      </div>
    </div>
  );
}
