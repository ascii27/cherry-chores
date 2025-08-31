import React from 'react';

export default function Coin({ value, size = 22 }: { value: number; size?: number }) {
  const radius = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label={`${value} coins`} role="img">
      <defs>
        <radialGradient id="g" cx="50%" cy="35%" r="75%">
          <stop offset="0%" stopColor="#ffd54f" />
          <stop offset="60%" stopColor="#ffb300" />
          <stop offset="100%" stopColor="#ff8f00" />
        </radialGradient>
      </defs>
      <circle cx={radius} cy={radius} r={radius - 1} fill="url(#g)" stroke="#d88700" strokeWidth="2" />
      <text x="50%" y="56%" textAnchor="middle" fontSize={size * 0.55} fontWeight={700} fill="#6b3f00" fontFamily="system-ui, -apple-system, Segoe UI, Roboto, Inter, sans-serif">
        {value}
      </text>
    </svg>
  );
}

