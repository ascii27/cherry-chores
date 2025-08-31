import { Request, Router } from 'express';
import { AuthedRequest, requireRole } from '../middleware/auth';
import { FamiliesRepository, SaversRepository, UsersRepository } from '../repositories';
import { SaverItem } from '../savers.types';

export function saversRoutes(opts: { savers: SaversRepository; users: UsersRepository; families: FamiliesRepository }) {
  const router = Router();
  const { savers, users, families } = opts;

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
    res.json(list);
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
    const item: SaverItem = { id: `saver_${Date.now()}`, childId: child.id, name, description, imageUrl, target, isGoal: false, allocation: 0 };
    await savers.createSaver(item);
    res.status(201).json(item);
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
      isGoal: typeof isGoal === 'boolean' ? isGoal : cur.isGoal,
      allocation: typeof allocation === 'number' ? Math.min(100, Math.max(0, allocation)) : cur.allocation
    };
    // If allocations among all goals exceed 100, cap this one to fit
    if (typeof allocation === 'number') {
      const list = await savers.listSaversByChild(cur.childId);
      const others = list.filter((s) => s.id !== cur.id && s.isGoal);
      const otherPct = others.reduce((s, it) => s + (it.allocation || 0), 0);
      if (otherPct + next.allocation > 100) next.allocation = Math.max(0, 100 - otherPct);
    }
    const updated = await savers.updateSaver(next);
    res.json(updated);
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
    await savers.deleteSaver(cur.id);
    res.status(204).send();
  });

  return router;
}

