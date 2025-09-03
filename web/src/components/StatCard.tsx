import React from 'react';

export default function StatCard({ icon, label, value, accent }: { icon?: string; label: string; value: React.ReactNode; accent?: string | null }) {
  return (
    <div className="stat-card d-flex align-items-center justify-content-between">
      <div>
        <div className="label">{label}</div>
        <div className="value">{value}</div>
      </div>
      {icon ? <div className="icon" aria-hidden>{icon}</div> : null}
    </div>
  );
}

