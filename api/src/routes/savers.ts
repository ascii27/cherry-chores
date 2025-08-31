import { Request, Router } from 'express';
import { AuthedRequest, requireRole } from '../middleware/auth';
import { BankRepository, FamiliesRepository, SaversRepository, UsersRepository } from '../repositories';
import { SaverItem } from '../savers.types';

export function saversRoutes(opts: { savers: SaversRepository; users: UsersRepository; families: FamiliesRepository; bank: BankRepository }) {
  const router = Router();
  const { savers, users, families, bank } = opts;

  async function reservedForSaver(childId: string, saverId: string) {
    const ledger = await bank.getLedgerByChild(childId);
    let res = 0;
    for (const e of ledger) {
      if ((e.type === 'reserve' || e.type === 'release') && e.meta?.saverId === saverId) {
        res += e.type === 'reserve' ? -e.amount : e.amount;
      }
    }
    return res;
  }

  // List savers for a child (parent or child self)
  router.get('/children/:childId/savers', async (req: Request, res) => {
    const child = await users.getChildById(req.params.childId);
    if (!child) return res.status(404).json({ error: 'not found' });
    const actor = (req as AuthedRequest).user;
    const fam = await families.getFamilyById(child.familyId);
    const isParent = actor?.role === 'parent' && !!fam && fam.parentIds.includes(actor.id);
    const isChildSelf = actor?.role === 'child' && actor.id === child.id;
    if (!(isParent || isChildSelf)) return res.status(403).json({ error: 'forbidden' });
    const list = await savers.listSaversByChild(child.id);
    const enriched = await Promise.all(list.map(async (s) => ({ ...s, reserved: await reservedForSaver(child.id, s.id) })));
    res.json(enriched);
  });

  // Create saver (parent or child self)
  router.post('/children/:childId/savers', async (req: Request, res) => {
    const child = await users.getChildById(req.params.childId);
    if (!child) return res.status(404).json({ error: 'not found' });
    const actor = (req as AuthedRequest).user;
    const fam = await families.getFamilyById(child.familyId);
    const isParent = actor?.role === 'parent' && !!fam && fam.parentIds.includes(actor.id);
    const isChildSelf = actor?.role === 'child' && actor.id === child.id;
    if (!(isParent || isChildSelf)) return res.status(403).json({ error: 'forbidden' });
    const { name, description, imageUrl, target } = req.body || {};
    if (!name || typeof target !== 'number') return res.status(400).json({ error: 'missing fields' });
    // All saver items are goals by default in Phase 4 UX
    const item: SaverItem = { id: `saver_${Date.now()}`, childId: child.id, name, description, imageUrl, target, isGoal: true, allocation: 0 };
    await savers.createSaver(item);
    res.status(201).json({ ...item, reserved: 0 });
  });

  // Update saver (name/desc/image/target, goal toggle, allocation)
  router.patch('/savers/:id', async (req: Request, res) => {
    const cur = await savers.getSaverById(req.params.id);
    if (!cur) return res.status(404).json({ error: 'not found' });
    const child = await users.getChildById(cur.childId);
    if (!child) return res.status(404).json({ error: 'child not found' });
    const fam = await families.getFamilyById(child.familyId);
    const actor = (req as AuthedRequest).user;
    const isParent = actor?.role === 'parent' && !!fam && fam.parentIds.includes(actor.id);
    const isChildSelf = actor?.role === 'child' && actor.id === child.id;
    if (!(isParent || isChildSelf)) return res.status(403).json({ error: 'forbidden' });
    const { name, description, imageUrl, target, isGoal, allocation } = req.body || {};
    const next: SaverItem = {
      ...cur,
      name: name ?? cur.name,
      description: description ?? cur.description,
      imageUrl: imageUrl ?? cur.imageUrl,
      target: typeof target === 'number' ? target : cur.target,
      // Hidden UI: if allocation is provided on a non-goal, auto-enable goal
      isGoal: typeof isGoal === 'boolean' ? isGoal : (typeof allocation === 'number' ? true : cur.isGoal),
      allocation: typeof allocation === 'number' ? Math.min(100, Math.max(0, allocation)) : cur.allocation
    };
    // If allocations among all goals exceed 100, cap this one to fit
    if (typeof allocation === 'number') {
      const list = await savers.listSaversByChild(cur.childId);
      const others = list.filter((s) => s.id !== cur.id && s.isGoal);
      const otherPct = others.reduce((s, it) => s + (it.allocation || 0), 0);
      if (otherPct + next.allocation > 100) next.allocation = Math.max(0, 100 - otherPct);
    }
    // If un-goaling, release reserved funds
    if (cur.isGoal && next.isGoal === false) {
      const reserved = await reservedForSaver(cur.childId, cur.id);
      if (reserved > 0) {
        await bank.addLedgerEntry({
          id: `release_${cur.childId}_${cur.id}_${Date.now()}`,
          childId: cur.childId,
          amount: reserved,
          type: 'release',
          note: `Release reserved for ${cur.name}`,
          createdAt: new Date().toISOString(),
          actor: { role: 'system', name: 'Auto-release' },
          meta: { saverId: cur.id }
        });
      }
    }
    const updated = await savers.updateSaver(next);
    const reserved = await reservedForSaver(updated.childId, updated.id);
    res.json({ ...updated, reserved });
  });

  // Purchase a saver item (child self or parent). Uses reserved first, then available.
  router.post('/savers/:id/purchase', async (req: Request, res) => {
    const cur = await savers.getSaverById(req.params.id);
    if (!cur) return res.status(404).json({ error: 'not found' });
    const child = await users.getChildById(cur.childId);
    if (!child) return res.status(404).json({ error: 'child not found' });
    const fam = await families.getFamilyById(child.familyId);
    const actor = (req as AuthedRequest).user;
    const isParent = actor?.role === 'parent' && !!fam && fam.parentIds.includes(actor.id);
    const isChildSelf = actor?.role === 'child' && actor.id === child.id;
    if (!(isParent || isChildSelf)) return res.status(403).json({ error: 'forbidden' });
    // determine reserved for this saver and available balance
    const reserved = await reservedForSaver(child.id, cur.id);
    const bal = await bank.getBalance(child.id);
    const needed = Math.max(0, cur.target - reserved);
    if (bal.available < needed) return res.status(400).json({ error: 'insufficient funds' });
    // release reserved used (if any)
    const useReserved = Math.min(cur.target, reserved);
    if (useReserved > 0) {
      await bank.addLedgerEntry({
        id: `release_${child.id}_${cur.id}_${Date.now()}`,
        childId: child.id,
        amount: useReserved,
        type: 'release',
        note: `Purchase ${cur.name} (release reserve)`,
        createdAt: new Date().toISOString(),
        actor: isParent ? { role: 'parent', id: actor.id } : { role: 'child', id: child.id },
        meta: { saverId: cur.id }
      });
    }
    // spend full target
    await bank.addLedgerEntry({
      id: `spend_${child.id}_${cur.id}_${Date.now()}`,
      childId: child.id,
      amount: -cur.target,
      type: 'spend',
      note: `Purchase ${cur.name}`,
      createdAt: new Date().toISOString(),
      actor: isParent ? { role: 'parent', id: actor!.id } : { role: 'child', id: child.id }
    });
    res.status(204).send();
  });

  router.delete('/savers/:id', async (req: Request, res) => {
    const cur = await savers.getSaverById(req.params.id);
    if (!cur) return res.status(404).json({ error: 'not found' });
    const child = await users.getChildById(cur.childId);
    if (!child) return res.status(404).json({ error: 'child not found' });
    const fam = await families.getFamilyById(child.familyId);
    const actor = (req as AuthedRequest).user;
    const isParent = actor?.role === 'parent' && !!fam && fam.parentIds.includes(actor.id);
    const isChildSelf = actor?.role === 'child' && actor.id === child.id;
    if (!(isParent || isChildSelf)) return res.status(403).json({ error: 'forbidden' });
    // If there are reserved coins for this saver, release them back before deletion
    const reserved = await reservedForSaver(child.id, cur.id);
    if (reserved > 0) {
      await bank.addLedgerEntry({
        id: `release_${child.id}_${cur.id}_${Date.now()}`,
        childId: child.id,
        amount: reserved,
        type: 'release',
        note: `Release reserved for ${cur.name} (deleted)`,
        createdAt: new Date().toISOString(),
        actor: isParent ? { role: 'parent', id: actor!.id } : { role: 'child', id: child.id },
        meta: { saverId: cur.id }
      });
    }
    await savers.deleteSaver(cur.id);
    res.status(204).send();
  });

  return router;
}
