import { Pool } from 'pg';
import { BankRepository } from './repositories';
import { LedgerEntry } from './bank.types';

export class PgBankRepo implements BankRepository {
  constructor(private pool: Pool) {}

  async init() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ledger (
        id TEXT PRIMARY KEY,
        child_id TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
        amount INTEGER NOT NULL,
        type TEXT NOT NULL,
        note TEXT,
        family_id TEXT,
        week_start TEXT,
        created_at TIMESTAMPTZ NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_ledger_child ON ledger(child_id);
      CREATE INDEX IF NOT EXISTS idx_ledger_payout ON ledger(child_id, family_id, week_start) WHERE type='payout';
    `);
  }

  async addLedgerEntry(entry: LedgerEntry): Promise<LedgerEntry> {
    await this.pool.query(
      'INSERT INTO ledger(id, child_id, amount, type, note, family_id, week_start, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
      [entry.id, entry.childId, entry.amount, entry.type, entry.note ?? null, entry.meta?.familyId ?? null, entry.meta?.weekStart ?? null, entry.createdAt]
    );
    return entry;
  }

  async getLedgerByChild(childId: string): Promise<LedgerEntry[]> {
    const r = await this.pool.query('SELECT * FROM ledger WHERE child_id=$1 ORDER BY created_at DESC', [childId]);
    return r.rows.map((row: any) => ({
      id: row.id,
      childId: row.child_id,
      amount: Number(row.amount),
      type: row.type,
      note: row.note ?? undefined,
      meta: { familyId: row.family_id ?? undefined, weekStart: row.week_start ?? undefined },
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : new Date(row.created_at).toISOString()
    }));
  }

  async getBalance(childId: string): Promise<{ available: number; reserved: number }> {
    const r = await this.pool.query('SELECT COALESCE(SUM(amount),0) AS bal FROM ledger WHERE child_id=$1', [childId]);
    const available = Number(r.rows[0]?.bal || 0);
    return { available, reserved: 0 };
  }

  async findPayoutForWeek(childId: string, familyId: string, weekStart: string): Promise<LedgerEntry | undefined> {
    const r = await this.pool.query(
      `SELECT * FROM ledger WHERE child_id=$1 AND family_id=$2 AND week_start=$3 AND type='payout' LIMIT 1`,
      [childId, familyId, weekStart]
    );
    if (!r.rowCount) return undefined;
    const row = r.rows[0];
    return {
      id: row.id,
      childId: row.child_id,
      amount: Number(row.amount),
      type: row.type,
      note: row.note ?? undefined,
      meta: { familyId: row.family_id ?? undefined, weekStart: row.week_start ?? undefined },
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : new Date(row.created_at).toISOString()
    };
  }
}

