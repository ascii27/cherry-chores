/**
 * db.ts — centralised Postgres pool factory
 *
 * Supports two backends:
 *   1. Plain Postgres  — set DATABASE_URL
 *   2. Supabase        — set SUPABASE_DB_URL  (takes priority)
 *                        or set DATABASE_URL to your Supabase connection string
 *
 * Supabase requires SSL. If the connection string contains "supabase.co" or
 * SUPABASE_DB_URL is set, SSL is enabled automatically with
 * `rejectUnauthorized: false` (Supabase uses a self-signed cert on the pooler).
 *
 * Env vars:
 *   SUPABASE_DB_URL   — Supabase "Direct connection" or "Transaction pooler" URL
 *   DATABASE_URL      — Any valid postgres:// connection string
 *   DB_SSL            — "true" | "false" override (overrides auto-detection)
 */

import { Pool, PoolConfig } from 'pg';

function resolveConnectionString(): string {
  const url = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
  if (!url) {
    throw new Error('No database connection string found. Set SUPABASE_DB_URL or DATABASE_URL.');
  }
  return url;
}

function needsSsl(connectionString: string): boolean {
  // Explicit override
  if (process.env.DB_SSL === 'true') return true;
  if (process.env.DB_SSL === 'false') return false;
  // Auto-detect Supabase
  if (process.env.SUPABASE_DB_URL) return true;
  if (connectionString.includes('supabase.co')) return true;
  if (connectionString.includes('sslmode=require')) return true;
  return false;
}

export function createPool(): Pool {
  const connectionString = resolveConnectionString();
  const ssl = needsSsl(connectionString);

  const config: PoolConfig = {
    connectionString,
    // Strip sslmode from the query string so pg doesn't get confused,
    // then apply ssl config directly.
    ...(ssl ? { ssl: { rejectUnauthorized: false } } : {}),
  };

  const label = process.env.SUPABASE_DB_URL ? 'supabase' : 'postgres';
  console.log(`[db] connecting via ${label}${ssl ? ' (ssl)' : ''}`);

  return new Pool(config);
}
