import React from 'react';

export default function ProgressBar({ value, max = 100, color }: { value: number; max?: number; color?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round((value / max) * 100)));
  return (
    <div className="progress-round" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} role="progressbar">
      <span style={{ width: pct + '%', background: color || undefined }} />
    </div>
  );
}

