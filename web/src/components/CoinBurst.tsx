import React, { useEffect, useState } from 'react';
import GoldCoin from './GoldCoin';

const COIN_COUNT = 8;

interface CoinParticle {
  id: number;
  angle: number;   // degrees
  dist: number;    // px
  delay: number;   // ms
}

function randomBetween(a: number, b: number) {
  return a + Math.random() * (b - a);
}

export default function CoinBurst({ trigger }: { trigger: number }) {
  const [particles, setParticles] = useState<CoinParticle[]>([]);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    try {
      const m = window.matchMedia('(prefers-reduced-motion: reduce)');
      setReduced(!!m.matches);
    } catch {}
  }, []);

  useEffect(() => {
    if (reduced || trigger === 0) return;
    const next: CoinParticle[] = Array.from({ length: COIN_COUNT }, (_, i) => ({
      id: trigger * 100 + i,
      angle: randomBetween(-150, -30), // fan upward (negative = up in CSS)
      dist: randomBetween(60, 140),
      delay: randomBetween(0, 80),
    }));
    setParticles(next);
    const t = setTimeout(() => setParticles([]), 900);
    return () => clearTimeout(t);
  }, [trigger, reduced]);

  if (particles.length === 0) return null;

  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        bottom: '30%',
        left: '50%',
        transform: 'translateX(-50%)',
        pointerEvents: 'none',
        zIndex: 2100,
        width: 0,
        height: 0,
      }}
    >
      {particles.map((p) => (
        <div
          key={p.id}
          className="coin-burst-particle"
          style={{
            '--cb-angle': `${p.angle}deg`,
            '--cb-dist': `${p.dist}px`,
            '--cb-delay': `${p.delay}ms`,
          } as React.CSSProperties}
        >
          <GoldCoin size={20} />
        </div>
      ))}
    </div>
  );
}
