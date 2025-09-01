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
      <div className="cc-toast-wrap" aria-live="polite" aria-atomic="false">
        {items.map((t) => (
          <div key={t.id} className={`cc-toast cc-toast--${t.kind}`} role="status">{t.text}</div>
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
