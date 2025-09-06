import { Pool } from 'pg';
import { UploadRecord, UploadScope } from './uploads.types';

export class PgUploadsRepo {
  constructor(private pool: Pool) {}

  async init() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS uploads (
        id TEXT PRIMARY KEY,
        owner_role TEXT NOT NULL,
        owner_id TEXT NOT NULL,
        scope TEXT NOT NULL,
        s3_key TEXT NOT NULL,
        url TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS uploads_owner_idx ON uploads(owner_role, owner_id);
    `);
  }

  async createUpload(rec: UploadRecord): Promise<UploadRecord> {
    await this.pool.query(
      'INSERT INTO uploads(id, owner_role, owner_id, scope, s3_key, url, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [rec.id, rec.ownerRole, rec.ownerId, rec.scope, rec.key, rec.url, rec.createdAt]
    );
    return rec;
  }

  async listUploads(ownerRole: 'child'|'parent', ownerId: string, scope?: UploadScope): Promise<UploadRecord[]> {
    const q = scope
      ? { text: 'SELECT id, owner_role, owner_id, scope, s3_key, url, created_at FROM uploads WHERE owner_role=$1 AND owner_id=$2 AND scope=$3 ORDER BY created_at DESC', values: [ownerRole, ownerId, scope] }
      : { text: 'SELECT id, owner_role, owner_id, scope, s3_key, url, created_at FROM uploads WHERE owner_role=$1 AND owner_id=$2 ORDER BY created_at DESC', values: [ownerRole, ownerId] };
    const r = await this.pool.query(q);
    return r.rows.map(row => ({ id: row.id, ownerRole: row.owner_role, ownerId: row.owner_id, scope: row.scope, key: row.s3_key, url: row.url, createdAt: row.created_at?.toISOString?.() || row.created_at }));
  }

  async getUploadById(id: string): Promise<UploadRecord | undefined> {
    const r = await this.pool.query('SELECT id, owner_role, owner_id, scope, s3_key, url, created_at FROM uploads WHERE id=$1', [id]);
    if (r.rowCount === 0) return undefined;
    const row = r.rows[0];
    return { id: row.id, ownerRole: row.owner_role, ownerId: row.owner_id, scope: row.scope, key: row.s3_key, url: row.url, createdAt: row.created_at?.toISOString?.() || row.created_at };
  }
}

