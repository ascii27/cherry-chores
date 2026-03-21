import React, { useEffect, useState } from 'react';
import GoldCoin from './GoldCoin';

const COIN_COUNT = 30;

interface CoinParticle {
  id: number;
  x: number;       // vw %
  driftStart: number; // px
  driftEnd: number;   // px
  delay: number;   // ms
  dur: number;     // ms
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
      id: trigger * 1000 + i,
      x: randomBetween(5, 95),
      driftStart: randomBetween(-30, 30),
      driftEnd: randomBetween(-60, 60),
      delay: randomBetween(0, 900),
      dur: randomBetween(1400, 2100),
    }));
    setParticles(next);
    const t = setTimeout(() => setParticles([]), 3200);
    return () => clearTimeout(t);
  }, [trigger, reduced]);

  if (particles.length === 0) return null;

  return (
    <>
      {particles.map((p) => (
        <div
          key={p.id}
          aria-hidden
          className="coin-rain-particle"
          style={{
            '--cr-x': `${p.x}vw`,
            '--cr-drift-start': `${p.driftStart}px`,
            '--cr-drift-end': `${p.driftEnd}px`,
            '--cr-delay': `${p.delay}ms`,
            '--cr-dur': `${p.dur}ms`,
          } as React.CSSProperties}
        >
          <GoldCoin size={22} />
        </div>
      ))}
    </>
  );
}
