import React from 'react';

export default function GoldCoin({ size = 14, title }: { size?: number; title?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden={title ? undefined : true} role="img">
      {title ? <title>{title}</title> : null}
      <circle cx="12" cy="12" r="10" fill="url(#goldGrad)" stroke="#B45309" strokeWidth="1.25"/>
      <circle cx="12" cy="12" r="7.2" fill="url(#goldGrad2)" stroke="rgba(0,0,0,.06)" strokeWidth="0.75"/>
      <path d="M14.6 9.4c-.5-.7-1.3-1-2.4-1-1.4 0-2.2.7-2.2 1.6 0 2.2 4.9 1.1 4.9 3.6 0 1.1-1 1.9-2.7 1.9-1.3 0-2.3-.4-2.9-1" fill="none" stroke="#7C2D12" strokeWidth="1.4" strokeLinecap="round"/>
      <ellipse cx="9" cy="7.4" rx="2.8" ry="1.3" fill="rgba(255,255,255,.45)"/>
      <defs>
        <radialGradient id="goldGrad" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FFF3C4"/>
          <stop offset="55%" stopColor="#F5C542"/>
          <stop offset="100%" stopColor="#D97706"/>
        </radialGradient>
        <linearGradient id="goldGrad2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFE58F"/>
          <stop offset="100%" stopColor="#F59E0B"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

