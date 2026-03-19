import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../components/TopBar';
import { useToast } from '../components/Toast';
import '../styles/app-theme.css';

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'America/Toronto',
  'America/Vancouver',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
  'UTC',
];

export default function Settings() {
  const nav = useNavigate();
  const { push } = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [me, setMe] = useState<{ id: string; email: string; name?: string } | null>(null);
  const [family, setFamily] = useState<{ id: string; name: string; timezone: string } | null>(null);
  const [children, setChildren] = useState<any[]>([]);
  const [apiTokens, setApiTokens] = useState<Array<{ id: string; label?: string; createdAt: string; lastUsedAt?: string; expiresAt?: string | null }>>([]);

  // Family edit state
  const [familyName, setFamilyName] = useState('');
  const [familyTimezone, setFamilyTimezone] = useState('UTC');
  const [savingFamily, setSavingFamily] = useState(false);

  // Children rename state
  const [renamingChild, setRenamingChild] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Delete child confirmation
  const [deletingChild, setDeletingChild] = useState<string | null>(null);

  // Token creation state
  const [showCreateToken, setShowCreateToken] = useState(false);
  const [newTokenLabel, setNewTokenLabel] = useState('');
  const [newTokenValue, setNewTokenValue] = useState<string | null>(null);
  const [creatingToken, setCreatingToken] = useState(false);

  useEffect(() => {
    document.body.classList.add('arcade-body');
    return () => document.body.classList.remove('arcade-body');
  }, []);

  useEffect(() => {
    const t = localStorage.getItem('parentToken');
    if (!t) {
      nav('/');
      return;
    }
    setToken(t);
  }, [nav]);

  useEffect(() => {
    if (!token) return;
    fetch('/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((p) => setMe(p))
      .catch(() => setMe(null));
    fetch('/families', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => {
        const fam = list?.[0] || null;
        if (fam) {
          setFamily(fam);
          setFamilyName(fam.name || '');
          setFamilyTimezone(fam.timezone || 'UTC');
        }
      })
      .catch(() => {});
    fetch('/tokens', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => setApiTokens(list || []))
      .catch(() => setApiTokens([]));
  }, [token]);

  useEffect(() => {
    if (!token || !family) return;
    fetch(`/families/${family.id}/children`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => setChildren(list || []))
      .catch(() => setChildren([]));
  }, [token, family]);

  async function refreshTokens() {
    if (!token) return;
    const r = await fetch('/tokens', { headers: { Authorization: `Bearer ${token}` } });
    setApiTokens(r.ok ? await r.json() : []);
  }

  async function handleSaveFamilyName(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !family) return;
    setSavingFamily(true);
    try {
      const r = await fetch(`/families/${family.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: familyName }),
      });
      if (r.ok) {
        const updated = await r.json();
        setFamily(updated);
        push('success', 'Family name saved');
      } else {
        push('error', 'Failed to save family name');
      }
    } catch {
      push('error', 'Failed to save family name');
    } finally {
      setSavingFamily(false);
    }
  }

  async function handleSaveTimezone(tz: string) {
    if (!token || !family) return;
    try {
      const r = await fetch(`/families/${family.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ timezone: tz }),
      });
      if (r.ok) {
        const updated = await r.json();
        setFamily(updated);
        setFamilyTimezone(updated.timezone || tz);
        push('success', 'Timezone saved');
      } else {
        push('error', 'Failed to save timezone');
      }
    } catch {
      push('error', 'Failed to save timezone');
    }
  }

  async function handleRenameChild(id: string) {
    if (!token || !family) return;
    const name = renameValue.trim();
    if (!name) return;
    try {
      const r = await fetch(`/children/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ displayName: name }),
      });
      if (r.ok) {
        const updated = await r.json();
        setChildren((prev) => prev.map((c) => (c.id === id ? { ...c, displayName: updated.displayName } : c)));
        setRenamingChild(null);
        setRenameValue('');
        push('success', 'Child renamed');
      } else {
        push('error', 'Failed to rename child');
      }
    } catch {
      push('error', 'Failed to rename child');
    }
  }

  async function handleDeleteChild(id: string) {
    if (!token) return;
    try {
      const r = await fetch(`/children/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) {
        setChildren((prev) => prev.filter((c) => c.id !== id));
        setDeletingChild(null);
        push('success', 'Child deleted');
      } else {
        push('error', 'Failed to delete child');
      }
    } catch {
      push('error', 'Failed to delete child');
    }
  }

  async function handleCreateToken(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setCreatingToken(true);
    try {
      const r = await fetch('/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ label: newTokenLabel || undefined }),
      });
      if (r.ok) {
        const rec = await r.json();
        setNewTokenValue(rec.token);
        setNewTokenLabel('');
        await refreshTokens();
      } else {
        push('error', 'Failed to create token');
      }
    } catch {
      push('error', 'Failed to create token');
    } finally {
      setCreatingToken(false);
    }
  }

  async function handleRevokeToken(id: string) {
    if (!token) return;
    if (!window.confirm('Revoke this token? This cannot be undone.')) return;
    try {
      await fetch(`/tokens/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      await refreshTokens();
      push('success', 'Token revoked');
    } catch {
      push('error', 'Failed to revoke token');
    }
  }

  return (
    <div className="arcade-app">
      <TopBar
        name={me?.name || me?.email || 'Parent'}
        avatar={null}
        onLogout={async () => {
          try { await fetch('/auth/logout', { method: 'POST' }); } catch {}
          localStorage.removeItem('parentToken');
          nav('/');
        }}
      />

      <div className="container py-4" style={{ paddingBottom: 60 }}>
        <div className="d-flex align-items-center gap-3 mb-4">
          <button className="btn btn-sm btn-outline-secondary" onClick={() => nav('/parent')}>
            &larr; Back
          </button>
          <h1 className="h3 mb-0">Settings</h1>
        </div>

        <div className="row g-4">
          {/* Family section */}
          <div className="col-12">
            <div className="card shadow-sm">
              <div className="card-body">
                <h2 className="h5 mb-3">Family</h2>
                <form className="row g-3 align-items-end mb-3" onSubmit={handleSaveFamilyName}>
                  <div className="col-12 col-md-6">
                    <label htmlFor="settings-family-name" className="form-label">Family name</label>
                    <input
                      id="settings-family-name"
                      className="form-control"
                      value={familyName}
                      onChange={(e) => setFamilyName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-12 col-md-3">
                    <button className="btn btn-primary" type="submit" disabled={savingFamily}>
                      {savingFamily ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </form>
                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <label htmlFor="settings-timezone" className="form-label">Timezone</label>
                    <select
                      id="settings-timezone"
                      className="form-select"
                      value={familyTimezone}
                      onChange={(e) => {
                        setFamilyTimezone(e.target.value);
                        handleSaveTimezone(e.target.value);
                      }}
                    >
                      {TIMEZONES.map((tz) => (
                        <option key={tz} value={tz}>{tz}</option>
                      ))}
                    </select>
                    <div className="form-text">Changes are saved automatically.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Children section */}
          <div className="col-12">
            <div className="card shadow-sm">
              <div className="card-body">
                <h2 className="h5 mb-3">Children</h2>
                {children.length === 0 ? (
                  <div className="text-muted">No children yet. Add children from the Parent Dashboard.</div>
                ) : (
                  <ul className="list-group list-group-flush">
                    {children.map((c) => (
                      <li key={c.id} className="list-group-item px-0">
                        <div className="d-flex align-items-center gap-3 flex-wrap">
                          <div
                            style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--primary)', flexShrink: 0 }}
                          >
                            {(c.displayName || c.username || '?').charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-grow-1">
                            {renamingChild === c.id ? (
                              <div className="d-flex align-items-center gap-2 flex-wrap">
                                <input
                                  className="form-control form-control-sm"
                                  style={{ maxWidth: 240 }}
                                  value={renameValue}
                                  autoFocus
                                  onChange={(e) => setRenameValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleRenameChild(c.id);
                                    if (e.key === 'Escape') { setRenamingChild(null); setRenameValue(''); }
                                  }}
                                />
                                <button className="btn btn-sm btn-primary" onClick={() => handleRenameChild(c.id)}>Save</button>
                                <button className="btn btn-sm btn-outline-secondary" onClick={() => { setRenamingChild(null); setRenameValue(''); }}>Cancel</button>
                              </div>
                            ) : (
                              <>
                                <div className="fw-semibold">{c.displayName || c.username}</div>
                                <div className="text-muted small">@{c.username}</div>
                              </>
                            )}
                          </div>
                          {renamingChild !== c.id && (
                            <div className="d-flex gap-2">
                              <button
                                className="btn btn-sm btn-outline-secondary"
                                onClick={() => { setRenamingChild(c.id); setRenameValue(c.displayName || ''); }}
                              >
                                Rename
                              </button>
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => setDeletingChild(c.id)}
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Delete confirmation inline */}
                        {deletingChild === c.id && (
                          <div className="mt-2 p-2 border border-danger rounded d-flex align-items-center gap-2 flex-wrap">
                            <span className="text-danger small fw-semibold">Delete {c.displayName}? This cannot be undone.</span>
                            <button className="btn btn-sm btn-danger" onClick={() => handleDeleteChild(c.id)}>Yes, delete</button>
                            <button className="btn btn-sm btn-outline-secondary" onClick={() => setDeletingChild(null)}>Cancel</button>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* API Tokens section */}
          <div className="col-12">
            <div className="card shadow-sm">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h2 className="h5 mb-0">API Tokens</h2>
                  <button
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => { setShowCreateToken(true); setNewTokenValue(null); }}
                  >
                    + Create Token
                  </button>
                </div>
                <p className="text-muted small mb-3">Create long-lived tokens for integrations like Alexa. Keep them secret.</p>

                {showCreateToken && (
                  <div className="card mb-3" style={{ background: 'var(--primary-light)', border: '1px solid var(--primary-light-2)' }}>
                    <div className="card-body">
                      {newTokenValue ? (
                        <>
                          <div className="fw-semibold mb-2">Token created — copy it now!</div>
                          <div className="alert alert-warning d-flex align-items-center gap-2 flex-wrap mb-2">
                            <code className="flex-grow-1" style={{ wordBreak: 'break-all' }}>{newTokenValue}</code>
                            <button
                              className="btn btn-sm btn-outline-secondary"
                              onClick={() => navigator.clipboard?.writeText(newTokenValue)}
                            >
                              Copy
                            </button>
                          </div>
                          <div className="small text-muted mb-3">This token will not be shown again. Store it somewhere safe.</div>
                          <button
                            className="btn btn-outline-secondary btn-sm"
                            onClick={() => { setShowCreateToken(false); setNewTokenValue(null); }}
                          >
                            Done
                          </button>
                        </>
                      ) : (
                        <form className="d-flex gap-2 align-items-end flex-column flex-sm-row" onSubmit={handleCreateToken}>
                          <div className="flex-grow-1">
                            <label htmlFor="settings-tok-label" className="form-label">Label (optional)</label>
                            <input
                              id="settings-tok-label"
                              className="form-control"
                              placeholder="Alexa"
                              value={newTokenLabel}
                              onChange={(e) => setNewTokenLabel(e.target.value)}
                            />
                          </div>
                          <div className="d-flex gap-2">
                            <button className="btn btn-primary" type="submit" disabled={creatingToken}>
                              {creatingToken ? 'Creating…' : 'Create'}
                            </button>
                            <button
                              className="btn btn-outline-secondary"
                              type="button"
                              onClick={() => { setShowCreateToken(false); setNewTokenLabel(''); }}
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  </div>
                )}

                {apiTokens.length === 0 ? (
                  <div className="text-muted small">No tokens yet.</div>
                ) : (
                  <ul className="list-unstyled mb-0">
                    {apiTokens.map((t) => (
                      <li key={t.id} className="d-flex justify-content-between align-items-center border-bottom py-2 gap-3">
                        <div className="flex-grow-1">
                          <div className="fw-medium">{t.label || 'Unnamed token'}</div>
                          <div className="text-muted small">
                            Created {new Date(t.createdAt).toLocaleDateString()}
                            {t.lastUsedAt ? ` · Last used ${new Date(t.lastUsedAt).toLocaleDateString()}` : ''}
                          </div>
                        </div>
                        <button
                          className="btn btn-sm btn-outline-danger flex-shrink-0"
                          onClick={() => handleRevokeToken(t.id)}
                        >
                          Revoke
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
