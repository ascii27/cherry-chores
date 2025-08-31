import { Request, Router } from 'express';
import { FamiliesRepository, UsersRepository } from '../repositories';
import { AuthedRequest, requireRole } from '../middleware/auth';

export function familyRoutes(opts: { families: FamiliesRepository; users: UsersRepository }) {
  const router = Router();
  const { families, users } = opts;

  // Create family (parent only)
  router.post('/families', requireRole('parent'), async (req: Request, res) => {
    const { name, timezone } = req.body || {};
    if (!name || !timezone) return res.status(400).json({ error: 'missing fields' });
    const fam = await families.createFamily({ id: `fam_${Date.now()}`, name, timezone, parentIds: [(req as AuthedRequest).user!.id], childIds: [] });
    const parent = await users.getParentById((req as AuthedRequest).user!.id);
    if (parent) {
      if (!parent.families.includes(fam.id)) parent.families.push(fam.id);
      await users.upsertParent(parent);
    }
    res.status(201).json(fam);
  });

  // Read family (parent only for now)
  router.get('/families/:id', requireRole('parent'), async (req: Request, res) => {
    const fam = await families.getFamilyById(req.params.id);
    if (!fam) return res.status(404).json({ error: 'not found' });
    res.json(fam);
  });

  // List families for the authenticated parent
  router.get('/families', requireRole('parent'), async (req: Request, res) => {
    const parent = await users.getParentById((req as AuthedRequest).user!.id);
    if (!parent) return res.status(404).json({ error: 'not found' });
    const list = await Promise.all(parent.families.map((id) => families.getFamilyById(id)));
    res.json(list.filter(Boolean));
  });

  // Update family (name/timezone) for parent members
  router.patch('/families/:id', requireRole('parent'), async (req: Request, res) => {
    const fam = await families.getFamilyById(req.params.id);
    if (!fam) return res.status(404).json({ error: 'not found' });
    if (!fam.parentIds.includes((req as AuthedRequest).user!.id)) return res.status(403).json({ error: 'forbidden' });
    const { name, timezone } = req.body || {};
    if (name) fam.name = name;
    if (timezone) fam.timezone = timezone;
    const updated = await families.updateFamily(fam);
    res.json(updated);
  });

  // Add co-parent by email/name (invite stub)
  router.post('/families/:id/parents', requireRole('parent'), async (req: Request, res) => {
    const fam = await families.getFamilyById(req.params.id);
    if (!fam) return res.status(404).json({ error: 'not found' });
    if (!fam.parentIds.includes((req as AuthedRequest).user!.id)) return res.status(403).json({ error: 'forbidden' });
    const { email, name } = req.body || {};
    if (!email) return res.status(400).json({ error: 'missing email' });
    // upsert parent user by email
    let parent = await users.getParentByEmail(email);
    if (!parent) {
      parent = await users.upsertParent({ id: `parent_${Date.now()}`, email, name: name || email.split('@')[0], families: [] });
    }
    if (!fam.parentIds.includes(parent.id)) fam.parentIds.push(parent.id);
    if (!parent.families.includes(fam.id)) parent.families.push(fam.id);
    await users.upsertParent(parent);
    await families.updateFamily(fam);
    res.status(201).json({ ok: true, parentId: parent.id });
  });

  // List parents (co-parents) with details for a family (parent only)
  router.get('/families/:id/parents', requireRole('parent'), async (req: Request, res) => {
    const fam = await families.getFamilyById(req.params.id);
    if (!fam) return res.status(404).json({ error: 'not found' });
    if (!fam.parentIds.includes((req as AuthedRequest).user!.id)) return res.status(403).json({ error: 'forbidden' });
    const parents = await Promise.all(fam.parentIds.map((pid) => users.getParentById(pid)));
    res.json(parents.filter(Boolean).map((p) => ({ id: p!.id, email: p!.email, name: p!.name })));
  });

  // Remove co-parent (cannot remove self; must keep at least one parent)
  router.delete('/families/:id/parents/:parentId', requireRole('parent'), async (req: Request, res) => {
    const fam = await families.getFamilyById(req.params.id);
    if (!fam) return res.status(404).json({ error: 'not found' });
    const requester = (req as AuthedRequest).user!.id;
    if (!fam.parentIds.includes(requester)) return res.status(403).json({ error: 'forbidden' });
    const target = req.params.parentId;
    if (!fam.parentIds.includes(target)) return res.status(404).json({ error: 'parent not in family' });
    if (target === requester) return res.status(400).json({ error: 'cannot remove self' });
    if (fam.parentIds.length <= 1) return res.status(400).json({ error: 'family must have at least one parent' });
    await families.removeParentFromFamily(fam.id, target);
    return res.status(204).send();
  });

  return router;
}
