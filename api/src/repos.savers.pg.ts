import { Pool } from 'pg';
import { SaverItem } from './savers.types';
import { SaversRepository } from './repositories';

export class PgSaversRepo implements SaversRepository {
  constructor(private pool: Pool) {}

  async init() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS savers (
        id TEXT PRIMARY KEY,
        child_id TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        image_url TEXT,
        target INTEGER NOT NULL,
        is_goal BOOLEAN NOT NULL,
        allocation INTEGER NOT NULL,
        completed BOOLEAN NOT NULL DEFAULT false,
        completed_at TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS idx_savers_child ON savers(child_id);
    `);
    await this.pool.query(`
      ALTER TABLE savers ADD COLUMN IF NOT EXISTS completed BOOLEAN NOT NULL DEFAULT false;
      ALTER TABLE savers ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
    `);
  }

  async createSaver(item: SaverItem): Promise<SaverItem> {
    await this.pool.query(
      'INSERT INTO savers(id,child_id,name,description,image_url,target,is_goal,allocation,completed,completed_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
      [item.id, item.childId, item.name, item.description ?? null, item.imageUrl ?? null, item.target, item.isGoal, item.allocation, item.completed ?? false, item.completedAt ?? null]
    );
    return item;
  }
  async listSaversByChild(childId: string): Promise<SaverItem[]> {
    const r = await this.pool.query('SELECT * FROM savers WHERE child_id=$1 ORDER BY completed ASC, name', [childId]);
    return r.rows.map((row: any) => ({
      id: row.id,
      childId: row.child_id,
      name: row.name,
      description: row.description ?? undefined,
      imageUrl: row.image_url ?? undefined,
      target: Number(row.target),
      isGoal: row.is_goal,
      allocation: Number(row.allocation),
      completed: !!row.completed,
      completedAt: row.completed_at ? (row.completed_at instanceof Date ? row.completed_at.toISOString() : new Date(row.completed_at).toISOString()) : undefined
    }));
  }
  async updateSaver(item: SaverItem): Promise<SaverItem> {
    await this.pool.query(
      'UPDATE savers SET name=$1, description=$2, image_url=$3, target=$4, is_goal=$5, allocation=$6, completed=$7, completed_at=$8 WHERE id=$9',
      [item.name, item.description ?? null, item.imageUrl ?? null, item.target, item.isGoal, item.allocation, !!item.completed, item.completedAt ?? null, item.id]
    );
    return item;
  }
  async getSaverById(id: string): Promise<SaverItem | undefined> {
    const r = await this.pool.query('SELECT * FROM savers WHERE id=$1', [id]);
    if (!r.rowCount) return undefined;
    const row = r.rows[0];
    return {
      id: row.id,
      childId: row.child_id,
      name: row.name,
      description: row.description ?? undefined,
      imageUrl: row.image_url ?? undefined,
      target: Number(row.target),
      isGoal: row.is_goal,
      allocation: Number(row.allocation),
      completed: !!row.completed,
      completedAt: row.completed_at ? (row.completed_at instanceof Date ? row.completed_at.toISOString() : new Date(row.completed_at).toISOString()) : undefined
    };
  }
  async deleteSaver(id: string): Promise<void> {
    await this.pool.query('DELETE FROM savers WHERE id=$1', [id]);
  }
}
