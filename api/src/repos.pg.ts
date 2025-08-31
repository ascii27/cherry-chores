import { Pool } from 'pg';
import { ChildUser, Family, ParentUser } from './types';
import { FamiliesRepository, UsersRepository } from './repositories';

export class PgRepos implements UsersRepository, FamiliesRepository {
  private pool: Pool;
  private ready: Promise<void>;

  constructor(pool?: Pool) {
    this.pool = pool ?? new Pool({ connectionString: process.env.DATABASE_URL });
    this.ready = this.init();
  }

  private async init() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS parents (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS families (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        timezone TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS family_parents (
        parent_id TEXT NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
        family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
        PRIMARY KEY (parent_id, family_id)
      );
      CREATE TABLE IF NOT EXISTS children (
        id TEXT PRIMARY KEY,
        family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
        username TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        display_name TEXT NOT NULL,
        UNIQUE (family_id, username)
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_children_username ON children(username);
    `);
  }

  private async ensureReady() {
    await this.ready;
  }

  // UsersRepository impl
  async getParentByEmail(email: string): Promise<ParentUser | undefined> {
    await this.ensureReady();
    const p = await this.pool.query('SELECT id, email, name FROM parents WHERE email=$1', [email]);
    if (!p.rowCount) return undefined;
    const links = await this.pool.query('SELECT family_id FROM family_parents WHERE parent_id=$1', [p.rows[0].id]);
    return { id: p.rows[0].id, email: p.rows[0].email, name: p.rows[0].name, families: links.rows.map((r: any) => r.family_id) };
  }

  async getParentById(id: string): Promise<ParentUser | undefined> {
    await this.ensureReady();
    const p = await this.pool.query('SELECT id, email, name FROM parents WHERE id=$1', [id]);
    if (!p.rowCount) return undefined;
    const links = await this.pool.query('SELECT family_id FROM family_parents WHERE parent_id=$1', [id]);
    return { id, email: p.rows[0].email, name: p.rows[0].name, families: links.rows.map((r: any) => r.family_id) };
  }

  async upsertParent(user: ParentUser): Promise<ParentUser> {
    await this.ensureReady();
    await this.pool.query(
      `INSERT INTO parents(id, email, name) VALUES ($1,$2,$3)
       ON CONFLICT (id) DO UPDATE SET email=EXCLUDED.email, name=EXCLUDED.name`,
      [user.id, user.email, user.name]
    );
    for (const fid of user.families) {
      await this.pool.query(
        `INSERT INTO family_parents(parent_id, family_id) VALUES ($1,$2)
         ON CONFLICT DO NOTHING`,
        [user.id, fid]
      );
    }
    return user;
  }

  async getChildByUsername(username: string): Promise<ChildUser | undefined> {
    await this.ensureReady();
    const c = await this.pool.query(
      'SELECT id, family_id, username, password_hash, display_name FROM children WHERE username=$1',
      [username]
    );
    if (!c.rowCount) return undefined;
    const r = c.rows[0];
    return { id: r.id, familyId: r.family_id, username: r.username, passwordHash: r.password_hash, displayName: r.display_name };
  }

  async getChildById(id: string): Promise<ChildUser | undefined> {
    await this.ensureReady();
    const c = await this.pool.query('SELECT id, family_id, username, password_hash, display_name FROM children WHERE id=$1', [id]);
    if (!c.rowCount) return undefined;
    const r = c.rows[0];
    return { id: r.id, familyId: r.family_id, username: r.username, passwordHash: r.password_hash, displayName: r.display_name };
  }

  async createChild(child: ChildUser): Promise<ChildUser> {
    await this.ensureReady();
    // pre-check global uniqueness for friendly error
    const dup = await this.pool.query('SELECT 1 FROM children WHERE username=$1', [child.username]);
    if (dup.rowCount) {
      const err: any = new Error('username taken');
      err.code = 409;
      throw err;
    }
    await this.pool.query(
      'INSERT INTO children(id, family_id, username, password_hash, display_name) VALUES ($1,$2,$3,$4,$5)',
      [child.id, child.familyId, child.username, child.passwordHash, child.displayName]
    );
    return child;
  }

  async updateChild(id: string, update: Partial<Pick<ChildUser, 'username' | 'passwordHash' | 'displayName'>>) {
    await this.ensureReady();
    const cur = await this.pool.query('SELECT id, family_id, username, password_hash, display_name FROM children WHERE id=$1', [id]);
    if (!cur.rowCount) return undefined;
    const r = cur.rows[0];
    if (update.username && update.username !== r.username) {
      const dup = await this.pool.query('SELECT 1 FROM children WHERE family_id=$1 AND username=$2 AND id<>$3', [r.family_id, update.username, id]);
      if (dup.rowCount) {
        const err: any = new Error('username taken');
        err.code = 409;
        throw err;
      }
    }
    const nextUsername = update.username ?? r.username;
    const nextPw = update.passwordHash ?? r.password_hash;
    const nextName = update.displayName ?? r.display_name;
    await this.pool.query('UPDATE children SET username=$1, password_hash=$2, display_name=$3 WHERE id=$4', [nextUsername, nextPw, nextName, id]);
    return { id, familyId: r.family_id, username: nextUsername, passwordHash: nextPw, displayName: nextName };
  }

  async deleteChild(id: string): Promise<void> {
    await this.ensureReady();
    await this.pool.query('DELETE FROM children WHERE id=$1', [id]);
  }

  // FamiliesRepository impl
  async createFamily(family: Family): Promise<Family> {
    await this.ensureReady();
    await this.pool.query('INSERT INTO families(id, name, timezone) VALUES ($1,$2,$3)', [family.id, family.name, family.timezone]);
    for (const pid of family.parentIds) {
      await this.pool.query('INSERT INTO family_parents(parent_id, family_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [pid, family.id]);
    }
    return family;
  }

  async getFamilyById(id: string): Promise<Family | undefined> {
    await this.ensureReady();
    const f = await this.pool.query('SELECT id, name, timezone FROM families WHERE id=$1', [id]);
    if (!f.rowCount) return undefined;
    const parents = await this.pool.query('SELECT parent_id FROM family_parents WHERE family_id=$1', [id]);
    const children = await this.pool.query('SELECT id FROM children WHERE family_id=$1', [id]);
    return {
      id,
      name: f.rows[0].name,
      timezone: f.rows[0].timezone,
      parentIds: parents.rows.map((r: any) => r.parent_id),
      childIds: children.rows.map((r: any) => r.id)
    };
  }

  async updateFamily(family: Family): Promise<Family> {
    await this.ensureReady();
    await this.pool.query('UPDATE families SET name=$1, timezone=$2 WHERE id=$3', [family.name, family.timezone, family.id]);
    return family;
  }

  async removeParentFromFamily(familyId: string, parentId: string): Promise<void> {
    await this.ensureReady();
    await this.pool.query('DELETE FROM family_parents WHERE family_id=$1 AND parent_id=$2', [familyId, parentId]);
  }
}
