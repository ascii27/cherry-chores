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
        const rs = await fetch(`/children/${data.id}/savers`);
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
      <div className="row g-3">
        <div className="col-12 col-lg-4">
          <div className="card h-100">
            <div className="card-body">
              <h2 className="h6">Bank</h2>
              <div className="mb-2"><span className="text-muted me-2">Balance:</span><span className="badge bg-light text-dark">{balance?.available ?? 0}</span></div>
              <form
                className="d-flex gap-2"
                onSubmit={(e) => e.preventDefault()}
              >
                <input id="spend-amt" type="number" min={1} className="form-control" placeholder="Spend amount" />
                <button
                  className="btn btn-outline-primary"
                  onClick={async () => {
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
                  }}
                >
                  Spend
                </button>
              </form>
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
        <div className="col-12 col-lg-8">
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
        <div className="col-12 col-lg-8">
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
        <div className="col-12 col-lg-4">
          <div className="card h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h2 className="h6 mb-0">Saver Items</h2>
                <button
                  className="btn btn-sm btn-outline-primary"
                  onClick={async () => {
                    const cid = child?.id; if (!cid) return;
                    const name = window.prompt('Item name'); if (!name) return;
                    const targetStr = window.prompt('Target coins'); if (!targetStr) return;
                    const target = parseInt(targetStr, 10) || 0; if (!target) return;
                    const r = await fetch(`/children/${cid}/savers`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, target }) });
                    if (r.ok) {
                      push('success', 'Item added');
                      const rs = await fetch(`/children/${cid}/savers`);
                      setSavers(rs.ok ? await rs.json() : []);
                    } else push('error', 'Failed to add');
                  }}
                >Add</button>
              </div>
              {savers.length === 0 ? (
                <div className="text-muted">No saver items yet.</div>
              ) : (
                <ul className="list-group list-group-flush">
                  {savers.map((s) => {
                    const prog = s.target ? Math.min(100, Math.max(0, Math.round(((balance?.reserved || 0) / s.target) * 100))) : 0;
                    return (
                      <li key={s.id} className="list-group-item">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <div className="fw-semibold">{s.name}</div>
                            <div className="small text-muted">Goal: {s.isGoal ? `${s.allocation}%` : 'not a goal'}</div>
                          </div>
                          <div>
                            <span className={`badge ${balance && balance.available >= s.target ? 'bg-success' : 'bg-light text-dark'}`}>
                              {balance?.available ?? 0} / {s.target}
                            </span>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
