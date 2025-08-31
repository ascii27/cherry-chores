import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function ParentDashboard() {
  const nav = useNavigate();
  const loc = useLocation();
  const [token, setToken] = useState<string | null>(null);
  const [families, setFamilies] = useState<any[]>([]);
  const [selectedFamily, setSelectedFamily] = useState<any | null>(null);
  const [children, setChildren] = useState<any[]>([]);
  const [parents, setParents] = useState<any[]>([]);
  const [me, setMe] = useState<{ id: string; email: string } | null>(null);
  const hashToken = useMemo(() => new URLSearchParams(loc.hash.replace(/^#/, '')).get('token'), [loc.hash]);

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
  }, [token]);

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
  }, [token, selectedFamily]);

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

  return (
    <div className="container py-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h1 className="h3 mb-0">Parent Dashboard</h1>
        <button
          className="btn btn-outline-secondary btn-sm"
          type="button"
          onClick={async () => {
            try { await fetch('/auth/logout', { method: 'POST' }); } catch {}
            localStorage.removeItem('parentToken');
            nav('/');
          }}
        >
          Log out
        </button>
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
            <div className="card h-100">
              <div className="card-body">
                <h2 className="h5">Family</h2>
                <p className="mb-1"><strong>Name:</strong> {selectedFamily?.name}</p>
                <p className="mb-3"><strong>Timezone:</strong> {selectedFamily?.timezone}</p>
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
                <form className="d-flex gap-2" onSubmit={handleAddCoParent}>
                  <input id="coEmail" type="email" className="form-control" placeholder="parent2@example.com" />
                  <button className="btn btn-outline-primary" type="submit">Add</button>
                </form>
              </div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="card h-100">
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
          <div className="col-12">
            <div className="card">
              <div className="card-body">
                <h2 className="h5">Children</h2>
                {children.length === 0 ? (
                  <div className="text-muted">No children yet.</div>
                ) : (
                  <div className="table-responsive">
                    <table className="table align-middle">
                      <thead>
                        <tr>
                          <th scope="col">Display name</th>
                          <th scope="col">Username</th>
                          <th scope="col" className="text-end">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {children.map((c) => (
                          <tr key={c.id}>
                            <td>{c.displayName}</td>
                            <td className="text-muted">{c.username}</td>
                            <td className="text-end">
                              <button className="btn btn-sm btn-outline-secondary me-2" type="button" onClick={() => handleRenameChild(c.id)}>Rename</button>
                              <button className="btn btn-sm btn-outline-danger" type="button" onClick={() => handleDeleteChild(c.id)}>Delete</button>
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
        </div>
      )}
    </div>
  );
}
