import { Pool } from 'pg';

export interface CatalogItem {
  id: string;
  familyId: string;
  name: string;
  description?: string;
  imageUrl?: string;
  priceCoins: number;
  active: boolean;
  sourceUrl?: string;
  createdAt: string;
}

export interface CatalogPurchase {
  id: string;
  itemId: string;
  childId: string;
  itemName: string;
  priceCoins: number;
  status: 'pending_delivery' | 'delivered';
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export class PgCatalogRepo {
  constructor(private pool: Pool) {}

  async init() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS catalog_items (
        id TEXT PRIMARY KEY,
        family_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        image_url TEXT,
        price_coins INTEGER NOT NULL,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        source_url TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_catalog_family ON catalog_items(family_id);

      CREATE TABLE IF NOT EXISTS catalog_purchases (
        id TEXT PRIMARY KEY,
        item_id TEXT NOT NULL,
        child_id TEXT NOT NULL,
        item_name TEXT NOT NULL,
        price_coins INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending_delivery',
        created_at TEXT NOT NULL,
        resolved_at TEXT,
        resolved_by TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_catalog_purchases_child ON catalog_purchases(child_id);
      CREATE INDEX IF NOT EXISTS idx_catalog_purchases_item ON catalog_purchases(item_id);
    `);
  }

  private rowToItem(row: any): CatalogItem {
    return {
      id: row.id,
      familyId: row.family_id,
      name: row.name,
      description: row.description ?? undefined,
      imageUrl: row.image_url ?? undefined,
      priceCoins: Number(row.price_coins),
      active: !!row.active,
      sourceUrl: row.source_url ?? undefined,
      createdAt: row.created_at,
    };
  }

  private rowToPurchase(row: any): CatalogPurchase {
    return {
      id: row.id,
      itemId: row.item_id,
      childId: row.child_id,
      itemName: row.item_name,
      priceCoins: Number(row.price_coins),
      status: row.status,
      createdAt: row.created_at,
      resolvedAt: row.resolved_at ?? undefined,
      resolvedBy: row.resolved_by ?? undefined,
    };
  }

  async createItem(item: CatalogItem): Promise<CatalogItem> {
    await this.pool.query(
      `INSERT INTO catalog_items (id, family_id, name, description, image_url, price_coins, active, source_url, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [item.id, item.familyId, item.name, item.description ?? null, item.imageUrl ?? null,
       item.priceCoins, item.active, item.sourceUrl ?? null, item.createdAt]
    );
    return item;
  }

  async listItemsByFamily(familyId: string): Promise<CatalogItem[]> {
    const res = await this.pool.query(
      `SELECT * FROM catalog_items WHERE family_id = $1 ORDER BY created_at DESC`,
      [familyId]
    );
    return res.rows.map(this.rowToItem);
  }

  async getItemById(id: string): Promise<CatalogItem | undefined> {
    const res = await this.pool.query(`SELECT * FROM catalog_items WHERE id = $1`, [id]);
    return res.rows[0] ? this.rowToItem(res.rows[0]) : undefined;
  }

  async updateItem(item: CatalogItem): Promise<CatalogItem> {
    await this.pool.query(
      `UPDATE catalog_items SET name=$1, description=$2, image_url=$3, price_coins=$4, active=$5, source_url=$6
       WHERE id=$7`,
      [item.name, item.description ?? null, item.imageUrl ?? null, item.priceCoins, item.active,
       item.sourceUrl ?? null, item.id]
    );
    return item;
  }

  async deleteItem(id: string): Promise<void> {
    await this.pool.query(`DELETE FROM catalog_items WHERE id = $1`, [id]);
  }

  async createPurchase(purchase: CatalogPurchase): Promise<CatalogPurchase> {
    await this.pool.query(
      `INSERT INTO catalog_purchases (id, item_id, child_id, item_name, price_coins, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [purchase.id, purchase.itemId, purchase.childId, purchase.itemName,
       purchase.priceCoins, purchase.status, purchase.createdAt]
    );
    return purchase;
  }

  async listPurchasesByChild(childId: string): Promise<CatalogPurchase[]> {
    const res = await this.pool.query(
      `SELECT * FROM catalog_purchases WHERE child_id = $1 ORDER BY created_at DESC`,
      [childId]
    );
    return res.rows.map(this.rowToPurchase);
  }

  async listPurchasesByFamily(familyId: string): Promise<CatalogPurchase[]> {
    const res = await this.pool.query(
      `SELECT cp.* FROM catalog_purchases cp
       JOIN catalog_items ci ON cp.item_id = ci.id
       WHERE ci.family_id = $1
       ORDER BY cp.created_at DESC`,
      [familyId]
    );
    return res.rows.map(this.rowToPurchase);
  }

  async updatePurchaseStatus(id: string, status: string, resolvedBy: string): Promise<void> {
    await this.pool.query(
      `UPDATE catalog_purchases SET status=$1, resolved_at=$2, resolved_by=$3 WHERE id=$4`,
      [status, new Date().toISOString(), resolvedBy, id]
    );
  }
}
