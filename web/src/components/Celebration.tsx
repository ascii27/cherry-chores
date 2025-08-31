import React, { useEffect, useState } from 'react';

export default function Celebration({ trigger }: { trigger: number }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (trigger > 0) {
      setVisible(true);
      const t = setTimeout(() => setVisible(false), 1500);
      return () => clearTimeout(t);
    }
  }, [trigger]);
  if (!visible) return null;
  return (
    <div aria-hidden
      style={{
        position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none', zIndex: 2000, fontSize: 48
      }}
    >
      <div role="img" aria-label="celebration">🎉🎉🎉</div>
    </div>
  );
}

