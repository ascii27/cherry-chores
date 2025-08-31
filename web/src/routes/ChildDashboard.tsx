import React, { useEffect, useState } from 'react';
import { useToast } from '../components/Toast';
import { useNavigate } from 'react-router-dom';

export default function ChildDashboard() {
  const nav = useNavigate();
  const [child, setChild] = useState<{ id: string; familyId: string } | null>(null);
  const [today, setToday] = useState<any[]>([]);
  const [weekData, setWeekData] = useState<{ days: any[]; totalPlanned: number; totalApproved: number; today: number } | null>(null);
  const [balance, setBalance] = useState<{ available: number; reserved: number } | null>(null);
  const [ledger, setLedger] = useState<any[]>([]);
  const { push } = useToast();
  const [savers, setSavers] = useState<any[]>([]);
  const [editing, setEditing] = useState<{ id: string; field: 'name' | 'target' } | null>(null);

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
        setChild({ id: data.id, familyId: data.familyId });
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
      } catch {
        nav('/');
      }
    })();
  }, [nav]);

  return (
    <div className="container py-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h1 className="h4 mb-0">Child Dashboard</h1>
        <button
          className="btn btn-outline-secondary btn-sm"
          onClick={() => {
            localStorage.removeItem('childToken');
            nav('/');
          }}
        >
          Log out
        </button>
      </div>
      {/* Top row: Today (left), This Week (right) */}
      <div className="row g-3">
        <div className="col-12 col-lg-6">
          <div className="card h-100">
            <div className="card-body">
              <h2 className="h6">Today</h2>
              {today.length === 0 ? (
                <div className="text-muted">No chores for today.</div>
              ) : (
                <ul className="list-group list-group-flush">
                  {today.map((t) => (
                    <li key={t.id} className="list-group-item d-flex justify-content-between align-items-center">
                      <div>
                        <div className="fw-semibold">{t.name}</div>
                        <div className="small text-muted">{t.description || ''}</div>
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        {t.status === 'pending' && <span className="badge bg-warning text-dark">Pending</span>}
                        {t.status === 'approved' && <span className="badge bg-success">Done</span>}
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
        <div className="col-12 col-lg-6">
          <div className="card h-100">
            <div className="card-body">
              <h2 className="h6">This Week</h2>
              {!weekData ? (
                <div className="text-muted">No chores this week.</div>
              ) : (
                <>
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
                    <table className="table table-sm align-middle mb-0">
                      <thead>
                        <tr>
                          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d, i) => (
                            <th key={d} className={weekData.today === i ? 'table-primary' : ''}>{d}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          {weekData.days.map((day, i) => (
                            <td key={day.date} className={weekData.today === i ? 'table-primary' : ''}>
                              {day.items.length === 0 ? (
                                <span className="text-muted small">-</span>
                              ) : (
                                <ul className="list-unstyled mb-0 small">
                                  {day.items.map((it: any) => (
                                    <li key={it.id}>
                                      {it.name} <span className="text-muted">(+{it.value})</span> {it.status === 'approved' ? '✅' : it.status === 'pending' ? '⏳' : it.status === 'missed' ? '⚠️' : ''}
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
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom row: Bank (left), Saver Goals (right) */}
      <div className="row g-3 mt-1">
        <div className="col-12 col-lg-6">
          <div className="card h-100">
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
                        {(whoName || role) ? <> • <span className="text-muted">{whoName}{role}</span></> : null}
                        {when ? <> • <span className="text-muted">{when}</span></> : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
        <div className="col-12 col-lg-6">
          <div className="card h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h2 className="h6 mb-0">Saver Goals</h2>
                <button
                  className="btn btn-sm btn-outline-primary"
                  onClick={async () => {
                    const cid = child?.id; if (!cid) return;
                    const token = localStorage.getItem('childToken');
                    const r = await fetch(`/children/${cid}/savers`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' },
                      body: JSON.stringify({ name: 'New item', target: 1 })
                    });
                    if (r.ok) {
                      const created = await r.json();
                      setSavers((prev) => [created, ...prev]);
                      setEditing({ id: created.id, field: 'name' });
                      push('success', 'Item added');
                    } else {
                      push('error', 'Failed to add');
                    }
                  }}
                >Add</button>
              </div>
              {savers.length === 0 ? (
                <div className="text-muted">No saver items yet.</div>
              ) : (
                <>
                <ul className="list-group list-group-flush">
                  {savers.filter((x) => !x.completed).map((s) => (
                    <li key={s.id} className="list-group-item">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          {editing?.id === s.id && editing.field === 'name' ? (
                            <input
                              className="form-control form-control-sm"
                              defaultValue={s.name}
                              autoFocus
                              onBlur={async (e) => {
                                const name = (e.target as HTMLInputElement).value;
                                if (name && name !== s.name) {
                                  const token = localStorage.getItem('childToken');
                                  const r = await fetch(`/savers/${s.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' }, body: JSON.stringify({ name }) });
                                  if (r.ok) push('success', 'Name saved'); else push('error', 'Save failed');
                                }
                                setEditing(null);
                                const cid = child?.id; if (!cid) return;
                                const tok = localStorage.getItem('childToken');
                                const rs = await fetch(`/children/${cid}/savers`, { headers: { Authorization: tok ? `Bearer ${tok}` : '' } });
                                setSavers(rs.ok ? await rs.json() : []);
                              }}
                              onKeyDown={async (e) => {
                                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                              }}
                            />
                          ) : (
                            <div className="fw-semibold" role="button" onClick={() => setEditing({ id: s.id, field: 'name' })}>{s.name}</div>
                          )}
                          <div className="small d-flex align-items-center gap-2">
                            <span className="text-muted">Weekly allocation:</span>
                            {weekData && weekData.totalPlanned > 0 ? (
                              <>
                                <select
                                  className="form-select form-select-sm"
                                  style={{ width: '7rem' }}
                                  defaultValue={String(Math.round((s.allocation * weekData.totalPlanned) / 100))}
                                  onChange={async (e) => {
                                    const coins = parseInt((e.target as HTMLSelectElement).value || '0', 10);
                                    const denom = weekData?.totalPlanned || 0;
                                    const pct = denom > 0 ? Math.max(0, Math.min(100, Math.round((coins / denom) * 100))) : s.allocation;
                                    const tok = localStorage.getItem('childToken');
                                    const r = await fetch(`/savers/${s.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: tok ? `Bearer ${tok}` : '' }, body: JSON.stringify({ allocation: pct }) });
                                    if (r.ok) push('success', 'Allocation updated'); else push('error', 'Update failed');
                                    const cid = child?.id; if (!cid) return;
                                    const rs = await fetch(`/children/${cid}/savers`, { headers: { Authorization: tok ? `Bearer ${tok}` : '' } });
                                    setSavers(rs.ok ? await rs.json() : []);
                                  }}
                                >
                                  {Array.from({ length: (weekData?.totalPlanned || 0) + 1 }).map((_, i) => (
                                    <option key={`alloc-opt-${s.id}-${i}`} value={i}>{i} {i === 1 ? 'coin' : 'coins'}</option>
                                  ))}
                                </select>
                              </>
                            ) : (
                              <span className="text-muted">(no weekly plan yet)</span>
                            )}
                          </div>
                        </div>
                        <div className="text-end" style={{minWidth: '12rem'}}>
                          {editing?.id === s.id && editing.field === 'target' ? (
                            <input
                              type="number"
                              min={1}
                              className="form-control form-control-sm d-inline-block"
                              defaultValue={s.target}
                              autoFocus
                              style={{maxWidth: '6rem'}}
                              onBlur={async (e) => {
                                const target = parseInt((e.target as HTMLInputElement).value || '0', 10);
                                if (target && target !== s.target) {
                                  const token = localStorage.getItem('childToken');
                                  const r = await fetch(`/savers/${s.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' }, body: JSON.stringify({ target }) });
                                  if (r.ok) push('success', 'Target saved'); else push('error', 'Save failed');
                                }
                                setEditing(null);
                                const cid = child?.id; if (!cid) return;
                                const tok = localStorage.getItem('childToken');
                                const rs = await fetch(`/children/${cid}/savers`, { headers: { Authorization: tok ? `Bearer ${tok}` : '' } });
                                setSavers(rs.ok ? await rs.json() : []);
                              }}
                              onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                            />
                          ) : (
                            <span
                              className={`badge ${balance && balance.available >= s.target ? 'bg-success' : 'bg-light text-dark'}`}
                              role="button"
                              onClick={() => setEditing({ id: s.id, field: 'target' })}
                            >
                              {balance?.available ?? 0} / {s.target}
                            </span>
                          )}
                          <div className="small text-muted mt-1">Reserved: {s.reserved || 0} / {s.target}</div>
                          {((s.target - (s.reserved || 0)) <= (balance?.available || 0)) ? (
                            <button
                              className="btn btn-sm btn-outline-success mt-1"
                              onClick={async () => {
                                const tok = localStorage.getItem('childToken');
                                const r = await fetch(`/savers/${s.id}/purchase`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: tok ? `Bearer ${tok}` : '' } });
                                if (r.ok) {
                                  push('success', `Purchased ${s.name}`);
                                  const cid = child?.id; if (!cid) return;
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
                                  try { const err = await r.json(); push('error', err?.error || 'Purchase failed'); } catch { push('error', 'Purchase failed'); }
                                }
                              }}
                            >Buy</button>
                          ) : null}
                          <button
                            className="btn btn-sm btn-outline-danger mt-1 ms-2"
                            onClick={async () => {
                              const tok = localStorage.getItem('childToken');
                              const r = await fetch(`/savers/${s.id}`, { method: 'DELETE', headers: { Authorization: tok ? `Bearer ${tok}` : '' } });
                              if (r.ok) {
                                push('success', 'Item removed');
                                setSavers((prev) => prev.filter((x) => x.id !== s.id));
                              } else {
                                push('error', 'Remove failed');
                              }
                            }}
                          >Delete</button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                {savers.filter((x) => x.completed).length > 0 ? (
                  <div className="mt-3">
                    <div className="small text-muted mb-1">Achieved</div>
                    <ul className="list-group list-group-flush">
                      {savers.filter((x) => x.completed).map((s) => (
                        <li key={`hist-${s.id}`} className="list-group-item d-flex justify-content-between align-items-center">
                          <div>
                            <div className="fw-semibold">{s.name}</div>
                            <div className="small text-muted">Completed {s.completedAt ? new Date(s.completedAt).toLocaleDateString() : ''}</div>
                          </div>
                          <span className="badge bg-light text-dark">{s.target} coins</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
