import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ChildDashboard() {
  const nav = useNavigate();
  const [child, setChild] = useState<{ id: string; familyId: string } | null>(null);
  const [today, setToday] = useState<any[]>([]);
  const [weekData, setWeekData] = useState<{ days: any[]; totalPlanned: number; totalApproved: number; today: number } | null>(null);

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
                              const r1 = await fetch(`/children/${cid}/chores?scope=today`);
                              setToday(r1.ok ? await r1.json() : []);
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
                              const r1 = await fetch(`/children/${cid}/chores?scope=today`);
                              setToday(r1.ok ? await r1.json() : []);
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
    </div>
  );
}
