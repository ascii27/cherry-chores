import { Request, Router } from 'express';
import { llm } from '../llm';
import { AuthedRequest, requireRole } from '../middleware/auth';
import { FamiliesRepository, UsersRepository, BankRepository, ActivityRepository } from '../repositories';
import { PgCatalogRepo, CatalogItem, CatalogPurchase } from '../repos.catalog.pg';
import { LedgerEntry } from '../bank.types';

export function catalogRoutes(opts: {
  catalog: PgCatalogRepo;
  users: UsersRepository;
  families: FamiliesRepository;
  bank: BankRepository;
  activity?: ActivityRepository;
}) {
  const router = Router();
  const { catalog, users, families, bank } = opts;

  // GET /api/families/:familyId/catalog
  router.get('/families/:familyId/catalog', async (req: Request, res) => {
    const actor = (req as AuthedRequest).user;
    if (!actor) return res.status(401).json({ error: 'unauthorized' });

    const { familyId } = req.params;
    const fam = await families.getFamilyById(familyId);
    if (!fam) return res.status(404).json({ error: 'family not found' });

    if (actor.role === 'parent') {
      if (!fam.parentIds.includes(actor.id)) return res.status(403).json({ error: 'forbidden' });
      const items = await catalog.listItemsByFamily(familyId);
      return res.json(items);
    } else if (actor.role === 'child') {
      const child = await users.getChildById(actor.id);
      if (!child || child.familyId !== familyId) return res.status(403).json({ error: 'forbidden' });
      const items = await catalog.listItemsByFamily(familyId);
      return res.json(items.filter((i) => i.active));
    }
    return res.status(403).json({ error: 'forbidden' });
  });

  // POST /api/families/:familyId/catalog (parent only)
  router.post('/families/:familyId/catalog', requireRole('parent'), async (req: Request, res) => {
    const { familyId } = req.params;
    const fam = await families.getFamilyById(familyId);
    if (!fam) return res.status(404).json({ error: 'family not found' });
    if (!fam.parentIds.includes((req as AuthedRequest).user!.id)) return res.status(403).json({ error: 'forbidden' });

    const { name, description, imageUrl, priceCoins, sourceUrl } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name is required' });
    if (typeof priceCoins !== 'number' || !Number.isInteger(priceCoins) || priceCoins <= 0)
      return res.status(400).json({ error: 'priceCoins must be a positive integer' });

    const item: CatalogItem = {
      id: `cat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      familyId,
      name,
      description: description || undefined,
      imageUrl: imageUrl || undefined,
      priceCoins,
      active: true,
      sourceUrl: sourceUrl || undefined,
      createdAt: new Date().toISOString(),
    };
    const created = await catalog.createItem(item);
    return res.status(201).json(created);
  });

  // POST /api/families/:familyId/catalog/preview (parent only) — URL scrape + AI description
  router.post('/families/:familyId/catalog/preview', requireRole('parent'), async (req: Request, res) => {
    const { familyId } = req.params;
    const fam = await families.getFamilyById(familyId);
    if (!fam) return res.status(404).json({ error: 'family not found' });
    if (!fam.parentIds.includes((req as AuthedRequest).user!.id)) return res.status(403).json({ error: 'forbidden' });

    const { url } = req.body || {};
    if (!url || typeof url !== 'string') return res.status(400).json({ error: 'url is required' });

    try {
      console.log(`[catalog/preview] fetching URL: ${url}`);
      const html = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CherryChores/1.0)' },
        signal: AbortSignal.timeout(8000),
      }).then((r) => r.text());
      console.log(`[catalog/preview] fetched ${html.length} bytes from ${url}`);

      // Extract og meta tags
      const og = (prop: string) => {
        const m = html.match(new RegExp(`<meta[^>]+property=["']og:${prop}["'][^>]+content=["']([^"']+)["']`, 'i'))
          || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${prop}["']`, 'i'));
        return m?.[1] ?? undefined;
      };
      const tw = (name: string) => {
        const m = html.match(new RegExp(`<meta[^>]+name=["']twitter:${name}["'][^>]+content=["']([^"']+)["']`, 'i'))
          || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:${name}["']`, 'i'));
        return m?.[1] ?? undefined;
      };
      const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1];

      const rawTitle = og('title') || tw('title') || titleTag || 'Item';
      const rawDescription = og('description') || tw('description') || '';
      const imageUrl = og('image') || tw('image') || undefined;
      console.log(`[catalog/preview] parsed — title: "${rawTitle}", description: "${rawDescription?.slice(0, 80)}", image: ${imageUrl}`);

      // AI-generate a kid-friendly description
      let description = rawDescription;
      try {
        console.log(`[catalog/preview] calling LLM (provider: ${llm.name}) for kid-friendly description`);
        description = await llm.generate(
          `Generate a fun, kid-friendly description (max 40 words) for this product: "${rawTitle}". Context: "${rawDescription}". Use simple language for a 10-year-old, enthusiastic tone. Reply with only the description text, no quotes.`,
          { maxTokens: 80, temperature: 0.7 },
        );
        console.log(`[catalog/preview] LLM response: "${description}"`);
      } catch (llmErr: any) {
        console.error(`[catalog/preview] LLM failed, falling back to raw description:`, llmErr?.message || llmErr);
      }

      return res.json({ title: rawTitle, description, imageUrl, sourceUrl: url });
    } catch (err: any) {
      console.error(`[catalog/preview] fetch error for ${url}:`, err?.message || err);
      return res.status(400).json({ error: `Could not fetch URL: ${err?.message || 'unknown error'}` });
    }
  });

  // PATCH /api/catalog/:id (parent only)
  router.patch('/catalog/:id', requireRole('parent'), async (req: Request, res) => {
    const item = await catalog.getItemById(req.params.id);
    if (!item) return res.status(404).json({ error: 'not found' });
    const fam = await families.getFamilyById(item.familyId);
    if (!fam || !fam.parentIds.includes((req as AuthedRequest).user!.id)) return res.status(403).json({ error: 'forbidden' });

    const { name, description, imageUrl, priceCoins, active, sourceUrl } = req.body || {};
    const updated: CatalogItem = {
      ...item,
      name: name ?? item.name,
      description: description !== undefined ? description : item.description,
      imageUrl: imageUrl !== undefined ? imageUrl : item.imageUrl,
      priceCoins: typeof priceCoins === 'number' ? priceCoins : item.priceCoins,
      active: active !== undefined ? !!active : item.active,
      sourceUrl: sourceUrl !== undefined ? sourceUrl : item.sourceUrl,
    };
    await catalog.updateItem(updated);
    return res.json(updated);
  });

  // DELETE /api/catalog/:id (parent only)
  router.delete('/catalog/:id', requireRole('parent'), async (req: Request, res) => {
    const item = await catalog.getItemById(req.params.id);
    if (!item) return res.status(404).json({ error: 'not found' });
    const fam = await families.getFamilyById(item.familyId);
    if (!fam || !fam.parentIds.includes((req as AuthedRequest).user!.id)) return res.status(403).json({ error: 'forbidden' });
    await catalog.deleteItem(req.params.id);
    return res.status(204).send();
  });

  // POST /api/catalog/:id/buy (child only) — instant deduction
  router.post('/catalog/:id/buy', requireRole('child'), async (req: Request, res) => {
    const actor = (req as AuthedRequest).user!;
    const item = await catalog.getItemById(req.params.id);
    if (!item || !item.active) return res.status(404).json({ error: 'item not found or inactive' });

    const child = await users.getChildById(actor.id);
    if (!child) return res.status(404).json({ error: 'child not found' });

    const fam = await families.getFamilyById(item.familyId);
    if (!fam || child.familyId !== item.familyId) return res.status(403).json({ error: 'forbidden' });

    const bal = await bank.getBalance(actor.id);
    if (bal.available < item.priceCoins)
      return res.status(400).json({ error: 'insufficient coins', available: bal.available, required: item.priceCoins });

    const ledgerEntry: LedgerEntry = {
      id: `purchase_${Date.now()}`,
      childId: actor.id,
      amount: -item.priceCoins,
      type: 'spend',
      note: `Bought: ${item.name}`,
      actor: { role: 'child', id: actor.id, name: child.displayName || child.username },
      createdAt: new Date().toISOString(),
    };
    await bank.addLedgerEntry(ledgerEntry);

    const purchase: CatalogPurchase = {
      id: `cpurchase_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      itemId: item.id,
      childId: actor.id,
      itemName: item.name,
      priceCoins: item.priceCoins,
      status: 'pending_delivery',
      createdAt: new Date().toISOString(),
    };
    await catalog.createPurchase(purchase);

    const newBalance = await bank.getBalance(actor.id);
    return res.status(201).json({ purchase, balance: newBalance });
  });

  // GET /api/families/:familyId/catalog/purchases (parent only)
  router.get('/families/:familyId/catalog/purchases', requireRole('parent'), async (req: Request, res) => {
    const { familyId } = req.params;
    const fam = await families.getFamilyById(familyId);
    if (!fam) return res.status(404).json({ error: 'family not found' });
    if (!fam.parentIds.includes((req as AuthedRequest).user!.id)) return res.status(403).json({ error: 'forbidden' });
    const purchases = await catalog.listPurchasesByFamily(familyId);
    // Enrich with child display name
    const enriched = await Promise.all(purchases.map(async (p) => {
      const child = await users.getChildById(p.childId);
      return { ...p, childName: child?.displayName || child?.username || p.childId };
    }));
    return res.json(enriched);
  });

  // PATCH /api/catalog/purchases/:id (parent only) — mark delivered
  router.patch('/catalog/purchases/:id', requireRole('parent'), async (req: Request, res) => {
    const { familyId } = req.body || {};
    const actor = (req as AuthedRequest).user!;
    await catalog.updatePurchaseStatus(req.params.id, 'delivered', actor.id);
    return res.json({ ok: true });
  });

  return router;
}
