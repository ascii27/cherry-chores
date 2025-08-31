import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ChildDashboard() {
  const nav = useNavigate();
  const [child, setChild] = useState<{ id: string; familyId: string } | null>(null);
  const [today, setToday] = useState<any[]>([]);
  const [week, setWeek] = useState<any[]>([]);

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
        const r2 = await fetch(`/children/${data.id}/chores?scope=week`);
        setToday(r1.ok ? await r1.json() : []);
        setWeek(r2.ok ? await r2.json() : []);
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
              {week.length === 0 ? (
                <div className="text-muted">No chores this week.</div>
              ) : (
                <ul className="list-group list-group-flush">
                  {week.map((w) => (
                    <li key={w.id} className="list-group-item d-flex justify-content-between align-items-center">
                      <div>
                        <div className="fw-semibold">{w.name}</div>
                        <div className="small text-muted">{w.description || ''}</div>
                      </div>
                      <span className="badge bg-light text-dark">{w.dueDay !== undefined ? ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][w.dueDay] : 'Daily'}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
