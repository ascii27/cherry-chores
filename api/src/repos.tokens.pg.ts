import { Pool } from 'pg';
import crypto from 'crypto';
import { TokensRepository } from './repositories';

export class PgTokensRepo implements TokensRepository {
  constructor(private pool: Pool) {}

  async init() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS api_tokens (
        id TEXT PRIMARY KEY,
        parent_id TEXT NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
        label TEXT,
        token_hash TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP NOT NULL,
        last_used_at TIMESTAMP,
        expires_at TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_api_tokens_parent ON api_tokens(parent_id);
      CREATE INDEX IF NOT EXISTS idx_api_tokens_token_hash ON api_tokens(token_hash);
    `);
  }

  async createToken(parentId: string, label?: string, expiresAt?: string | null) {
    const id = `tok_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const raw = crypto.randomBytes(24).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(raw).digest('hex');
    const createdAt = new Date().toISOString();
    await this.pool.query(
      `INSERT INTO api_tokens(id, parent_id, label, token_hash, created_at, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [id, parentId, label ?? null, tokenHash, createdAt, expiresAt ?? null]
    );
    return { id, token: raw, label, createdAt, expiresAt: expiresAt ?? null };
  }

  async listTokens(parentId: string) {
    const r = await this.pool.query(
      'SELECT id, label, created_at, last_used_at, expires_at FROM api_tokens WHERE parent_id=$1 ORDER BY created_at DESC',
      [parentId]
    );
    return r.rows.map((row) => ({
      id: row.id as string,
      label: (row.label ?? undefined) as string | undefined,
      createdAt: new Date(row.created_at).toISOString(),
      lastUsedAt: row.last_used_at ? new Date(row.last_used_at).toISOString() : undefined,
      expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : null
    }));
  }

  async revokeToken(parentId: string, id: string) {
    await this.pool.query('DELETE FROM api_tokens WHERE id=$1 AND parent_id=$2', [id, parentId]);
  }

  async verify(rawToken: string) {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const r = await this.pool.query('SELECT id, parent_id, expires_at FROM api_tokens WHERE token_hash=$1', [tokenHash]);
    if (!r.rowCount) return null;
    const row = r.rows[0];
    if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) return null;
    await this.pool.query('UPDATE api_tokens SET last_used_at=$1 WHERE id=$2', [new Date().toISOString(), row.id]);
    return { parentId: row.parent_id as string, tokenId: row.id as string };
  }
}

