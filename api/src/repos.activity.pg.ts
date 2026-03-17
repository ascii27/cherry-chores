import { Pool } from 'pg';
import { ActivityRepository } from './repositories';
import { ActivityEntry } from './activity.types';

export class PgActivityRepo implements ActivityRepository {
  constructor(private pool: Pool) {}

  async init() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS activity_entries (
        id TEXT PRIMARY KEY,
        family_id TEXT NOT NULL,
        child_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        actor_id TEXT,
        actor_role TEXT,
        ref_id TEXT,
        amount INTEGER,
        note TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_activity_family_created ON activity_entries(family_id, created_at DESC);
    `);
  }

  async addEntry(entry: ActivityEntry): Promise<ActivityEntry> {
    await this.pool.query(
      'INSERT INTO activity_entries(id, family_id, child_id, event_type, actor_id, actor_role, ref_id, amount, note, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
      [
        entry.id,
        entry.familyId,
        entry.childId,
        entry.eventType,
        entry.actorId ?? null,
        entry.actorRole ?? null,
        entry.refId ?? null,
        entry.amount ?? null,
        entry.note ?? null,
        entry.createdAt,
      ]
    );
    return entry;
  }

  async listByFamily(familyId: string, opts?: { limit?: number; before?: string }): Promise<ActivityEntry[]> {
    const limit = opts?.limit ?? 50;
    const before = opts?.before;
    let query: string;
    let params: any[];
    if (before) {
      query = 'SELECT * FROM activity_entries WHERE family_id=$1 AND created_at < $2 ORDER BY created_at DESC LIMIT $3';
      params = [familyId, before, limit];
    } else {
      query = 'SELECT * FROM activity_entries WHERE family_id=$1 ORDER BY created_at DESC LIMIT $2';
      params = [familyId, limit];
    }
    const r = await this.pool.query(query, params);
    return r.rows.map((row: any) => ({
      id: row.id,
      familyId: row.family_id,
      childId: row.child_id,
      eventType: row.event_type,
      actorId: row.actor_id ?? undefined,
      actorRole: row.actor_role ?? undefined,
      refId: row.ref_id ?? undefined,
      amount: row.amount !== null ? Number(row.amount) : undefined,
      note: row.note ?? undefined,
      createdAt: row.created_at,
    }));
  }
}
