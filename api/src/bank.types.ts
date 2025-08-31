export type LedgerType = 'payout' | 'adjustment' | 'spend';

export interface LedgerEntry {
  id: string;
  childId: string;
  amount: number; // positive for credits, negative for debits
  type: LedgerType;
  note?: string;
  meta?: {
    familyId?: string;
    weekStart?: string; // YYYY-MM-DD (Sunday start)
  };
  actor?: {
    role: 'parent' | 'child' | 'system';
    id?: string;
    name?: string;
    email?: string;
  };
  createdAt: string; // ISO string
}
