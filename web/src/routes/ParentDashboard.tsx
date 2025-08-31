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
  const [chores, setChores] = useState<any[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [editingChore, setEditingChore] = useState<any | null>(null);
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
    const hdrs = { Authorization: `Bearer ${token}` } as any;
    fetch(`/chores?familyId=${selectedFamily.id}`, { headers: hdrs })
      .then((r) => (r.ok ? r.json() : []))
      .then(setChores)
      .catch(() => setChores([]));
    fetch(`/approvals?familyId=${selectedFamily.id}`, { headers: hdrs })
      .then((r) => (r.ok ? r.json() : []))
      .then(setApprovals)
      .catch(() => setApprovals([]));
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
          <div className="col-12">
            <div className="card">
              <div className="card-body">
                <h2 className="h5">Chores</h2>
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
                {chores.length === 0 ? (
                  <div className="text-muted">No chores yet.</div>
                ) : (
                  <div className="table-responsive">
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
                )}
              </div>
            </div>
          </div>
          <div className="col-12">
            <div className="card">
              <div className="card-body">
                <h2 className="h5">Approvals</h2>
                {approvals.length === 0 ? (
                  <div className="text-muted">No pending approvals.</div>
                ) : (
                  <div className="table-responsive">
                    <table className="table align-middle">
                      <thead>
                        <tr>
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
                              <td>{child?.displayName || a.childId}</td>
                              <td>{chore?.name || a.choreId}</td>
                              <td className="text-muted">{a.date}</td>
                              <td className="text-end">
                                <button
                                  className="btn btn-sm btn-success me-2"
                                  onClick={async () => {
                                    await fetch(`/approvals/${a.id}/approve`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ familyId: selectedFamily!.id }) });
                                    await refreshApprovals();
                                  }}
                                >Approve</button>
                                <button
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={async () => {
                                    await fetch(`/approvals/${a.id}/reject`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ familyId: selectedFamily!.id }) });
                                    await refreshApprovals();
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
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
