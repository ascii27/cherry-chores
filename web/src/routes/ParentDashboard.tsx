import React, { useEffect, useMemo, useRef, useState } from 'react';
import '../styles/app-theme.css';
import { useToast } from '../components/Toast';
import { useNavigate, useLocation } from 'react-router-dom';
import TopBar from '../components/TopBar';

// Types for bonus/activity features
interface Bonus { id: string; familyId: string; name: string; description?: string; value: number; claimType: 'one-time' | 'unlimited'; childIds?: string[]; active: boolean; createdAt: string; }
interface BonusClaim { id: string; bonusId: string; childId: string; note?: string; status: 'pending' | 'approved' | 'rejected'; rejectionReason?: string; createdAt: string; resolvedAt?: string; resolvedBy?: string; }
interface ActivityEntry { id: string; familyId: string; childId: string; eventType: string; actorId?: string; actorRole?: string; refId?: string; amount?: number; note?: string; createdAt: string; }

export default function ParentDashboard() {
  const nav = useNavigate();
  const loc = useLocation();
  const [token, setToken] = useState<string | null>(null);
  const [families, setFamilies] = useState<any[]>([]);
  const [selectedFamily, setSelectedFamily] = useState<any | null>(null);
  const [children, setChildren] = useState<any[]>([]);
  const [parents, setParents] = useState<any[]>([]);
  const [me, setMe] = useState<{ id: string; email: string; name?: string } | null>(null);
  const [chores, setChores] = useState<any[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [editingChore, setEditingChore] = useState<any | null>(null);
  const [bulk, setBulk] = useState<{ [id: string]: boolean }>({});
  const [weeklyByChild, setWeeklyByChild] = useState<Record<string, any>>({});
  const [balances, setBalances] = useState<Record<string, { available: number; reserved: number }>>({});
  const [payoutBusy, setPayoutBusy] = useState(false);
  const [apiTokens, setApiTokens] = useState<Array<{ id: string; label?: string; createdAt: string; lastUsedAt?: string; expiresAt?: string | null }>>([]);
  const [newTokenLabel, setNewTokenLabel] = useState('');
  const [newTokenValue, setNewTokenValue] = useState<string | null>(null);
  const { push } = useToast();
  const [saversByChild, setSaversByChild] = useState<Record<string, any[]>>({});
  const [weekDayIndex, setWeekDayIndex] = useState(0); // mobile pager for Week Overview
  const [detailsOpen, setDetailsOpen] = useState<Record<string, boolean>>({}); // mobile accordion for Week Details
  const hashToken = useMemo(() => new URLSearchParams(loc.hash.replace(/^#/, '')).get('token'), [loc.hash]);
  const addChildRef = useRef<HTMLDivElement | null>(null);
  const familyRef = useRef<HTMLDivElement | null>(null);
  const childrenRef = useRef<HTMLDivElement | null>(null);
  const choresRef = useRef<HTMLDivElement | null>(null);
  const approvalsRef = useRef<HTMLDivElement | null>(null);
  const weekOverviewRef = useRef<HTMLDivElement | null>(null);
  const weekDetailsRef = useRef<HTMLDivElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // Bonus state
  const [bonuses, setBonuses] = useState<Bonus[]>([]);
  const [bonusClaims, setBonusClaims] = useState<BonusClaim[]>([]);
  const [showAddBonus, setShowAddBonus] = useState(false);
  const [editingBonus, setEditingBonus] = useState<Bonus | null>(null);
  const [approvalsTab, setApprovalsTab] = useState<'chores' | 'bonuses' | 'shop'>('chores');
  const [rejectingClaimId, setRejectingClaimId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Activity feed state
  const [activityFeed, setActivityFeed] = useState<ActivityEntry[]>([]);
  const bonusesRef = useRef<HTMLDivElement | null>(null);
  const activityRef = useRef<HTMLDivElement | null>(null);
  const catalogRef = useRef<HTMLDivElement | null>(null);

  // Catalog state
  const [catalogItems, setCatalogItems] = useState<any[]>([]);
  const [catalogPurchases, setCatalogPurchases] = useState<any[]>([]);
  const [catalogPreviewUrl, setCatalogPreviewUrl] = useState('');
  const [catalogPreview, setCatalogPreview] = useState<any | null>(null);
  const [catalogPreviewLoading, setCatalogPreviewLoading] = useState(false);
  const [catalogAddName, setCatalogAddName] = useState('');
  const [catalogAddDesc, setCatalogAddDesc] = useState('');
  const [catalogAddImage, setCatalogAddImage] = useState('');
  const [catalogAddPrice, setCatalogAddPrice] = useState('');
  const [catalogSaving, setCatalogSaving] = useState(false);

  useEffect(() => {
    document.body.classList.add('arcade-body');
    return () => document.body.classList.remove('arcade-body');
  }, []);

  useEffect(() => {
    const t = hashToken || localStorage.getItem('parentToken');
    if (t) {
      setToken(t);
      localStorage.setItem('parentToken', t);
    } else {
      nav('/');
    }
  }, [hashToken, nav]);

  useEffect(() => {
    if (!token) return;
    fetch('/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((p) => setMe(p))
      .catch(() => setMe(null));
    fetch('/families', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => {
        setFamilies(list || []);
        setSelectedFamily(list?.[0] || null);
      })
      .catch(() => setFamilies([]));
    // Load API tokens
    fetch('/tokens', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => setApiTokens(list || []))
      .catch(() => setApiTokens([]));
  }, [token]);

  // Load core lists when token or selected family changes
  useEffect(() => {
    if (!token || !selectedFamily) return;
    fetch(`/families/${selectedFamily.id}/children`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => setChildren(list || []))
      .catch(() => setChildren([]));
    fetch(`/families/${selectedFamily.id}/parents`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => setParents(list || []))
      .catch(() => setParents([]));
    const hdrs = { Authorization: `Bearer ${token}` } as any;
    fetch(`/chores?familyId=${selectedFamily.id}`, { headers: hdrs })
      .then((r) => (r.ok ? r.json() : []))
      .then(setChores)
      .catch(() => setChores([]));
    fetch(`/approvals?familyId=${selectedFamily.id}`, { headers: hdrs })
      .then((r) => (r.ok ? r.json() : []))
      .then(setApprovals)
      .catch(() => setApprovals([]));
    fetch(`/api/families/${selectedFamily.id}/bonuses`, { headers: hdrs })
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => setBonuses(list || []))
      .catch(() => setBonuses([]));
    fetch(`/api/families/${selectedFamily.id}/bonuses/claims/pending`, { headers: hdrs })
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => setBonusClaims(list || []))
      .catch(() => setBonusClaims([]));
    fetch(`/api/families/${selectedFamily.id}/activity?limit=20`, { headers: hdrs })
      .then((r) => (r.ok ? r.json() : { entries: [] }))
      .then((data) => setActivityFeed(data?.entries || []))
      .catch(() => setActivityFeed([]));
    fetch(`/api/families/${selectedFamily.id}/catalog`, { headers: hdrs })
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => setCatalogItems(list || []))
      .catch(() => setCatalogItems([]));
    fetch(`/api/families/${selectedFamily.id}/catalog/purchases`, { headers: hdrs })
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => setCatalogPurchases(list || []))
      .catch(() => setCatalogPurchases([]));
  }, [token, selectedFamily]);

  // Derive weekly/balances/savers when children list changes
  useEffect(() => {
    if (!token || !selectedFamily) return;
    (async () => {
      const map: Record<string, any> = {};
      const bal: Record<string, { available: number; reserved: number }> = {};
      const sav: Record<string, any[]> = {};
      for (const c of children) {
        try {
          const rw = await fetch(`/children/${c.id}/chores/week`);
          map[c.id] = rw.ok ? await rw.json() : null;
          const rb = await fetch(`/bank/${c.id}`);
          if (rb.ok) {
            const data = await rb.json();
            bal[c.id] = data.balance;
          }
          const rs = await fetch(`/children/${c.id}/savers`, { headers: { Authorization: `Bearer ${token}` } });
          sav[c.id] = rs.ok ? await rs.json() : [];
        } catch {}
      }
      setWeeklyByChild(map);
      setBalances(bal);
      setSaversByChild(sav);
    })();
  }, [token, selectedFamily, children]);

  const handleCreateFamily = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!token) return;
    const name = (e.currentTarget.querySelector('#famName') as HTMLInputElement).value;
    const tz = (e.currentTarget.querySelector('#famTz') as HTMLInputElement).value;
    const res = await fetch('/families', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name, timezone: tz })
    });
    if (res.ok) {
      const fam = await res.json();
      setFamilies((prev) => [...prev, fam]);
      setSelectedFamily(fam);
    }
  };

  async function refreshChores() {
    if (!token || !selectedFamily) return;
    const r = await fetch(`/chores?familyId=${selectedFamily.id}`, { headers: { Authorization: `Bearer ${token}` } });
    if (r.ok) setChores(await r.json());
  }

  async function refreshApprovals() {
    if (!token || !selectedFamily) return;
    const r = await fetch(`/approvals?familyId=${selectedFamily.id}`, { headers: { Authorization: `Bearer ${token}` } });
    if (r.ok) setApprovals(await r.json());
  }

  async function refreshBonuses() {
    if (!token || !selectedFamily) return;
    const hdrs = { Authorization: `Bearer ${token}` };
    const r = await fetch(`/api/families/${selectedFamily.id}/bonuses`, { headers: hdrs });
    if (r.ok) setBonuses(await r.json());
  }

  async function refreshBonusClaims() {
    if (!token || !selectedFamily) return;
    const hdrs = { Authorization: `Bearer ${token}` };
    const r = await fetch(`/api/families/${selectedFamily.id}/bonuses/claims/pending`, { headers: hdrs });
    if (r.ok) setBonusClaims(await r.json());
  }

  async function refreshActivity() {
    if (!token || !selectedFamily) return;
    const hdrs = { Authorization: `Bearer ${token}` };
    const r = await fetch(`/api/families/${selectedFamily.id}/activity?limit=20`, { headers: hdrs });
    if (r.ok) {
      const data = await r.json();
      setActivityFeed(data?.entries || []);
    }
  }

  function formatRelativeTime(dateStr: string): string {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diff = Math.floor((now - then) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 172800) return 'yesterday';
    return new Date(dateStr).toLocaleDateString();
  }

  function activityIcon(eventType: string): string {
    const map: Record<string, string> = {
      chore_completed: '✅',
      chore_approved: '⭐',
      chore_rejected: '❌',
      bonus_claimed: '🎁',
      bonus_approved: '🎉',
      bonus_rejected: '❌',
      payout: '💰',
      adjustment: '🔧',
      spend: '🛒',
      purchase: '🛍️',
    };
    return map[eventType] || '📌';
  }

  function activityDescription(entry: ActivityEntry, childrenList: any[]): string {
    const childName = childrenList.find((c) => c.id === entry.childId)?.displayName || 'A child';
    switch (entry.eventType) {
      case 'chore_completed': return `${childName} completed a chore`;
      case 'chore_approved': return `${childName}'s chore was approved`;
      case 'chore_rejected': return `${childName}'s chore was rejected`;
      case 'bonus_claimed': return `${childName} claimed a bonus`;
      case 'bonus_approved': return `${childName}'s bonus was approved (+${entry.amount ?? 0} coins)`;
      case 'bonus_rejected': return `${childName}'s bonus was rejected`;
      case 'payout': return `Payout — ${childName} received ${entry.amount ?? 0} coins`;
      case 'adjustment': return `Balance adjustment for ${childName}: ${(entry.amount ?? 0) > 0 ? '+' : ''}${entry.amount ?? 0} coins`;
      case 'spend': return `${childName} spent ${entry.amount ?? 0} coins`;
      case 'purchase': return `${childName} made a purchase (${entry.amount ?? 0} coins)`;
      default: return `${childName} — ${entry.eventType}`;
    }
  }

  async function refreshWeekly() {
    const map: Record<string, any> = {};
    const bal: Record<string, { available: number; reserved: number }> = {};
    const sav: Record<string, any[]> = {};
    for (const c of children) {
      try {
        const rw = await fetch(`/children/${c.id}/chores/week`);
        map[c.id] = rw.ok ? await rw.json() : null;
        const rb = await fetch(`/bank/${c.id}`);
        if (rb.ok) {
          const data = await rb.json();
          bal[c.id] = data.balance;
        }
        const rs = await fetch(`/children/${c.id}/savers`, { headers: { Authorization: `Bearer ${token}` } });
        sav[c.id] = rs.ok ? await rs.json() : [];
      } catch {}
    }
    setWeeklyByChild(map);
    setBalances(bal);
    setSaversByChild(sav);
  }

  const handleAddCoParent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!token || !selectedFamily) return;
    const email = (e.currentTarget.querySelector('#coEmail') as HTMLInputElement).value;
    await fetch(`/families/${selectedFamily.id}/parents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ email })
    });
  };

  const handleAddChild = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!token || !selectedFamily) return;
    const username = (e.currentTarget.querySelector('#childUser') as HTMLInputElement).value;
    const password = (e.currentTarget.querySelector('#childPw') as HTMLInputElement).value;
    const displayName = (e.currentTarget.querySelector('#childName') as HTMLInputElement).value;
    await fetch('/children', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ familyId: selectedFamily.id, username, password, displayName })
    });
    // refresh list
    const r = await fetch(`/families/${selectedFamily.id}/children`, { headers: { Authorization: `Bearer ${token}` } });
    if (r.ok) setChildren(await r.json());
    (e.currentTarget.querySelector('#childUser') as HTMLInputElement).value = '';
    (e.currentTarget.querySelector('#childPw') as HTMLInputElement).value = '';
    (e.currentTarget.querySelector('#childName') as HTMLInputElement).value = '';
  };

  const handleRenameChild = async (id: string) => {
    if (!token) return;
    const current = children.find((c) => c.id === id);
    const next = window.prompt('New display name', current?.displayName || '');
    if (!next) return;
    await fetch(`/children/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ displayName: next })
    });
    const r = await fetch(`/families/${selectedFamily!.id}/children`, { headers: { Authorization: `Bearer ${token}` } });
    if (r.ok) setChildren(await r.json());
  };

  const handleDeleteChild = async (id: string) => {
    if (!token) return;
    if (!window.confirm('Delete this child? This action cannot be undone.')) return;
    await fetch(`/children/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    setChildren((prev) => prev.filter((c) => c.id !== id));
  };

  async function runPayout() {
    if (!token || !selectedFamily) return;
    setPayoutBusy(true);
    try {
      const res = await fetch('/bank/payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ familyId: selectedFamily.id })
      });
      if (!res.ok) {
        try { const err = await res.json(); push('error', err?.error || 'Payout failed'); } catch { push('error', 'Payout failed'); }
      } else {
        push('success', 'Payout complete for this week');
        await refreshWeekly();
      }
    } finally {
      setPayoutBusy(false);
    }
  }

  return (
    <div className="arcade-app">
      <TopBar
        name={me?.name || me?.email || 'Parent'}
        avatar={null}
        onMenuToggle={() => setMenuOpen(true)}
        onLogout={async () => { try { await fetch('/auth/logout', { method: 'POST' }); } catch {}; localStorage.removeItem('parentToken'); nav('/'); }}
      />

      {/* Off-canvas drawer */}
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
        <nav className="nav flex-column" aria-label="Sections">
          {[
            { label: 'Family', ref: familyRef },
            { label: 'Add child', ref: addChildRef },
            { label: 'Children', ref: childrenRef },
            { label: 'Chores', ref: choresRef },
            { label: 'Bonuses', ref: bonusesRef },
            { label: 'Shop Catalog', ref: catalogRef },
            { label: 'Approvals', ref: approvalsRef },
            { label: 'Week Overview', ref: weekOverviewRef },
            { label: 'Week Details', ref: weekDetailsRef },
            { label: 'Activity', ref: activityRef }
          ].map((it) => (
            <button
              key={it.label}
              className="btn btn-outline-secondary text-start mb-2 touch-target"
              onClick={() => { it.ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); setMenuOpen(false); }}
            >
              {it.label}
            </button>
          ))}
          <button
            className="btn btn-outline-secondary text-start mb-2 touch-target"
            onClick={() => { nav('/settings'); setMenuOpen(false); }}
          >
            Settings
          </button>
        </nav>
      </aside>

      <div className="container py-4" style={{ paddingBottom: 120 }}>
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h1 className="h3 mb-0">Parent Dashboard</h1>
        </div>
      {families.length === 0 ? (
        <div className="card">
          <div className="card-body">
            <h2 className="h5">Create your family</h2>
            <form className="row g-3" onSubmit={handleCreateFamily}>
              <div className="col-md-6">
                <label htmlFor="famName" className="form-label">Family name</label>
                <input id="famName" className="form-control" placeholder="The Cherries" />
              </div>
              <div className="col-md-6">
                <label htmlFor="famTz" className="form-label">Timezone</label>
                <input id="famTz" className="form-control" placeholder="America/Los_Angeles" defaultValue="UTC" />
              </div>
              <div className="col-12">
                <button className="btn btn-primary" type="submit">Create family</button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <div className="row g-4">
          <div className="col-md-6">
          <div className="card h-100" ref={familyRef}>
            <div className="card-body">
              <h2 className="h5">Family</h2>
              <p className="mb-1"><strong>Name:</strong> {selectedFamily?.name}</p>
              <p className="mb-3"><strong>Timezone:</strong> {selectedFamily?.timezone}</p>
              <div className="mb-3">
                <button
                  className="btn btn-sm btn-outline-primary"
                  type="button"
                  disabled={payoutBusy || !selectedFamily}
                  onClick={runPayout}
                >
                  {payoutBusy ? 'Paying…' : 'Run payout for this week'}
                </button>
              </div>
              <h3 className="h6">Parents</h3>
                {parents.length === 0 ? (
                  <div className="text-muted mb-3">No parents yet.</div>
                ) : (
                  <ul className="list-unstyled small mb-3">
                    {parents.map((p) => (
                      <li key={p.id} className="d-flex justify-content-between align-items-center">
                        <span>{p.name || p.email} <span className="text-muted">({p.email})</span></span>
                        {me?.id !== p.id && (
                          <button
                            className="btn btn-sm btn-outline-danger"
                            type="button"
                            onClick={async () => {
                              if (!window.confirm('Remove this co-parent?')) return;
                              await fetch(`/families/${selectedFamily!.id}/parents/${p.id}`, {
                                method: 'DELETE',
                                headers: { Authorization: `Bearer ${token}` }
                              });
                              const r = await fetch(`/families/${selectedFamily!.id}/parents`, { headers: { Authorization: `Bearer ${token}` } });
                              if (r.ok) setParents(await r.json());
                            }}
                          >
                            Remove
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                <h3 className="h6">Add co-parent</h3>
                <form className="d-flex gap-2 flex-column flex-sm-row" onSubmit={handleAddCoParent}>
                  <input id="coEmail" type="email" className="form-control" placeholder="parent2@example.com" />
                  <button className="btn btn-outline-primary" type="submit">Add</button>
                </form>
              </div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="card h-100" ref={addChildRef}>
              <div className="card-body">
                <h2 className="h5">Add child</h2>
                <form className="row g-2" onSubmit={handleAddChild}>
                  <div className="col-12">
                    <label htmlFor="childName" className="form-label">Display name</label>
                    <input id="childName" className="form-control" />
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="childUser" className="form-label">Username</label>
                    <input id="childUser" className="form-control" />
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="childPw" className="form-label">Password</label>
                    <input id="childPw" type="password" className="form-control" />
                  </div>
                  <div className="col-12">
                    <button className="btn btn-success" type="submit">Add child</button>
                  </div>
                </form>
              </div>
            </div>
        </div>
          <div className="col-md-6">
            <div className="card h-100">
              <div className="card-body">
                <h2 className="h5">API Tokens</h2>
                <p className="text-muted small">Create long-lived tokens for integrations like Alexa. Keep them secret.</p>
                <form className="d-flex gap-2 align-items-end mb-3" onSubmit={async (e) => {
                  e.preventDefault();
                  if (!token) return;
                  const res = await fetch('/tokens', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ label: newTokenLabel || undefined }) });
                  if (res.ok) {
                    const rec = await res.json();
                    setNewTokenValue(rec.token);
                    setNewTokenLabel('');
                    const list = await fetch('/tokens', { headers: { Authorization: `Bearer ${token}` } });
                    setApiTokens(list.ok ? await list.json() : []);
                  }
                }}>
                  <div className="flex-grow-1">
                    <label htmlFor="tokLabel" className="form-label">Label</label>
                    <input id="tokLabel" className="form-control" placeholder="Alexa" value={newTokenLabel} onChange={(e)=>setNewTokenLabel(e.target.value)} />
                  </div>
                  <button className="btn btn-outline-primary" type="submit">Create</button>
                </form>
                {newTokenValue && (
                  <div className="alert alert-warning d-flex justify-content-between align-items-center">
                    <div>
                      <div className="fw-semibold">New token</div>
                      <code>{newTokenValue}</code>
                      <div className="small text-muted">Copy and store this token now. It won't be shown again.</div>
                    </div>
                    <button className="btn btn-sm btn-outline-secondary" onClick={() => { navigator.clipboard?.writeText(newTokenValue!); }}>Copy</button>
                  </div>
                )}
                {apiTokens.length === 0 ? (
                  <div className="text-muted small">No tokens yet.</div>
                ) : (
                  <ul className="list-unstyled mb-0 small">
                    {apiTokens.map((t) => (
                      <li key={t.id} className="d-flex justify-content-between align-items-center border-bottom py-2">
                        <div>
                          <div className="fw-medium">{t.label || 'Unnamed token'}</div>
                          <div className="text-muted">Created {new Date(t.createdAt).toLocaleString()}{t.lastUsedAt ? ` • Last used ${new Date(t.lastUsedAt).toLocaleString()}` : ''}</div>
                        </div>
                        <button className="btn btn-sm btn-outline-danger" onClick={async () => {
                          if (!token) return;
                          if (!window.confirm('Revoke this token?')) return;
                          await fetch(`/tokens/${t.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
                          const list = await fetch('/tokens', { headers: { Authorization: `Bearer ${token}` } });
                          setApiTokens(list.ok ? await list.json() : []);
                        }}>Revoke</button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
          <div className="col-12">
            <div className="card" ref={childrenRef}>
              <div className="card-body">
                <h2 className="h5">Children</h2>
                {/* Children: mobile cards (small) and table (md+) */}
                {children.length === 0 ? (
                  <div className="text-muted">No children yet.</div>
                ) : (
                  <>
                    {/* Mobile: stacked cards */}
                    <section className="d-block d-md-none" style={{ contentVisibility: 'auto' as any }}>
                      {children.map((c) => (
                        <div key={`child-card-${c.id}`} className="card mb-2 shadow-sm">
                          <div className="card-body">
                            <div className="d-flex justify-content-between align-items-start">
                              <div>
                                <div className="fw-semibold text-anywhere">{c.displayName}</div>
                                <div className="text-muted small">@{c.username}</div>
                              </div>
                              <span className="small fw-medium">Total: {(balances[c.id]?.available ?? 0) + (balances[c.id]?.reserved ?? 0)}</span>
                            </div>
                            <div className="row row-cols-2 g-2 small mt-2">
                              <div><span className="text-muted">Available</span> <span>{balances[c.id]?.available ?? 0}</span></div>
                              <div><span className="text-muted">Allocated</span> <span>{balances[c.id]?.reserved ?? 0}</span></div>
                            </div>
                            <form className="row row-cols-2 g-2 mt-2" onSubmit={(e)=>e.preventDefault()}>
                              <div className="col-12">
                                <input id={`adj-${c.id}`} type="number" className="form-control form-control-sm" defaultValue={1} />
                              </div>
                              <div className="col-6 d-grid">
                                <button
                                  className="btn btn-outline-success btn-sm"
                                  type="button"
                                  onClick={async () => {
                                    if (!token) return;
                                    const amt = parseInt((document.getElementById(`adj-${c.id}`) as HTMLInputElement).value || '0', 10);
                                    if (!amt) return;
                                    const r = await fetch(`/bank/${c.id}/adjust`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ amount: Math.abs(amt), note: 'credit' }) });
                                    if (r.ok) push('success', `Credited ${Math.abs(amt)} to ${c.displayName}`); else push('error', 'Credit failed');
                                    await refreshWeekly();
                                  }}
                                >+ Credit</button>
                              </div>
                              <div className="col-6 d-grid">
                                <button
                                  className="btn btn-outline-danger btn-sm"
                                  type="button"
                                  onClick={async () => {
                                    if (!token) return;
                                    const amt = parseInt((document.getElementById(`adj-${c.id}`) as HTMLInputElement).value || '0', 10);
                                    if (!amt) return;
                                    const r = await fetch(`/bank/${c.id}/adjust`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ amount: -Math.abs(amt), note: 'debit' }) });
                                    if (r.ok) push('success', `Debited ${Math.abs(amt)} from ${c.displayName}`); else push('error', 'Debit failed');
                                    await refreshWeekly();
                                  }}
                                >- Debit</button>
                              </div>
                              <div className="col-6 d-grid">
                                <button className="btn btn-outline-secondary btn-sm" type="button" onClick={() => handleRenameChild(c.id)}>Rename</button>
                              </div>
                              <div className="col-6 d-grid">
                                <button className="btn btn-outline-secondary btn-sm text-danger" type="button" onClick={() => handleDeleteChild(c.id)}>Delete</button>
                              </div>
                            </form>
                          </div>
                        </div>
                      ))}
                    </section>
                    {/* Desktop: table */}
                    <div className="d-none d-md-block table-responsive">
                      <table className="table align-middle">
                      <thead>
                        <tr>
                          <th scope="col">Display name</th>
                          <th scope="col">Username</th>
                          <th scope="col">Total</th>
                          <th scope="col">Goals</th>
                          <th scope="col" className="text-end">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {children.map((c) => (
                          <tr key={c.id}>
                            <td>{c.displayName}</td>
                            <td className="text-muted">{c.username}</td>
                            <td>
                              <div className="d-flex flex-column gap-1">
                                <div><span className="badge bg-light text-dark">{(balances[c.id]?.available ?? 0) + (balances[c.id]?.reserved ?? 0)}</span> <span className="text-muted small">total</span></div>
                                <div className="small text-muted">Available: {balances[c.id]?.available ?? 0} • Allocated: {balances[c.id]?.reserved ?? 0}</div>
                              </div>
                              <form
                                className="d-flex gap-2 align-items-stretch align-items-sm-center flex-column flex-sm-row mt-2"
                                onSubmit={(e) => e.preventDefault()}
                              >
                                <input id={`adj-${c.id}`} type="number" className="form-control form-control-sm w-100 w-sm-auto" defaultValue={1} />
                                <button
                                  className="btn btn-sm btn-outline-success"
                                  type="button"
                                  onClick={async () => {
                                    if (!token) return;
                                    const amt = parseInt((document.getElementById(`adj-${c.id}`) as HTMLInputElement).value || '0', 10);
                                    if (!amt) return;
                                    const r = await fetch(`/bank/${c.id}/adjust`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ amount: Math.abs(amt), note: 'credit' }) });
                                    if (r.ok) push('success', `Credited ${Math.abs(amt)} to ${c.displayName}`); else push('error', 'Credit failed');
                                    await refreshWeekly();
                                  }}
                                >+ Credit</button>
                                <button
                                  className="btn btn-sm btn-outline-danger"
                                  type="button"
                                  onClick={async () => {
                                    if (!token) return;
                                    const amt = parseInt((document.getElementById(`adj-${c.id}`) as HTMLInputElement).value || '0', 10);
                                    if (!amt) return;
                                    const r = await fetch(`/bank/${c.id}/adjust`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ amount: -Math.abs(amt), note: 'debit' }) });
                                    if (r.ok) push('success', `Debited ${Math.abs(amt)} from ${c.displayName}`); else push('error', 'Debit failed');
                                    await refreshWeekly();
                                  }}
                                >- Debit</button>
                              </form>
                            </td>
                            <td>
                              <div className="small">
                                {(saversByChild[c.id] || []).length === 0 ? (
                                  <span className="text-muted">No items</span>
                                ) : (
                                  <ul className="list-unstyled mb-0">
                                    {(saversByChild[c.id] || []).filter((s) => !s.completed).map((s) => (
                                      <li key={s.id}>
                                        <span className="fw-semibold">{s.name}</span>
                                        <span className="text-muted"> — saved {s.reserved || 0} / {s.target}</span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            </td>
                            <td className="text-end">
                              <button className="btn btn-sm btn-outline-secondary me-2" type="button" onClick={() => handleRenameChild(c.id)}>Rename</button>
                              <button className="btn btn-sm btn-outline-danger" type="button" onClick={() => handleDeleteChild(c.id)}>Delete</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="col-12">
            <div className="card" ref={choresRef}>
              <div className="card-body">
                <h2 className="h5">Chores</h2>
                {/* Chores form: single column on small; chips wrap */}
                <form
                  className="row g-2 mb-3"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!token || !selectedFamily) return;
                    const name = (e.currentTarget.querySelector('#ch-name') as HTMLInputElement).value;
                    const valueStr = (e.currentTarget.querySelector('#ch-value') as HTMLInputElement).value;
                    const recurrence = (e.currentTarget.querySelector('#ch-recurrence') as HTMLSelectElement).value;
                    const dueDayStr = (e.currentTarget.querySelector('#ch-dueDay') as HTMLSelectElement).value;
                    const requiresApproval = (e.currentTarget.querySelector('#ch-req') as HTMLInputElement).checked;
                    const assignedIds: string[] = Array.from(e.currentTarget.querySelectorAll('input[name="assignChild"]:checked')).map((i: any) => i.value);
                    const payload = {
                      familyId: selectedFamily.id,
                      name,
                      value: parseInt(valueStr || '0', 10),
                      recurrence,
                      dueDay: recurrence === 'weekly' ? parseInt(dueDayStr || '0', 10) : undefined,
                      requiresApproval,
                      assignedChildIds: assignedIds,
                      active: true
                    };
                    await fetch('/chores', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                      body: JSON.stringify(payload)
                    });
                    const r = await fetch(`/chores?familyId=${selectedFamily.id}`, { headers: { Authorization: `Bearer ${token}` } });
                    if (r.ok) setChores(await r.json());
                    (e.currentTarget as HTMLFormElement).reset();
                    await refreshWeekly();
                  }}
                >
                  <div className="col-md-4">
                    <label htmlFor="ch-name" className="form-label">Name</label>
                    <input id="ch-name" className="form-control" required />
                  </div>
                  <div className="col-md-2">
                    <label htmlFor="ch-value" className="form-label">Value</label>
                    <input id="ch-value" type="number" min="0" className="form-control" defaultValue={1} required />
                  </div>
                  <div className="col-md-3">
                    <label htmlFor="ch-recurrence" className="form-label">Recurrence</label>
                    <select id="ch-recurrence" className="form-select" defaultValue="daily" onChange={(ev) => {
                      const sel = (ev.target as HTMLSelectElement).value;
                      const dd = document.getElementById('ch-dueDay') as HTMLSelectElement;
                      if (dd) dd.disabled = sel !== 'weekly';
                    }}>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                    </select>
                  </div>
                  <div className="col-md-3">
                    <label htmlFor="ch-dueDay" className="form-label">Due Day</label>
                    <select id="ch-dueDay" className="form-select" defaultValue="0" disabled>
                      <option value="0">Sunday</option>
                      <option value="1">Monday</option>
                      <option value="2">Tuesday</option>
                      <option value="3">Wednesday</option>
                      <option value="4">Thursday</option>
                      <option value="5">Friday</option>
                      <option value="6">Saturday</option>
                    </select>
                  </div>
                  <div className="col-12">
                    <div className="form-check form-switch">
                      <input id="ch-req" type="checkbox" className="form-check-input" />
                      <label className="form-check-label" htmlFor="ch-req">Requires approval</label>
                    </div>
                  </div>
                  <div className="col-12">
                    <label className="form-label">Assign to</label>
                    <div className="d-flex flex-wrap gap-3">
                      {children.map((c) => (
                        <div className="form-check" key={c.id}>
                          <input className="form-check-input" type="checkbox" name="assignChild" id={`ass-${c.id}`} value={c.id} />
                          <label className="form-check-label" htmlFor={`ass-${c.id}`}>{c.displayName}</label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="col-12">
                    <button className="btn btn-primary" type="submit">Add chore</button>
                  </div>
                </form>
                {editingChore && (
                  <form
                    className="row g-2 mb-3 border-top pt-3"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!token || !selectedFamily) return;
                      const name = (e.currentTarget.querySelector('#edit-name') as HTMLInputElement).value;
                      const valueStr = (e.currentTarget.querySelector('#edit-value') as HTMLInputElement).value;
                      const recurrence = (e.currentTarget.querySelector('#edit-recurrence') as HTMLSelectElement).value;
                      const dueDayStr = (e.currentTarget.querySelector('#edit-dueDay') as HTMLSelectElement).value;
                      const requiresApproval = (e.currentTarget.querySelector('#edit-req') as HTMLInputElement).checked;
                      const assignedIds: string[] = Array.from(e.currentTarget.querySelectorAll('input[name="editAssignChild"]:checked')).map((i: any) => i.value);
                      const payload: any = {
                        name,
                        value: parseInt(valueStr || '0', 10),
                        recurrence,
                        dueDay: recurrence === 'weekly' ? parseInt(dueDayStr || '0', 10) : undefined,
                        requiresApproval,
                        assignedChildIds: assignedIds
                      };
                      await fetch(`/chores/${editingChore.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify(payload)
                      });
                      setEditingChore(null);
                      await refreshChores();
                      await refreshWeekly();
                    }}
                  >
                    <div className="col-12">
                      <h3 className="h6">Edit chore</h3>
                    </div>
                    <div className="col-md-4">
                      <label htmlFor="edit-name" className="form-label">Name</label>
                      <input id="edit-name" className="form-control" defaultValue={editingChore?.name} required />
                    </div>
                    <div className="col-md-2">
                      <label htmlFor="edit-value" className="form-label">Value</label>
                      <input id="edit-value" type="number" min="0" className="form-control" defaultValue={editingChore?.value ?? 1} required />
                    </div>
                    <div className="col-md-3">
                      <label htmlFor="edit-recurrence" className="form-label">Recurrence</label>
                      <select id="edit-recurrence" className="form-select" defaultValue={editingChore?.recurrence || 'daily'} onChange={(ev) => {
                        const sel = (ev.target as HTMLSelectElement).value;
                        const dd = document.getElementById('edit-dueDay') as HTMLSelectElement;
                        if (dd) dd.disabled = sel !== 'weekly';
                      }}>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                      </select>
                    </div>
                    <div className="col-md-3">
                      <label htmlFor="edit-dueDay" className="form-label">Due Day</label>
                      <select id="edit-dueDay" className="form-select" defaultValue={String(editingChore?.dueDay ?? 0)} disabled={editingChore?.recurrence !== 'weekly'}>
                        <option value="0">Sunday</option>
                        <option value="1">Monday</option>
                        <option value="2">Tuesday</option>
                        <option value="3">Wednesday</option>
                        <option value="4">Thursday</option>
                        <option value="5">Friday</option>
                        <option value="6">Saturday</option>
                      </select>
                    </div>
                    <div className="col-12">
                      <div className="form-check form-switch">
                        <input id="edit-req" type="checkbox" className="form-check-input" defaultChecked={!!editingChore?.requiresApproval} />
                        <label className="form-check-label" htmlFor="edit-req">Requires approval</label>
                      </div>
                    </div>
                    <div className="col-12">
                      <label className="form-label">Assign to</label>
                      <div className="d-flex flex-wrap gap-3">
                        {children.map((c) => (
                          <div className="form-check" key={c.id}>
                            <input className="form-check-input" type="checkbox" name="editAssignChild" id={`edit-ass-${c.id}`} value={c.id} defaultChecked={editingChore?.assignedChildIds?.includes(c.id)} />
                            <label className="form-check-label" htmlFor={`edit-ass-${c.id}`}>{c.displayName}</label>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="col-12 d-flex gap-2">
                      <button className="btn btn-success" type="submit">Save</button>
                      <button className="btn btn-outline-secondary" type="button" onClick={() => setEditingChore(null)}>Cancel</button>
                    </div>
                  </form>
                )}
                {/* Chores: mobile cards (small) and table (md+) */}
                {chores.length === 0 ? (
                  <div className="text-muted">No chores yet.</div>
                ) : (
                  <>
                    {/* Mobile: chore cards */}
                    <div className="d-block d-md-none" style={{ contentVisibility: 'auto' as any }}>
                      {chores.map((h) => {
                        const assigned = children.filter((c) => h.assignedChildIds?.includes(c.id)).map((c) => c.displayName).join(', ') || '-';
                        return (
                          <div key={`ch-card-${h.id}`} className="card mb-2">
                            <div className="card-body">
                              <div className="d-flex justify-content-between align-items-start">
                                <div className="fw-semibold text-anywhere">{h.name}</div>
                                <span className="badge bg-light text-dark">+{h.value}</span>
                              </div>
                              <div className="text-muted small mt-1">{h.recurrence === 'weekly' ? `Weekly (${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][h.dueDay ?? 0]})` : 'Daily'}</div>
                              <div className="text-muted small mt-1">Assigned: <span className="text-anywhere">{assigned}</span></div>
                              <div className="d-flex align-items-center gap-2 mt-2">
                                <div className="form-check form-switch m-0">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    id={`active-m-${h.id}`}
                                    defaultChecked={h.active !== false}
                                    onChange={async (e) => {
                                      await fetch(`/chores/${h.id}`, {
                                        method: 'PATCH',
                                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                        body: JSON.stringify({ active: e.target.checked })
                                      });
                                      await refreshChores();
                                    }}
                                  />
                                  <label className="form-check-label small" htmlFor={`active-m-${h.id}`}>Active</label>
                                </div>
                                <button className="btn btn-sm btn-outline-secondary" type="button" onClick={() => setEditingChore(h)}>Edit</button>
                                <button className="btn btn-sm btn-outline-danger" type="button" onClick={async () => {
                                  if (!window.confirm('Delete this chore?')) return;
                                  await fetch(`/chores/${h.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
                                  setChores((prev) => prev.filter((x) => x.id !== h.id));
                                  await refreshWeekly();
                                }}>Delete</button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {/* Desktop: table */}
                    <div className="d-none d-md-block table-responsive">
                      <table className="table align-middle">
                      <thead>
                        <tr>
                          <th scope="col">Name</th>
                          <th scope="col">Recurrence</th>
                          <th scope="col">Value</th>
                          <th scope="col">Assigned</th>
                          <th scope="col" className="text-end">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {chores.map((h) => (
                          <tr key={h.id}>
                            <td>{h.name}</td>
                            <td className="text-muted">{h.recurrence === 'weekly' ? `Weekly (${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][h.dueDay ?? 0]})` : 'Daily'}</td>
                            <td>{h.value}</td>
                            <td className="text-muted">{children.filter((c) => h.assignedChildIds?.includes(c.id)).map((c) => c.displayName).join(', ') || '-'}</td>
                            <td className="text-end">
                              <div className="form-check form-switch d-inline-block me-2">
                                <input
                                  className="form-check-input"
                                  type="checkbox"
                                  id={`active-${h.id}`}
                                  defaultChecked={h.active !== false}
                                  onChange={async (e) => {
                                    await fetch(`/chores/${h.id}`, {
                                      method: 'PATCH',
                                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                      body: JSON.stringify({ active: e.target.checked })
                                    });
                                    await refreshChores();
                                  }}
                                />
                                <label className="form-check-label small" htmlFor={`active-${h.id}`}>Active</label>
                              </div>
                              <button
                                className="btn btn-sm btn-outline-secondary me-2"
                                type="button"
                                onClick={() => setEditingChore(h)}
                              >
                                Edit
                              </button>
                              <button
                                className="btn btn-sm btn-outline-danger"
                                type="button"
                                onClick={async () => {
                                  if (!window.confirm('Delete this chore?')) return;
                                  await fetch(`/chores/${h.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
                                  setChores((prev) => prev.filter((x) => x.id !== h.id));
                                  await refreshWeekly();
                                }}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          {/* Bonuses Section */}
          <div className="col-12">
            <div className="card" ref={bonusesRef}>
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h2 className="h5 mb-0">Bonuses</h2>
                  {!showAddBonus && !editingBonus && (
                    <button className="btn btn-outline-primary btn-sm" onClick={() => setShowAddBonus(true)}>+ Add Bonus</button>
                  )}
                </div>

                {/* Add Bonus Form */}
                {showAddBonus && (
                  <form
                    className="row g-2 mb-3 border rounded p-3"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!token || !selectedFamily) return;
                      const form = e.currentTarget;
                      const name = (form.querySelector('#bonus-name') as HTMLInputElement).value;
                      const description = (form.querySelector('#bonus-desc') as HTMLInputElement).value;
                      const value = parseInt((form.querySelector('#bonus-value') as HTMLInputElement).value || '0', 10);
                      const claimType = (form.querySelector('input[name="bonus-claim-type"]:checked') as HTMLInputElement)?.value as 'one-time' | 'unlimited';
                      const childIds: string[] = Array.from(form.querySelectorAll('input[name="bonus-child"]:checked')).map((i: any) => i.value);
                      const payload = { name, description: description || undefined, value, claimType, childIds: childIds.length > 0 ? childIds : undefined, active: true };
                      const r = await fetch(`/api/families/${selectedFamily.id}/bonuses`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify(payload),
                      });
                      if (r.ok) {
                        push('success', 'Bonus created');
                        setShowAddBonus(false);
                        await refreshBonuses();
                      } else {
                        push('error', 'Failed to create bonus');
                      }
                    }}
                  >
                    <div className="col-12"><h3 className="h6 mb-2">New Bonus</h3></div>
                    <div className="col-md-5">
                      <label htmlFor="bonus-name" className="form-label">Name <span className="text-danger">*</span></label>
                      <input id="bonus-name" className="form-control" required />
                    </div>
                    <div className="col-md-5">
                      <label htmlFor="bonus-desc" className="form-label">Description</label>
                      <input id="bonus-desc" className="form-control" placeholder="Optional" />
                    </div>
                    <div className="col-md-2">
                      <label htmlFor="bonus-value" className="form-label">Coins <span className="text-danger">*</span></label>
                      <input id="bonus-value" type="number" min="1" className="form-control" defaultValue={5} required />
                    </div>
                    <div className="col-12">
                      <label className="form-label">Claim type</label>
                      <div className="d-flex gap-3">
                        <div className="form-check">
                          <input className="form-check-input" type="radio" name="bonus-claim-type" id="bct-onetime" value="one-time" defaultChecked />
                          <label className="form-check-label" htmlFor="bct-onetime">One-time</label>
                        </div>
                        <div className="form-check">
                          <input className="form-check-input" type="radio" name="bonus-claim-type" id="bct-unlimited" value="unlimited" />
                          <label className="form-check-label" htmlFor="bct-unlimited">Unlimited</label>
                        </div>
                      </div>
                    </div>
                    <div className="col-12">
                      <label className="form-label">Assign to (leave unchecked for all children)</label>
                      <div className="d-flex flex-wrap gap-3">
                        {children.map((c) => (
                          <div className="form-check" key={c.id}>
                            <input className="form-check-input" type="checkbox" name="bonus-child" id={`bonus-ch-${c.id}`} value={c.id} />
                            <label className="form-check-label" htmlFor={`bonus-ch-${c.id}`}>{c.displayName}</label>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="col-12 d-flex gap-2">
                      <button className="btn btn-primary" type="submit">Save Bonus</button>
                      <button className="btn btn-outline-secondary" type="button" onClick={() => setShowAddBonus(false)}>Cancel</button>
                    </div>
                  </form>
                )}

                {/* Edit Bonus Form */}
                {editingBonus && (
                  <form
                    className="row g-2 mb-3 border rounded p-3"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!token || !editingBonus) return;
                      const form = e.currentTarget;
                      const name = (form.querySelector('#edit-bonus-name') as HTMLInputElement).value;
                      const description = (form.querySelector('#edit-bonus-desc') as HTMLInputElement).value;
                      const value = parseInt((form.querySelector('#edit-bonus-value') as HTMLInputElement).value || '0', 10);
                      const claimType = (form.querySelector('input[name="edit-bonus-claim-type"]:checked') as HTMLInputElement)?.value as 'one-time' | 'unlimited';
                      const childIds: string[] = Array.from(form.querySelectorAll('input[name="edit-bonus-child"]:checked')).map((i: any) => i.value);
                      const payload = { name, description: description || undefined, value, claimType, childIds: childIds.length > 0 ? childIds : undefined };
                      const r = await fetch(`/api/bonuses/${editingBonus.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify(payload),
                      });
                      if (r.ok) {
                        push('success', 'Bonus updated');
                        setEditingBonus(null);
                        await refreshBonuses();
                      } else {
                        push('error', 'Failed to update bonus');
                      }
                    }}
                  >
                    <div className="col-12"><h3 className="h6 mb-2">Edit Bonus</h3></div>
                    <div className="col-md-5">
                      <label htmlFor="edit-bonus-name" className="form-label">Name</label>
                      <input id="edit-bonus-name" className="form-control" defaultValue={editingBonus.name} required />
                    </div>
                    <div className="col-md-5">
                      <label htmlFor="edit-bonus-desc" className="form-label">Description</label>
                      <input id="edit-bonus-desc" className="form-control" defaultValue={editingBonus.description || ''} />
                    </div>
                    <div className="col-md-2">
                      <label htmlFor="edit-bonus-value" className="form-label">Coins</label>
                      <input id="edit-bonus-value" type="number" min="1" className="form-control" defaultValue={editingBonus.value} required />
                    </div>
                    <div className="col-12">
                      <label className="form-label">Claim type</label>
                      <div className="d-flex gap-3">
                        <div className="form-check">
                          <input className="form-check-input" type="radio" name="edit-bonus-claim-type" id="ebct-onetime" value="one-time" defaultChecked={editingBonus.claimType === 'one-time'} />
                          <label className="form-check-label" htmlFor="ebct-onetime">One-time</label>
                        </div>
                        <div className="form-check">
                          <input className="form-check-input" type="radio" name="edit-bonus-claim-type" id="ebct-unlimited" value="unlimited" defaultChecked={editingBonus.claimType === 'unlimited'} />
                          <label className="form-check-label" htmlFor="ebct-unlimited">Unlimited</label>
                        </div>
                      </div>
                    </div>
                    <div className="col-12">
                      <label className="form-label">Assign to (leave unchecked for all children)</label>
                      <div className="d-flex flex-wrap gap-3">
                        {children.map((c) => (
                          <div className="form-check" key={c.id}>
                            <input className="form-check-input" type="checkbox" name="edit-bonus-child" id={`ebc-${c.id}`} value={c.id} defaultChecked={editingBonus.childIds?.includes(c.id)} />
                            <label className="form-check-label" htmlFor={`ebc-${c.id}`}>{c.displayName}</label>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="col-12 d-flex gap-2">
                      <button className="btn btn-primary" type="submit">Save</button>
                      <button className="btn btn-outline-secondary" type="button" onClick={() => setEditingBonus(null)}>Cancel</button>
                    </div>
                  </form>
                )}

                {bonuses.length === 0 && !showAddBonus && !editingBonus ? (
                  <div className="text-muted">No bonuses yet. Add one to reward kids for extra effort!</div>
                ) : (
                  <>
                    {/* Mobile cards */}
                    <div className="d-block d-md-none">
                      {bonuses.map((b) => (
                        <div key={b.id} className="card mb-2 shadow-sm">
                          <div className="card-body">
                            <div className="d-flex justify-content-between align-items-start gap-2">
                              <div className="flex-grow-1">
                                <div className="fw-semibold">{b.name}</div>
                                {b.description && <div className="text-muted small">{b.description}</div>}
                                <div className="d-flex gap-2 mt-1 flex-wrap">
                                  <span className="badge bg-light text-dark">+{b.value} coins</span>
                                  <span className="badge bg-info text-dark">{b.claimType === 'one-time' ? 'One-time' : 'Unlimited'}</span>
                                  {!b.active && <span className="badge bg-secondary">Inactive</span>}
                                </div>
                              </div>
                            </div>
                            <div className="d-flex align-items-center gap-2 mt-2 flex-wrap">
                              <div className="form-check form-switch m-0">
                                <input
                                  className="form-check-input"
                                  type="checkbox"
                                  id={`bonus-active-m-${b.id}`}
                                  defaultChecked={b.active}
                                  onChange={async (ev) => {
                                    await fetch(`/api/bonuses/${b.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ active: ev.target.checked }) });
                                    await refreshBonuses();
                                  }}
                                />
                                <label className="form-check-label small" htmlFor={`bonus-active-m-${b.id}`}>Active</label>
                              </div>
                              <button className="btn btn-sm btn-outline-secondary" onClick={() => { setEditingBonus(b); setShowAddBonus(false); }}>Edit</button>
                              <button className="btn btn-sm btn-outline-danger" onClick={async () => {
                                if (!window.confirm('Delete this bonus?')) return;
                                await fetch(`/api/bonuses/${b.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
                                setBonuses((prev) => prev.filter((x) => x.id !== b.id));
                              }}>Delete</button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Desktop table */}
                    <div className="d-none d-md-block table-responsive">
                      <table className="table align-middle">
                        <thead>
                          <tr>
                            <th scope="col">Name</th>
                            <th scope="col">Value</th>
                            <th scope="col">Type</th>
                            <th scope="col">Assigned</th>
                            <th scope="col" className="text-end">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bonuses.map((b) => (
                            <tr key={b.id}>
                              <td>
                                <div className="fw-semibold">{b.name}</div>
                                {b.description && <div className="small text-muted">{b.description}</div>}
                              </td>
                              <td><span className="badge bg-light text-dark">+{b.value}</span></td>
                              <td><span className="badge bg-info text-dark">{b.claimType === 'one-time' ? 'One-time' : 'Unlimited'}</span></td>
                              <td className="text-muted small">{b.childIds && b.childIds.length > 0 ? children.filter((c) => b.childIds!.includes(c.id)).map((c) => c.displayName).join(', ') : 'All children'}</td>
                              <td className="text-end">
                                <div className="form-check form-switch d-inline-block me-2">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    id={`bonus-active-${b.id}`}
                                    defaultChecked={b.active}
                                    onChange={async (ev) => {
                                      await fetch(`/api/bonuses/${b.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ active: ev.target.checked }) });
                                      await refreshBonuses();
                                    }}
                                  />
                                  <label className="form-check-label small" htmlFor={`bonus-active-${b.id}`}>Active</label>
                                </div>
                                <button className="btn btn-sm btn-outline-secondary me-2" onClick={() => { setEditingBonus(b); setShowAddBonus(false); }}>Edit</button>
                                <button className="btn btn-sm btn-outline-danger" onClick={async () => {
                                  if (!window.confirm('Delete this bonus?')) return;
                                  await fetch(`/api/bonuses/${b.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
                                  setBonuses((prev) => prev.filter((x) => x.id !== b.id));
                                }}>Delete</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Shop Catalog Section */}
          <div className="col-12">
            <div className="card" ref={catalogRef}>
              <div className="card-body">
                <h2 className="h5 mb-3">🛍️ Shop Catalog</h2>

                {/* URL Preview Form */}
                <div className="mb-4">
                  <h3 className="h6 mb-2">Add via URL</h3>
                  <div className="d-flex gap-2 mb-2">
                    <input
                      type="url"
                      className="form-control"
                      placeholder="Paste a product URL (Amazon, Target, etc.)"
                      value={catalogPreviewUrl}
                      onChange={(e) => setCatalogPreviewUrl(e.target.value)}
                    />
                    <button
                      className="btn btn-outline-primary"
                      disabled={!catalogPreviewUrl || catalogPreviewLoading}
                      onClick={async () => {
                        setCatalogPreviewLoading(true);
                        setCatalogPreview(null);
                        try {
                          const r = await fetch(`/api/families/${selectedFamily?.id}/catalog/preview`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                            body: JSON.stringify({ url: catalogPreviewUrl }),
                          });
                          const data = await r.json();
                          if (r.ok) {
                            setCatalogPreview(data);
                            setCatalogAddName(data.title || '');
                            setCatalogAddDesc(data.description || '');
                            setCatalogAddImage(data.imageUrl || '');
                          } else {
                            alert(data?.error || 'Preview failed');
                          }
                        } catch { alert('Preview failed'); }
                        finally { setCatalogPreviewLoading(false); }
                      }}
                    >{catalogPreviewLoading ? '...' : 'Preview'}</button>
                  </div>

                  {catalogPreview && (
                    <div className="card bg-light mb-3">
                      <div className="card-body">
                        <div className="d-flex gap-3 align-items-start">
                          {catalogPreview.imageUrl && (
                            <img src={catalogPreview.imageUrl} alt="preview" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
                          )}
                          <div className="flex-grow-1">
                            <div className="mb-2">
                              <label className="form-label small mb-1">Name</label>
                              <input className="form-control form-control-sm" value={catalogAddName} onChange={(e) => setCatalogAddName(e.target.value)} />
                            </div>
                            <div className="mb-2">
                              <label className="form-label small mb-1">Description (AI-generated)</label>
                              <textarea className="form-control form-control-sm" rows={2} value={catalogAddDesc} onChange={(e) => setCatalogAddDesc(e.target.value)} />
                            </div>
                            <div className="mb-2">
                              <label className="form-label small mb-1">Image URL</label>
                              <input className="form-control form-control-sm" value={catalogAddImage} onChange={(e) => setCatalogAddImage(e.target.value)} />
                            </div>
                            <div className="mb-2">
                              <label className="form-label small mb-1">Price (coins)</label>
                              <input type="number" min={1} className="form-control form-control-sm" style={{ maxWidth: 120 }} value={catalogAddPrice} onChange={(e) => setCatalogAddPrice(e.target.value)} />
                            </div>
                            <div className="d-flex gap-2">
                              <button
                                className="btn btn-primary btn-sm"
                                disabled={!catalogAddName || !catalogAddPrice || catalogSaving}
                                onClick={async () => {
                                  setCatalogSaving(true);
                                  try {
                                    const r = await fetch(`/api/families/${selectedFamily?.id}/catalog`, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                      body: JSON.stringify({ name: catalogAddName, description: catalogAddDesc || undefined, imageUrl: catalogAddImage || undefined, priceCoins: parseInt(catalogAddPrice, 10), sourceUrl: catalogPreview.sourceUrl || undefined }),
                                    });
                                    if (r.ok) {
                                      const created = await r.json();
                                      setCatalogItems((prev) => [created, ...prev]);
                                      setCatalogPreview(null); setCatalogPreviewUrl(''); setCatalogAddName(''); setCatalogAddDesc(''); setCatalogAddImage(''); setCatalogAddPrice('');
                                    } else { const e = await r.json().catch(() => ({})); alert(e?.error || 'Save failed'); }
                                  } catch { alert('Save failed'); }
                                  finally { setCatalogSaving(false); }
                                }}
                              >{catalogSaving ? 'Saving...' : 'Save to Catalog'}</button>
                              <button className="btn btn-outline-secondary btn-sm" onClick={() => { setCatalogPreview(null); setCatalogPreviewUrl(''); }}>Cancel</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Catalog Items List */}
                <h3 className="h6 mb-2">Items ({catalogItems.length})</h3>
                {catalogItems.length === 0 ? (
                  <div className="text-muted small">No items yet. Add one via URL above.</div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-sm align-middle">
                      <thead>
                        <tr>
                          <th style={{ width: 52 }}></th>
                          <th>Name</th>
                          <th>Price</th>
                          <th>Status</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {catalogItems.map((item: any) => (
                          <tr key={item.id}>
                            <td>
                              {item.imageUrl ? (
                                <img src={item.imageUrl} alt={item.name} style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6 }} />
                              ) : <span style={{ fontSize: 24 }}>🛍️</span>}
                            </td>
                            <td>
                              <div className="fw-semibold">{item.name}</div>
                              {item.description && <div className="small text-muted">{item.description}</div>}
                            </td>
                            <td><span className="badge bg-warning text-dark">{item.priceCoins} 🪙</span></td>
                            <td>
                              <div className="form-check form-switch mb-0">
                                <input
                                  className="form-check-input"
                                  type="checkbox"
                                  checked={item.active}
                                  onChange={async () => {
                                    const r = await fetch(`/api/catalog/${item.id}`, {
                                      method: 'PATCH',
                                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                      body: JSON.stringify({ active: !item.active }),
                                    });
                                    if (r.ok) setCatalogItems((prev) => prev.map((x) => x.id === item.id ? { ...x, active: !x.active } : x));
                                  }}
                                />
                                <label className="form-check-label small">{item.active ? 'Active' : 'Hidden'}</label>
                              </div>
                            </td>
                            <td>
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={async () => {
                                  if (!confirm(`Delete "${item.name}"?`)) return;
                                  const r = await fetch(`/api/catalog/${item.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
                                  if (r.ok) setCatalogItems((prev) => prev.filter((x) => x.id !== item.id));
                                }}
                              >Delete</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="col-12">
            <div className="card" ref={approvalsRef}>
              <div className="card-body">
                <h2 className="h5">Approvals</h2>
                {/* Approvals tabs: Chores | Bonuses */}
                <ul className="nav nav-tabs mb-3">
                  <li className="nav-item">
                    <button
                      className={`nav-link ${approvalsTab === 'chores' ? 'active' : ''}`}
                      onClick={() => setApprovalsTab('chores')}
                    >
                      Chores
                      {approvals.length > 0 && <span className="badge bg-warning text-dark ms-2">{approvals.length}</span>}
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      className={`nav-link ${approvalsTab === 'bonuses' ? 'active' : ''}`}
                      onClick={() => setApprovalsTab('bonuses')}
                    >
                      Bonuses
                      {bonusClaims.length > 0 && <span className="badge bg-warning text-dark ms-2">{bonusClaims.length}</span>}
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      className={`nav-link ${approvalsTab === 'shop' ? 'active' : ''}`}
                      onClick={() => setApprovalsTab('shop')}
                    >
                      Shop
                      {catalogPurchases.filter((p: any) => p.status === 'pending_delivery').length > 0 && (
                        <span className="badge bg-warning text-dark ms-2">{catalogPurchases.filter((p: any) => p.status === 'pending_delivery').length}</span>
                      )}
                    </button>
                  </li>
                </ul>

                {/* Shop purchases tab */}
                {approvalsTab === 'shop' && (
                  <>
                    {catalogPurchases.filter((p: any) => p.status === 'pending_delivery').length === 0 ? (
                      <div className="text-muted">No pending deliveries.</div>
                    ) : (
                      <ul className="list-group list-group-flush">
                        {catalogPurchases.filter((p: any) => p.status === 'pending_delivery').map((purchase: any) => (
                          <li key={purchase.id} className="list-group-item d-flex justify-content-between align-items-center gap-2">
                            <div className="flex-grow-1">
                              <div className="fw-semibold">{purchase.itemName}</div>
                              <div className="small text-muted">
                                {purchase.childName || purchase.childId} · {purchase.priceCoins} 🪙 · {new Date(purchase.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                            <button
                              className="btn btn-sm btn-success"
                              onClick={async () => {
                                const r = await fetch(`/api/catalog/purchases/${purchase.id}`, {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                  body: JSON.stringify({ familyId: selectedFamily?.id }),
                                });
                                if (r.ok) {
                                  setCatalogPurchases((prev) => prev.map((x) => x.id === purchase.id ? { ...x, status: 'delivered' } : x));
                                }
                              }}
                            >Mark Delivered ✓</button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {catalogPurchases.filter((p: any) => p.status === 'delivered').length > 0 && (
                      <div className="mt-3">
                        <div className="small text-muted mb-1">Recent deliveries</div>
                        <ul className="list-group list-group-flush">
                          {catalogPurchases.filter((p: any) => p.status === 'delivered').slice(0, 5).map((purchase: any) => (
                            <li key={purchase.id} className="list-group-item d-flex justify-content-between align-items-center gap-2">
                              <div className="flex-grow-1">
                                <div className="fw-semibold">{purchase.itemName}</div>
                                <div className="small text-muted">{purchase.childName || purchase.childId} · {purchase.priceCoins} 🪙</div>
                              </div>
                              <span className="badge bg-success">Delivered ✓</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}

                {/* Bonus claims tab */}
                {approvalsTab === 'bonuses' && (
                  <>
                    {bonusClaims.length === 0 ? (
                      <div className="text-muted">No pending bonus claims.</div>
                    ) : (
                      <div className="table-responsive">
                        <table className="table align-middle">
                          <thead>
                            <tr>
                              <th scope="col">Child</th>
                              <th scope="col">Bonus</th>
                              <th scope="col">Value</th>
                              <th scope="col">Note</th>
                              <th scope="col" className="text-end">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {bonusClaims.map((claim) => {
                              const claimChild = children.find((c) => c.id === claim.childId);
                              const bonus = bonuses.find((b) => b.id === claim.bonusId);
                              return (
                                <tr key={claim.id}>
                                  <td>{claimChild?.displayName || claim.childId}</td>
                                  <td>{bonus?.name || claim.bonusId}</td>
                                  <td><span className="badge bg-light text-dark">+{bonus?.value ?? '?'}</span></td>
                                  <td className="text-muted">{claim.note || <span className="text-muted">—</span>}</td>
                                  <td className="text-end">
                                    {rejectingClaimId === claim.id ? (
                                      <div className="d-flex gap-2 justify-content-end flex-wrap">
                                        <input
                                          className="form-control form-control-sm"
                                          style={{ maxWidth: 200 }}
                                          placeholder="Rejection reason"
                                          value={rejectReason}
                                          onChange={(e) => setRejectReason(e.target.value)}
                                          autoFocus
                                        />
                                        <button
                                          className="btn btn-sm btn-danger"
                                          onClick={async () => {
                                            await fetch(`/api/bonuses/claims/${claim.id}/reject`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ reason: rejectReason }) });
                                            push('success', 'Bonus claim rejected');
                                            setRejectingClaimId(null);
                                            setRejectReason('');
                                            await refreshBonusClaims();
                                            await refreshActivity();
                                          }}
                                        >Confirm Reject</button>
                                        <button className="btn btn-sm btn-outline-secondary" onClick={() => { setRejectingClaimId(null); setRejectReason(''); }}>Cancel</button>
                                      </div>
                                    ) : (
                                      <>
                                        <button
                                          className="btn btn-sm btn-success me-2"
                                          onClick={async () => {
                                            await fetch(`/api/bonuses/claims/${claim.id}/approve`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } });
                                            push('success', 'Bonus claim approved');
                                            await refreshBonusClaims();
                                            await refreshActivity();
                                          }}
                                        >Approve</button>
                                        <button
                                          className="btn btn-sm btn-outline-danger"
                                          onClick={() => { setRejectingClaimId(claim.id); setRejectReason(''); }}
                                        >Reject</button>
                                      </>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}

                {/* Chores approvals tab */}
                {approvalsTab === 'chores' && (
                  <>
                {/* Approvals: actions above table; sticky action bar provided on mobile */}
                {approvals.length === 0 ? (
                  <div className="text-muted">No pending approvals.</div>
                ) : (
                  <div className="table-responsive">
                    <div className="d-flex justify-content-end mb-2 gap-2 flex-wrap align-items-center">
                      <button
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => setBulk(Object.fromEntries(approvals.map((a) => [a.id, true])))}
                      >
                        Select all
                      </button>
                      {approvals.filter((a) => bulk[a.id]).length > 0 && (
                        <button
                          className="btn btn-sm btn-success"
                          onClick={async () => {
                            const ids = approvals.filter((a) => bulk[a.id]).map((a) => a.id);
                            if (ids.length === 0) return;
                            try {
                              const res = await fetch('/api/approvals/bulk-approve', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                body: JSON.stringify({ completionIds: ids }),
                              });
                              const data = await res.json();
                              const succeededCount = data.succeeded?.length ?? 0;
                              const failedCount = data.failed?.length ?? 0;
                              if (succeededCount > 0) push('success', `Approved ${succeededCount} chore${succeededCount !== 1 ? 's' : ''}`);
                              if (failedCount > 0) push('warning', `${failedCount} item${failedCount !== 1 ? 's' : ''} could not be approved`);
                            } catch {
                              push('error', 'Bulk approve failed');
                            }
                            await refreshApprovals();
                            await refreshWeekly();
                            setBulk({});
                          }}
                        >
                          Approve Selected ({approvals.filter((a) => bulk[a.id]).length})
                        </button>
                      )}
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={async () => {
                          const ids = approvals.filter((a) => bulk[a.id]).map((a) => a.id);
                          if (ids.length === 0) return;
                          await fetch('/approvals/bulk-reject', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ familyId: selectedFamily!.id, ids }) });
                          await refreshApprovals();
                          await refreshWeekly();
                          setBulk({});
                        }}
                      >
                        Reject selected
                      </button>
                    </div>
                    <table className="table align-middle">
                      <thead>
                        <tr>
                          <th scope="col" style={{width: '2rem'}}></th>
                          <th scope="col">Child</th>
                          <th scope="col">Chore</th>
                          <th scope="col">Date</th>
                          <th scope="col" className="text-end">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {approvals.map((a) => {
                          const child = children.find((c) => c.id === a.childId);
                          const chore = chores.find((h) => h.id === a.choreId);
                          return (
                            <tr key={a.id}>
                              <td>
                                <input
                                  className="form-check-input"
                                  type="checkbox"
                                  checked={!!bulk[a.id]}
                                  onChange={(e) => setBulk((prev) => ({ ...prev, [a.id]: e.target.checked }))}
                                />
                              </td>
                              <td>{child?.displayName || a.childId}</td>
                              <td>{chore?.name || a.choreId}</td>
                              <td className="text-muted">{a.date}</td>
                              <td className="text-end">
                                <button
                                  className="btn btn-sm btn-success me-2"
                                  onClick={async () => {
                                    await fetch(`/approvals/${a.id}/approve`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ familyId: selectedFamily!.id }) });
                                    await refreshApprovals();
                                    await refreshWeekly();
                                  }}
                                >Approve</button>
                                <button
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={async () => {
                                    await fetch(`/approvals/${a.id}/reject`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ familyId: selectedFamily!.id }) });
                                    await refreshApprovals();
                                    await refreshWeekly();
                                  }}
                                >Reject</button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Activity Feed */}
          <div className="col-12">
            <div className="card" ref={activityRef}>
              <div className="card-body">
                <h2 className="h5 mb-3">Recent Activity</h2>
                {activityFeed.length === 0 ? (
                  <div className="text-muted">
                    <div className="fs-4 mb-1">📋</div>
                    No activity yet. Activity will appear here as your kids complete chores and claim bonuses.
                  </div>
                ) : (
                  <ul className="list-unstyled mb-0">
                    {activityFeed.map((entry) => (
                      <li key={entry.id} className="d-flex align-items-start gap-3 py-2 border-bottom">
                        <span className="fs-5 flex-shrink-0" aria-hidden>{activityIcon(entry.eventType)}</span>
                        <div className="flex-grow-1">
                          <div className="fw-medium">{activityDescription(entry, children)}</div>
                          {entry.note && <div className="small text-muted">{entry.note}</div>}
                        </div>
                        <span className="text-muted small flex-shrink-0">{formatRelativeTime(entry.createdAt)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <div className="col-12">
            <div className="card" ref={weekOverviewRef}>
              <div className="card-body">
                <h2 className="h5">Week Overview</h2>
                {/* Week Overview: day pager on small; 7-col grid on md+ */}
                {children.length === 0 ? (
                  <div className="text-muted">No children.</div>
                ) : (
                  <>
                    {/* Mobile: day pager view */}
                    <div className="d-block d-md-none">
                      <div className="d-flex align-items-center justify-content-between border rounded px-3 py-2 mb-2">
                        <button className="btn btn-link p-0" aria-label="Prev" onClick={() => setWeekDayIndex((d) => (d + 6) % 7)}>‹</button>
                        <div className="fw-semibold">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][weekDayIndex]}</div>
                        <button className="btn btn-link p-0" aria-label="Next" onClick={() => setWeekDayIndex((d) => (d + 1) % 7)}>›</button>
                      </div>
                      <ul className="list-unstyled mb-0">
                        {children.map((c) => {
                          const w = weeklyByChild[c.id];
                          if (!w) return (
                            <li key={`wk-${c.id}`} className="d-flex justify-content-between py-2 border-bottom">
                              <span className="text-anywhere">{c.displayName}</span>
                              <span className="text-muted small">-</span>
                            </li>
                          );
                          const day = w.days[weekDayIndex];
                          const planned = day?.items?.length || 0;
                          const completed = (day?.items || []).filter((it: any) => it.status === 'approved' || it.status === 'pending').length;
                          const isToday = w.today === weekDayIndex;
                          return (
                            <li key={`wk-${c.id}`} className={`d-flex justify-content-between py-2 border-bottom ${isToday ? 'bg-light' : ''}`}>
                              <span className="text-anywhere">{c.displayName}</span>
                              <span className="text-muted small">{completed}/{planned}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                    {/* Desktop: original 7-day grid */}
                    <div className="d-none d-md-block table-responsive">
                      <table className="table align-middle">
                        <thead>
                          <tr>
                            <th scope="col">Child</th>
                            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => (
                              <th key={d} scope="col">{d}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {children.map((c) => {
                            const w = weeklyByChild[c.id];
                            if (!w) return (
                              <tr key={c.id}>
                                <td className="fw-semibold">{c.displayName}</td>
                                {Array.from({ length: 7 }).map((_, i) => <td key={`${c.id}-empty-${i}`}>-</td>)}
                              </tr>
                            );
                            return (
                              <tr key={c.id}>
                                <td className="fw-semibold">{c.displayName}</td>
                                {w.days.map((day: any, i: number) => {
                                  const planned = day.items.length;
                                  const completed = day.items.filter((it: any) => it.status === 'approved' || it.status === 'pending').length;
                                  return (
                                    <td key={`${c.id}-${day.date}`} className={w.today === i ? 'table-primary' : ''}>
                                      <span className="small">{completed}/{planned}</span>
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="col-12 mobile-bottom">
            <div className="card" ref={weekDetailsRef}>
              <div className="card-body">
                <h2 className="h5">Week Details</h2>
                {children.length === 0 ? (
                  <div className="text-muted">No children.</div>
                ) : (
                  <>
                    {/* Mobile: collapsible cards per child */}
                    <div className="d-block d-md-none" style={{ contentVisibility: 'auto' as any }}>
                      {children.map((c) => {
                        const w = weeklyByChild[c.id];
                        const open = !!detailsOpen[c.id];
                        const contentId = `wd-panel-${c.id}`;
                        return (
                          <div key={`wd-card-${c.id}`} className="card mb-2">
                            <button className="btn text-start w-100 px-3 py-2 d-flex justify-content-between align-items-center touch-target" onClick={() => setDetailsOpen((prev) => ({ ...prev, [c.id]: !open }))} aria-expanded={open} aria-controls={contentId}>
                              <span className="fw-semibold text-anywhere">{c.displayName}</span>
                              {w ? <span className="text-muted small">Coins: {w.totalApproved} / {w.totalPlanned}</span> : null}
                            </button>
                            {open && (
                              <div id={contentId} className="px-3 pb-3">
                                {!w ? (
                                  <div className="text-muted small">No chores this week.</div>
                                ) : (
                                  <div className="row row-cols-2 g-2">
                                    {w.days.map((day: any, i: number) => (
                                      <div key={`${c.id}-day-m-${day.date}`} className={`border rounded p-2 ${w.today === i ? 'bg-light' : ''}`}>
                                        <div className="text-muted small">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][i]}</div>
                                        {(day.items || []).length === 0 ? (
                                          <div className="text-muted small">-</div>
                                        ) : (
                                          <ul className="list-unstyled mb-0 small">
                                            {day.items.map((it: any) => (
                                              <li key={`${c.id}-${day.date}-${it.id}`} className="text-anywhere">
                                                {it.name} <span className="text-muted">(+{it.value})</span>
                                                {it.status === 'approved' && <span className="ms-2 badge bg-success">Completed</span>}
                                                {it.status === 'pending' && <span className="ms-2 badge bg-warning text-dark">Pending</span>}
                                                {it.status === 'missed' && <span className="ms-2 badge bg-danger">Missed</span>}
                                                {it.status === 'due' && <span className="ms-2 badge bg-info text-dark">Due</span>}
                                                {it.status === 'planned' && <span className="ms-2 badge bg-light text-dark">Planned</span>}
                                              </li>
                                            ))}
                                          </ul>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {/* Desktop: existing table detail view */}
                    <div className="d-none d-md-block">
                      <div className="row g-3">
                        {children.map((c) => {
                          const w = weeklyByChild[c.id];
                          return (
                            <div className="col-12 col-lg-6" key={`detail-${c.id}`}>
                              <div className="border rounded p-3 h-100">
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                  <h3 className="h6 mb-0">{c.displayName}</h3>
                                  {w ? (
                                    <span className="small text-muted">Coins: {w.totalApproved} / {w.totalPlanned}</span>
                                  ) : null}
                                </div>
                                {!w ? (
                                  <div className="text-muted small">No chores this week.</div>
                                ) : (
                                  <div className="table-responsive">
                                    <table className="table table-sm align-middle mb-0">
                                      <thead>
                                        <tr>
                                          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d, i) => (
                                            <th key={`${c.id}-head-${d}`} className={w.today === i ? 'table-primary' : ''}>{d}</th>
                                          ))}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        <tr>
                                          {w.days.map((day: any, i: number) => (
                                            <td key={`${c.id}-day-${day.date}`} className={w.today === i ? 'table-primary' : ''}>
                                              {day.items.length === 0 ? (
                                                <span className="text-muted small">-</span>
                                              ) : (
                                                <ul className="list-unstyled mb-0 small">
                                                  {day.items.map((it: any) => (
                                                    <li key={`${c.id}-${day.date}-${it.id}`}>
                                                      {it.name} <span className="text-muted">(+{it.value})</span>{' '}
                                                      {it.status === 'approved' && <span className="badge bg-success">Completed</span>}
                                                      {it.status === 'pending' && <span className="badge bg-warning text-dark">Pending</span>}
                                                      {it.status === 'missed' && <span className="badge bg-danger">Missed</span>}
                                                      {it.status === 'due' && <span className="badge bg-info text-dark">Due</span>}
                                                      {it.status === 'planned' && <span className="badge bg-light text-dark">Planned</span>}
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
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
      {/* Sticky mobile actions: Approvals primary controls */}
      <div className="d-md-none" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1040, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(6px)', borderTop: '1px solid var(--border)' }}>
        <div className="container py-2 d-flex gap-2">
          <button className="btn btn-primary w-100 touch-target" disabled={payoutBusy || !selectedFamily} onClick={runPayout}>{payoutBusy ? 'Paying…' : 'Run payout'}</button>
          <button className="btn btn-outline-secondary touch-target" style={{ minWidth: 120 }} onClick={() => childrenRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>Add Coins</button>
        </div>
      </div>
    </div>
  );
}
