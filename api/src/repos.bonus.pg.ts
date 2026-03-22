import { Pool } from 'pg';
import { BonusRepository } from './repositories';
import { Bonus, BonusClaim } from './bonus.types';

export class PgBonusRepo implements BonusRepository {
  constructor(private pool: Pool) {}

  async init() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS bonuses (
        id TEXT PRIMARY KEY,
        family_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        value INTEGER NOT NULL,
        claim_type TEXT NOT NULL,
        child_ids TEXT,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS bonus_claims (
        id TEXT PRIMARY KEY,
        bonus_id TEXT NOT NULL,
        child_id TEXT NOT NULL,
        note TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        rejection_reason TEXT,
        created_at TEXT NOT NULL,
        resolved_at TEXT,
        resolved_by TEXT
      );
    `);
  }

  private rowToBonus(row: any): Bonus {
    return {
      id: row.id,
      familyId: row.family_id,
      name: row.name,
      description: row.description ?? undefined,
      value: Number(row.value),
      claimType: row.claim_type,
      childIds: row.child_ids ? JSON.parse(row.child_ids) : undefined,
      active: row.active,
      createdAt: row.created_at,
    };
  }

  private rowToClaim(row: any): BonusClaim {
    return {
      id: row.id,
      bonusId: row.bonus_id,
      childId: row.child_id,
      note: row.note ?? undefined,
      status: row.status,
      rejectionReason: row.rejection_reason ?? undefined,
      createdAt: row.created_at,
      resolvedAt: row.resolved_at ?? undefined,
      resolvedBy: row.resolved_by ?? undefined,
    };
  }

  async createBonus(bonus: Bonus): Promise<Bonus> {
    await this.pool.query(
      'INSERT INTO bonuses(id, family_id, name, description, value, claim_type, child_ids, active, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
      [
        bonus.id,
        bonus.familyId,
        bonus.name,
        bonus.description ?? null,
        bonus.value,
        bonus.claimType,
        bonus.childIds ? JSON.stringify(bonus.childIds) : null,
        bonus.active,
        bonus.createdAt,
      ]
    );
    return bonus;
  }

  async updateBonus(bonus: Bonus): Promise<Bonus> {
    await this.pool.query(
      'UPDATE bonuses SET name=$1, description=$2, value=$3, claim_type=$4, child_ids=$5, active=$6 WHERE id=$7',
      [
        bonus.name,
        bonus.description ?? null,
        bonus.value,
        bonus.claimType,
        bonus.childIds ? JSON.stringify(bonus.childIds) : null,
        bonus.active,
        bonus.id,
      ]
    );
    return bonus;
  }

  async deleteBonus(id: string): Promise<void> {
    await this.pool.query('DELETE FROM bonuses WHERE id=$1', [id]);
  }

  async getBonusById(id: string): Promise<Bonus | undefined> {
    const r = await this.pool.query('SELECT * FROM bonuses WHERE id=$1', [id]);
    if (!r.rowCount) return undefined;
    return this.rowToBonus(r.rows[0]);
  }

  async listBonusesByFamily(familyId: string): Promise<Bonus[]> {
    const r = await this.pool.query('SELECT * FROM bonuses WHERE family_id=$1 ORDER BY created_at ASC', [familyId]);
    return r.rows.map((row: any) => this.rowToBonus(row));
  }

  async createClaim(claim: BonusClaim): Promise<BonusClaim> {
    await this.pool.query(
      'INSERT INTO bonus_claims(id, bonus_id, child_id, note, status, rejection_reason, created_at, resolved_at, resolved_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
      [
        claim.id,
        claim.bonusId,
        claim.childId,
        claim.note ?? null,
        claim.status,
        claim.rejectionReason ?? null,
        claim.createdAt,
        claim.resolvedAt ?? null,
        claim.resolvedBy ?? null,
      ]
    );
    return claim;
  }

  async getClaimById(id: string): Promise<BonusClaim | undefined> {
    const r = await this.pool.query('SELECT * FROM bonus_claims WHERE id=$1', [id]);
    if (!r.rowCount) return undefined;
    return this.rowToClaim(r.rows[0]);
  }

  async listClaimsByBonus(bonusId: string): Promise<BonusClaim[]> {
    const r = await this.pool.query('SELECT * FROM bonus_claims WHERE bonus_id=$1 ORDER BY created_at ASC', [bonusId]);
    return r.rows.map((row: any) => this.rowToClaim(row));
  }

  async listPendingClaimsByFamily(familyId: string): Promise<BonusClaim[]> {
    const r = await this.pool.query(
      `SELECT bc.* FROM bonus_claims bc
       JOIN bonuses b ON bc.bonus_id = b.id
       WHERE b.family_id=$1 AND bc.status='pending'
       ORDER BY bc.created_at ASC`,
      [familyId]
    );
    return r.rows.map((row: any) => this.rowToClaim(row));
  }

  async listClaimsByChild(childId: string): Promise<BonusClaim[]> {
    const r = await this.pool.query(
      'SELECT * FROM bonus_claims WHERE child_id=$1 ORDER BY created_at DESC',
      [childId]
    );
    return r.rows.map((row: any) => this.rowToClaim(row));
  }

  async hasChildClaimed(bonusId: string, childId: string): Promise<boolean> {
    const r = await this.pool.query(
      "SELECT 1 FROM bonus_claims WHERE bonus_id=$1 AND child_id=$2 AND status != 'rejected' LIMIT 1",
      [bonusId, childId]
    );
    return (r.rowCount ?? 0) > 0;
  }

  async updateClaim(claim: BonusClaim): Promise<BonusClaim> {
    await this.pool.query(
      'UPDATE bonus_claims SET status=$1, rejection_reason=$2, resolved_at=$3, resolved_by=$4 WHERE id=$5',
      [
        claim.status,
        claim.rejectionReason ?? null,
        claim.resolvedAt ?? null,
        claim.resolvedBy ?? null,
        claim.id,
      ]
    );
    return claim;
  }
}
