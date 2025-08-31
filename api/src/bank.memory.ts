import { BankRepository } from './repositories';
import { LedgerEntry } from './bank.types';

export class InMemoryBankRepo implements BankRepository {
  private ledger = new Map<string, LedgerEntry[]>();

  async addLedgerEntry(entry: LedgerEntry): Promise<LedgerEntry> {
    const list = this.ledger.get(entry.childId) || [];
    list.push(entry);
    list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    this.ledger.set(entry.childId, list);
    return entry;
  }

  async getLedgerByChild(childId: string): Promise<LedgerEntry[]> {
    return (this.ledger.get(childId) || []).slice();
  }

  async getBalance(childId: string): Promise<{ available: number; reserved: number }> {
    const entries = this.ledger.get(childId) || [];
    const available = entries.reduce((sum, e) => sum + (e.amount || 0), 0);
    return { available, reserved: 0 };
  }

  async findPayoutForWeek(childId: string, familyId: string, weekStart: string): Promise<LedgerEntry | undefined> {
    const entries = this.ledger.get(childId) || [];
    return entries.find((e) => e.type === 'payout' && e.meta?.familyId === familyId && e.meta?.weekStart === weekStart);
  }
}
