import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ChildDashboard() {
  const nav = useNavigate();
  const [child, setChild] = useState<{ id: string; familyId: string } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('childToken');
    if (!token) {
      nav('/');
      return;
    }
    // For now, we can reuse /me endpoint to confirm role if needed in future
    setChild({ id: 'me', familyId: 'unknown' });
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
      <div className="card">
        <div className="card-body">
          <p className="mb-0">Welcome! Your chores and bank info will appear here.</p>
        </div>
      </div>
    </div>
  );
}

