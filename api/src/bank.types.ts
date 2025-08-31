export type LedgerType = 'payout' | 'adjustment' | 'spend' | 'reserve' | 'release';

export interface LedgerEntry {
  id: string;
  childId: string;
  amount: number; // positive for credits, negative for debits
  type: LedgerType;
  note?: string;
  meta?: {
    familyId?: string;
    weekStart?: string; // YYYY-MM-DD (Sunday start)
    saverId?: string; // for reserve/release against a saver goal
  };
  actor?: {
    role: 'parent' | 'child' | 'system';
    id?: string;
    name?: string;
    email?: string;
  };
  createdAt: string; // ISO string
}
