import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

type ToastKind = 'success' | 'error' | 'info';
interface ToastItem { id: string; kind: ToastKind; text: string; }

const ToastCtx = createContext<{ push: (kind: ToastKind, text: string) => void } | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((kind: ToastKind, text: string) => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setItems((prev) => [...prev, { id, kind, text }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);
  const value = useMemo(() => ({ push }), [push]);
  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div style={{ position: 'fixed', right: 16, bottom: 16, zIndex: 1080, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((t) => (
          <div key={t.id} className={`alert alert-${t.kind === 'error' ? 'danger' : t.kind === 'success' ? 'success' : 'secondary'} shadow-sm py-2 px-3`}>
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

