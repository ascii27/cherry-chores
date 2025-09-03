import React from 'react';
import coinUrl from 'bootstrap-icons/icons/coin.svg?url';

export default function Coin({ value, size = 22, animate = true, className }: { value: number; size?: number; animate?: boolean; className?: string }) {
  return (
    <span
      role="img"
      aria-label={`${value} coins`}
      className={`${animate ? 'coin-pop' : ''} ${className || ''}`.trim()}
      style={{ position: 'relative', display: 'inline-block', width: size, height: size, lineHeight: 0 }}
    >
      <img src={coinUrl} alt="" width={size} height={size} style={{ display: 'block' }} />
      <span
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          placeItems: 'center',
          fontWeight: 700,
          fontSize: Math.round(size * 0.55),
          color: 'var(--text)'
        }}
      >
        {value}
      </span>
    </span>
  );
}
