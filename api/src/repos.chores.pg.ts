import { Pool } from 'pg';
import { Chore, Completion } from './chores.types';
import { ChoresRepository } from './repositories';

export class PgChoresRepo implements ChoresRepository {
  constructor(private pool: Pool) {}

  async init() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS chores (
        id TEXT PRIMARY KEY,
        family_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        value INTEGER NOT NULL,
        recurrence TEXT NOT NULL,
        due_day INTEGER,
        requires_approval BOOLEAN NOT NULL,
        active BOOLEAN NOT NULL
      );
      CREATE TABLE IF NOT EXISTS chore_assignments (
        chore_id TEXT NOT NULL REFERENCES chores(id) ON DELETE CASCADE,
        child_id TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
        PRIMARY KEY (chore_id, child_id)
      );
      CREATE TABLE IF NOT EXISTS completions (
        id TEXT PRIMARY KEY,
        chore_id TEXT NOT NULL REFERENCES chores(id) ON DELETE CASCADE,
        child_id TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
        date TEXT NOT NULL,
        status TEXT NOT NULL
      );
    `);
  }

  async createChore(chore: Chore): Promise<Chore> {
    await this.pool.query(
      'INSERT INTO chores(id,family_id,name,description,value,recurrence,due_day,requires_approval,active) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
      [chore.id, chore.familyId, chore.name, chore.description ?? null, chore.value, chore.recurrence, chore.dueDay ?? null, chore.requiresApproval, chore.active]
    );
    for (const cid of chore.assignedChildIds) {
      await this.pool.query('INSERT INTO chore_assignments(chore_id, child_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [chore.id, cid]);
    }
    return chore;
  }
  async updateChore(chore: Chore): Promise<Chore> {
    await this.pool.query(
      'UPDATE chores SET name=$1, description=$2, value=$3, recurrence=$4, due_day=$5, requires_approval=$6, active=$7 WHERE id=$8',
      [chore.name, chore.description ?? null, chore.value, chore.recurrence, chore.dueDay ?? null, chore.requiresApproval, chore.active, chore.id]
    );
    await this.pool.query('DELETE FROM chore_assignments WHERE chore_id=$1', [chore.id]);
    for (const cid of chore.assignedChildIds) {
      await this.pool.query('INSERT INTO chore_assignments(chore_id, child_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [chore.id, cid]);
    }
    return chore;
  }
  async deleteChore(id: string): Promise<void> {
    await this.pool.query('DELETE FROM chores WHERE id=$1', [id]);
  }
  async getChoreById(id: string): Promise<Chore | undefined> {
    const r = await this.pool.query('SELECT * FROM chores WHERE id=$1', [id]);
    if (!r.rowCount) return undefined;
    const a = await this.pool.query('SELECT child_id FROM chore_assignments WHERE chore_id=$1', [id]);
    const row = r.rows[0];
    return {
      id: row.id,
      familyId: row.family_id,
      name: row.name,
      description: row.description ?? undefined,
      value: row.value,
      recurrence: row.recurrence,
      dueDay: row.due_day ?? undefined,
      requiresApproval: row.requires_approval,
      active: row.active,
      assignedChildIds: a.rows.map((x: any) => x.child_id)
    } as Chore;
  }
  async listChoresByFamily(familyId: string): Promise<Chore[]> {
    const r = await this.pool.query('SELECT * FROM chores WHERE family_id=$1', [familyId]);
    const ids = r.rows.map((x: any) => x.id);
    const assigns = await this.pool.query('SELECT chore_id, child_id FROM chore_assignments WHERE chore_id = ANY($1)', [ids]);
    const map = new Map<string, string[]>();
    for (const row of assigns.rows) {
      const arr = map.get(row.chore_id) || [];
      arr.push(row.child_id);
      map.set(row.chore_id, arr);
    }
    return r.rows.map((row: any) => ({
      id: row.id,
      familyId: row.family_id,
      name: row.name,
      description: row.description ?? undefined,
      value: row.value,
      recurrence: row.recurrence,
      dueDay: row.due_day ?? undefined,
      requiresApproval: row.requires_approval,
      active: row.active,
      assignedChildIds: map.get(row.id) || []
    }));
  }

  async createCompletion(c: Completion): Promise<Completion> {
    await this.pool.query('INSERT INTO completions(id,chore_id,child_id,date,status) VALUES ($1,$2,$3,$4,$5)', [c.id, c.choreId, c.childId, c.date, c.status]);
    return c;
  }
  async deleteCompletion(id: string): Promise<void> {
    await this.pool.query('DELETE FROM completions WHERE id=$1', [id]);
  }
  async listPendingCompletionsByFamily(familyId: string): Promise<Completion[]> {
    const r = await this.pool.query(
      `SELECT c.* FROM completions c
       JOIN chores h ON h.id=c.chore_id
       WHERE h.family_id=$1 AND c.status='pending'`,
      [familyId]
    );
    return r.rows.map((row: any) => ({ id: row.id, choreId: row.chore_id, childId: row.child_id, date: row.date, status: row.status }));
  }
  async listCompletionsForChildInRange(childId: string, start: string, end: string): Promise<Completion[]> {
    const r = await this.pool.query('SELECT * FROM completions WHERE child_id=$1 AND date BETWEEN $2 AND $3', [childId, start, end]);
    return r.rows.map((row: any) => ({ id: row.id, choreId: row.chore_id, childId: row.child_id, date: row.date, status: row.status }));
  }
}

