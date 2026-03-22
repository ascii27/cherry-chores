import React, { useEffect, useMemo, useState, useCallback } from 'react';
import '../styles/app-theme.css';
import { playCoinSound } from '../coinSound';
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
  const [section, setSection] = useState<'home' | 'shop' | 'bank' | 'profile'>('home');
  const [catalog, setCatalog] = useState<any[]>([]);
  const [purchasing, setPurchasing] = useState<string | null>(null); // item id being confirmed
  const [buyConfirmItem, setBuyConfirmItem] = useState<any | null>(null);
  const [shopSearch, setShopSearch] = useState('');
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
        // Fetch bonuses + my own claims
        try {
          const bonusToken = localStorage.getItem('childToken');
          const [rBonuses, rClaims] = await Promise.all([
            fetch(`/api/families/${data.familyId}/bonuses`, { headers: { Authorization: bonusToken ? `Bearer ${bonusToken}` : '' } }),
            fetch(`/api/children/${data.id}/bonus-claims`, { headers: { Authorization: bonusToken ? `Bearer ${bonusToken}` : '' } }),
          ]);
          setBonuses(rBonuses.ok ? await rBonuses.json() : []);
          setMyBonusClaims(rClaims.ok ? await rClaims.json() : []);
        } catch { setBonuses([]); setMyBonusClaims([]); }
        try {
          const tok2 = localStorage.getItem('childToken');
          const rCatalog = await fetch(`/api/families/${data.familyId}/catalog`, { headers: { Authorization: tok2 ? `Bearer ${tok2}` : '' } });
          setCatalog(rCatalog.ok ? await rCatalog.json() : []);
        } catch { setCatalog([]); }
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
        onLogout={() => { try { document.cookie = 'auth=; Path=/; Max-Age=0'; } catch {}; localStorage.removeItem('childToken'); nav('/'); }}
      />
      <Celebration trigger={celebrate} />
      <CoinBurst trigger={coinBurst} />
      {/* Buy confirmation modal */}
      {buyConfirmItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 20, padding: 28, maxWidth: 360, width: '100%', textAlign: 'center' }}>
            {buyConfirmItem.imageUrl && (
              <img src={buyConfirmItem.imageUrl} alt={buyConfirmItem.name} style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 12, marginBottom: 16 }} />
            )}
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{buyConfirmItem.name}</div>
            <div style={{ color: 'var(--text-muted)', marginBottom: 16 }}>
              Buy for <strong style={{ color: '#F59E0B' }}>{buyConfirmItem.priceCoins} 🪙</strong>?<br />
              You have <strong>{balance?.available ?? 0} 🪙</strong>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                className="btn btn-outline-secondary"
                style={{ flex: 1, height: 48 }}
                onClick={() => setBuyConfirmItem(null)}
              >Cancel</button>
              <button
                className="btn btn-warning"
                style={{ flex: 1, height: 48, fontWeight: 700 }}
                disabled={purchasing === buyConfirmItem.id}
                onClick={async () => {
                  const item = buyConfirmItem;
                  setPurchasing(item.id);
                  const tok = localStorage.getItem('childToken');
                  try {
                    const r = await fetch(`/api/catalog/${item.id}/buy`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: tok ? `Bearer ${tok}` : '' },
                    });
                    if (r.ok) {
                      const data = await r.json();
                      setBalance(data.balance.balance ?? data.balance);
                      setBuyConfirmItem(null);
                      setCoinBurst((n) => n + 1);
                      push('success', `Purchased! Tell a parent to deliver it 🎉`);
                      // Refresh balance/ledger
                      const cid = child?.id;
                      if (cid) {
                        const rb = await fetch(`/bank/${cid}`);
                        if (rb.ok) { const b = await rb.json(); setBalance(b.balance); setLedger(b.entries || []); }
                      }
                    } else {
                      const err = await r.json().catch(() => ({}));
                      push('error', err?.error || 'Purchase failed');
                    }
                  } catch { push('error', 'Purchase failed'); }
                  finally { setPurchasing(null); }
                }}
              >Buy Now! 🛍️</button>
            </div>
          </div>
        </div>
      )}
      <div className="container py-4">
        {section === 'home' && (
          <React.Fragment>
            {/* ── Shop Hero Card ── */}
            {(() => {
              const avail = balance?.available ?? 0;
              const todayEarnable = today
                .filter((t: any) => !t.status || t.status === 'due' || t.status === 'planned' || t.status === 'missed')
                .reduce((s: number, t: any) => s + (t.value || 0), 0);
              const activeGoals = savers.filter((s) => s.isGoal && !s.completed);
              // Find goal closest to being affordable (highest avail/target ratio)
              const topGoal = activeGoals.sort((a, b) => (avail / b.target) - (avail / a.target))[0] ?? null;

              if (activeGoals.length === 0) {
                return (
                  <div className="goal-hero-empty">
                    <strong>Pick something to save for! 🛍️</strong>
                    <div>Go to the Shop tab and tap "Save for this" on any item.</div>
                    {todayEarnable > 0 && <div>You can earn {todayEarnable} 🪙 today!</div>}
                  </div>
                );
              }
              if (avail >= topGoal.target) {
                return (
                  <div className="goal-hero goal-hero-complete">
                    <div className="goal-hero-inner">
                      <div className="goal-hero-img">
                        {topGoal.imageUrl ? <img src={topGoal.imageUrl} alt={topGoal.name} /> : '🛍️'}
                      </div>
                      <div className="goal-hero-info">
                        <div className="goal-hero-label">You can buy it!</div>
                        <div className="goal-hero-name">{topGoal.name}</div>
                        <div className="goal-hero-meta"><span>{topGoal.target} 🪙</span></div>
                        <button className="quest-done-btn mt-1" style={{ fontSize: 14, padding: '6px 14px' }} onClick={() => setSection('shop')}>Go to Shop 🛍️</button>
                      </div>
                    </div>
                  </div>
                );
              }
              const pct = Math.min(100, Math.round((avail / topGoal.target) * 100));
              const coinsToGo = Math.max(0, topGoal.target - avail);
              return (
                <div className="goal-hero">
                  <div className="goal-hero-inner">
                    <div className="goal-hero-img">
                      {topGoal.imageUrl ? <img src={topGoal.imageUrl} alt={topGoal.name} /> : '🛍️'}
                    </div>
                    <div className="goal-hero-info">
                      <div className="goal-hero-label">Saving for</div>
                      <div className="goal-hero-name">{topGoal.name}</div>
                      <div className="goal-hero-bar-track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${pct}% saved`}>
                        <div className="goal-hero-bar-fill" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="goal-hero-meta">
                        <span><strong>{avail}</strong> / {topGoal.target} coins</span>
                        <span>·</span>
                        <span><strong>{coinsToGo}</strong> to go</span>
                      </div>
                      {activeGoals.length > 1 && <div className="goal-hero-earn">+{activeGoals.length - 1} more goal{activeGoals.length > 2 ? 's' : ''}</div>}
                      {todayEarnable > 0 && (
                        <div className="goal-hero-earn">✨ Earn {todayEarnable} 🪙 today!</div>
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
                        <div className="quest-name">
                          {t.emoji && <span style={{ marginRight: 6, fontSize: '1.2em' }}>{t.emoji}</span>}
                          {t.name}
                        </div>
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
                              playCoinSound();
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
            {/* ── Inline Bonus Quests ── */}
            {bonuses.filter((b) => b.active).length > 0 && (
              <div className="bonus-quests-section mt-3">
                <h3 className="h6 mb-2">⭐ Bonus Quests</h3>
                {bonuses.filter((b) => b.active).map((bonus: any) => {
                  const myPending = myBonusClaims.find((cl) => cl.bonusId === bonus.id && (cl.status === 'pending' || cl.status === 'approved'));
                  const alreadyClaimed = bonus.claimType === 'one-time' && !!myPending;
                  return (
                    <div key={bonus.id} className="bonus-quest-card">
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600 }}>{bonus.name}</div>
                        {bonus.description && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{bonus.description}</div>}
                      </div>
                      <span className="quest-coins"><GoldCoin size={16} />{bonus.value}</span>
                      {claimingBonusId === bonus.id ? (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <input
                            className="form-control form-control-sm"
                            style={{ width: 160 }}
                            placeholder="What did you do?"
                            value={claimNote}
                            onChange={(e) => setClaimNote(e.target.value)}
                            autoFocus
                          />
                          <button className="btn btn-sm btn-primary" onClick={async () => {
                            const tok = localStorage.getItem('childToken');
                            const r = await fetch(`/api/bonuses/${bonus.id}/claim`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: tok ? `Bearer ${tok}` : '' }, body: JSON.stringify({ note: claimNote || undefined }) });
                            if (r.ok) {
                              const claim = await r.json();
                              setMyBonusClaims((prev) => [claim, ...prev]);
                              setClaimingBonusId(null); setClaimNote('');
                              push('success', 'Bonus claimed! Waiting for parent approval.');
                              const rBonuses = await fetch(`/api/families/${child?.familyId}/bonuses`, { headers: { Authorization: tok ? `Bearer ${tok}` : '' } });
                              if (rBonuses.ok) setBonuses(await rBonuses.json());
                            } else if (r.status === 409) {
                              push('error', 'Already submitted — waiting for approval!');
                              setClaimingBonusId(null); setClaimNote('');
                            } else {
                              push('error', 'Claim failed. Please try again.');
                            }
                          }}>Submit</button>
                          <button className="btn btn-sm btn-outline-secondary" onClick={() => { setClaimingBonusId(null); setClaimNote(''); }}>✕</button>
                        </div>
                      ) : alreadyClaimed ? (
                        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Claimed ✓</span>
                      ) : (
                        <button className="quest-done-btn" style={{ fontSize: 13, padding: '6px 14px' }} onClick={() => { setClaimingBonusId(bonus.id); setClaimNote(''); }}>Claim</button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </React.Fragment>
        )}

      {/* Section: Shop */}
      {section === 'shop' && (
        <div className="mt-2">
          <h2 className="h5 mb-3">🛍️ Shop</h2>

          {/* ── Saving For ── */}
          {(() => {
            const avail = balance?.available ?? 0;
            const activeGoals = savers
              .filter((s) => s.isGoal && !s.completed)
              .sort((a, b) => (avail / b.target) - (avail / a.target)); // closest to affordable first
            if (activeGoals.length === 0) return null;
            return (
              <div className="mb-4">
                <h3 className="h6 mb-2">⭐ Saving For</h3>
                <div className="shop-grid">
                  {activeGoals.map((saver: any) => {
                    const pct = Math.min(100, Math.round((avail / saver.target) * 100));
                    const canAfford = avail >= saver.target;
                    const catalogItem = catalog.find((c) => c.id === saver.catalogItemId);
                    return (
                      <div key={saver.id} className="shop-card shop-card--goal">
                        {saver.imageUrl ? (
                          <img src={saver.imageUrl} alt={saver.name} className="shop-card-img" />
                        ) : (
                          <div className="shop-card-img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48, background: 'var(--surface-2)' }}>⭐</div>
                        )}
                        <div className="shop-card-body">
                          <div className="shop-card-name">{saver.name}</div>
                          <div className="shop-card-price"><GoldCoin size={18} /> {saver.target}</div>
                          {catalogItem?.sourceUrl && (
                            <a href={catalogItem.sourceUrl} target="_blank" rel="noopener noreferrer" className="shop-card-link">🔗 View item</a>
                          )}
                          {canAfford ? (
                            catalogItem ? (
                              <button className="shop-buy-btn" onClick={() => setBuyConfirmItem(catalogItem)}>Buy Now! 🛍️</button>
                            ) : (
                              <div className="shop-progress-label" style={{ color: 'var(--accent)' }}>✅ Ready to buy!</div>
                            )
                          ) : (
                            <div>
                              <div className="shop-progress-track">
                                <div className="shop-progress-fill" style={{ width: `${pct}%` }} />
                              </div>
                              <div className="shop-progress-label">{pct}% saved · {Math.max(0, saver.target - avail)} to go 🪙</div>
                            </div>
                          )}
                          <button
                            className="btn btn-link btn-sm p-0 mt-1"
                            style={{ fontSize: 11, color: 'var(--text-3)' }}
                            onClick={async () => {
                              const token = localStorage.getItem('childToken') ?? '';
                              await fetch(`/savers/${saver.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
                              setSavers((prev) => prev.filter((s) => s.id !== saver.id));
                            }}
                          >Remove goal</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* ── Browse Catalog ── */}
          {catalog.filter((i) => i.active).length === 0 ? (
            <div className="goal-hero-empty">
              <strong>The shop is empty right now!</strong>
              Ask your parent to add some items 🛍️
            </div>
          ) : (
            <>
              <div className="mb-3">
                <input
                  type="search"
                  className="form-control"
                  placeholder="🔍 Search items..."
                  value={shopSearch}
                  onChange={(e) => setShopSearch(e.target.value)}
                />
              </div>
              <div className="shop-grid">
                {catalog
                  .filter((i) => i.active)
                  .filter((i) => !shopSearch || i.name.toLowerCase().includes(shopSearch.toLowerCase()) || (i.description || '').toLowerCase().includes(shopSearch.toLowerCase()))
                  .map((item: any) => {
                    const avail = balance?.available ?? 0;
                    const canAfford = avail >= item.priceCoins;
                    const coinsNeeded = item.priceCoins - avail;
                    const existingSaver = savers.find((s) => s.catalogItemId === item.id && s.isGoal && !s.completed);
                    return (
                      <div key={item.id} className="shop-card">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} className="shop-card-img" />
                        ) : (
                          <div className="shop-card-img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48, background: 'var(--surface-2)' }}>🛍️</div>
                        )}
                        <div className="shop-card-body">
                          <div className="shop-card-name">{item.name}</div>
                          {item.description && <div className="shop-card-desc">{item.description}</div>}
                          <div className="shop-card-price"><GoldCoin size={18} /> {item.priceCoins}</div>
                          {item.sourceUrl && (
                            <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="shop-card-link">🔗 View item</a>
                          )}
                          {canAfford ? (
                            <button className="shop-buy-btn" onClick={() => setBuyConfirmItem(item)}>Buy Now! 🛍️</button>
                          ) : existingSaver ? (
                            <div className="shop-progress-label" style={{ color: 'var(--accent)' }}>⭐ Saving for this</div>
                          ) : (
                            <div>
                              <div className="shop-progress-track">
                                <div className="shop-progress-fill" style={{ width: `${Math.min(100, Math.round((avail / item.priceCoins) * 100))}%` }} />
                              </div>
                              <div className="shop-progress-label">Need {coinsNeeded} more 🪙</div>
                              <button
                                className="btn btn-outline-primary btn-sm w-100 mt-2"
                                style={{ fontSize: 12 }}
                                onClick={async () => {
                                  const token = localStorage.getItem('childToken') ?? '';
                                  const r = await fetch(`/children/${child!.id}/savers`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                    body: JSON.stringify({ name: item.name, description: item.description, imageUrl: item.imageUrl, target: item.priceCoins, catalogItemId: item.id }),
                                  });
                                  if (r.ok) {
                                    const saver = await r.json();
                                    setSavers((prev) => [...prev, saver]);
                                  }
                                }}
                              >⭐ Save for this</button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Section: Bank Account */}
      {section === 'bank' && (
        <div className="mt-2">
          <div className="treasure-chest-hero">
            <div className="treasure-chest-icon">💰</div>
            <div className="treasure-chest-amount">{balance?.available ?? 0}</div>
            <div className="treasure-chest-label">coins available</div>
          </div>
          <h3 className="h6 mt-4 mb-2">Recent Activity</h3>
          {ledger.length === 0 ? (
            <div className="text-muted small">No activity yet.</div>
          ) : (
            <div className="ledger-list">
              {ledger.slice(0, 10).map((e) => {
                const when = e.createdAt ? new Date(e.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '';
                const label = e.note || (e.type === 'payout' ? 'Payout' : e.type === 'spend' ? 'Spend' : 'Bonus');
                return (
                  <div key={e.id} className="ledger-item">
                    <span className={`ledger-amount ${e.amount >= 0 ? 'positive' : 'negative'}`}>
                      {e.amount >= 0 ? '+' : ''}{e.amount}
                    </span>
                    <span className="ledger-label">{label}</span>
                    <span className="ledger-date">{when}</span>
                  </div>
                );
              })}
            </div>
          )}
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

      {/* Bottom Tab Navigation */}
      <nav className="kid-bottom-nav" aria-label="Main navigation">
        <button className={`kid-tab${section === 'home' ? ' active' : ''}`} onClick={() => setSection('home')}>
          <span className="kid-tab-icon">⚔️</span>
          <span className="kid-tab-label">Quests</span>
        </button>
        <button className={`kid-tab${section === 'shop' ? ' active' : ''}`} onClick={() => setSection('shop')}>
          <span className="kid-tab-icon">🛍️</span>
          <span className="kid-tab-label">Shop</span>
        </button>
        <button className={`kid-tab${section === 'bank' ? ' active' : ''}`} onClick={() => setSection('bank')}>
          <span className="kid-tab-icon">💰</span>
          <span className="kid-tab-label">Coins</span>
        </button>
        <button className={`kid-tab${section === 'profile' ? ' active' : ''}`} onClick={() => setSection('profile')}>
          <span className="kid-tab-icon">🎮</span>
          <span className="kid-tab-label">Me</span>
        </button>
      </nav>
    </div>
  );
}
