import { Request, Router } from 'express';
import { UsersRepository, FamiliesRepository, UploadsRepository } from '../repositories';
import { AuthedRequest, requireRole } from '../middleware/auth';

export function childrenRoutes(opts: { users: UsersRepository; families: FamiliesRepository; uploads?: UploadsRepository }) {
  const router = Router();
  const { users, families, uploads } = opts;

  // Parent creates a child under a family
  router.post('/children', requireRole('parent'), async (req: Request, res) => {
    const { familyId, username, password, displayName } = req.body || {};
    if (!familyId || !username || !password || !displayName) return res.status(400).json({ error: 'missing fields' });
    const fam = await families.getFamilyById(familyId);
    if (!fam) return res.status(404).json({ error: 'family not found' });
    if (!fam.parentIds.includes((req as AuthedRequest).user!.id)) return res.status(403).json({ error: 'forbidden' });
    const existing = await users.getChildByUsername(username);
    if (existing) return res.status(409).json({ error: 'username taken' });

    const child = await users.createChild({ id: `child_${Date.now()}`, familyId, username, passwordHash: password, displayName });
    res.status(201).json({ id: child.id, username: child.username, displayName: child.displayName, familyId });
  });

  // List children in a family (parent only)
  router.get('/families/:id/children', requireRole('parent'), async (req: Request, res) => {
    const fam = await families.getFamilyById(req.params.id);
    if (!fam) return res.status(404).json({ error: 'family not found' });
    if (!fam.parentIds.includes((req as AuthedRequest).user!.id)) return res.status(403).json({ error: 'forbidden' });
    const list = await Promise.all(fam.childIds.map((cid) => users.getChildById(cid)));
    res.json(list.filter(Boolean).map((c) => ({ id: c!.id, username: c!.username, displayName: c!.displayName })));
  });

  // Update a child (username/displayName/password)
  router.patch('/children/:id', async (req: Request, res) => {
    const child = await users.getChildById(req.params.id);
    if (!child) return res.status(404).json({ error: 'not found' });
    const fam = await families.getFamilyById(child.familyId);
    if (!fam) return res.status(404).json({ error: 'family not found' });
    const actor = (req as AuthedRequest).user!;
    const isParent = fam.parentIds.includes(actor.id) && actor.role === 'parent';
    const isChildSelf = actor.role === 'child' && actor.id === child.id;
    if (!isParent && !isChildSelf) return res.status(403).json({ error: 'forbidden' });
    const { username, displayName, password, avatarUrl, avatarImageId, themeColor } = req.body || {};
    try {
      let nextAvatarUrl = avatarUrl;
      if (avatarImageId && typeof avatarImageId === 'string') {
        if (avatarImageId.startsWith('uploads/')) {
          const ok = avatarImageId.includes(`/child-${child.id}/`);
          if (!ok) return res.status(400).json({ error: 'invalid avatar image id' });
          nextAvatarUrl = `/uploads/serve?key=${encodeURIComponent(avatarImageId)}`;
        } else if (uploads) {
          const rec = await (uploads as any).getUploadById(avatarImageId);
          if (!rec || rec.ownerRole !== 'child' || rec.ownerId !== child.id || rec.scope !== 'avatars') {
            return res.status(400).json({ error: 'invalid avatar image id' });
          }
          nextAvatarUrl = `/uploads/serve?key=${encodeURIComponent(rec.key)}`;
        }
      }
      
      const updated = await users.updateChild(child.id, {
        username,
        displayName,
        passwordHash: password,
        avatarUrl: nextAvatarUrl,
        themeColor
      });
      return res.json({ id: updated!.id, username: updated!.username, displayName: updated!.displayName, avatarUrl: updated!.avatarUrl, themeColor: updated!.themeColor });
    } catch (e: any) {
      if (e?.code === 409) return res.status(409).json({ error: 'username taken' });
      throw e;
    }
  });

  // Delete child
  router.delete('/children/:id', requireRole('parent'), async (req: Request, res) => {
    const child = await users.getChildById(req.params.id);
    if (!child) return res.status(404).json({ error: 'not found' });
    const fam = await families.getFamilyById(child.familyId);
    if (!fam) return res.status(404).json({ error: 'family not found' });
    if (!fam.parentIds.includes((req as AuthedRequest).user!.id)) return res.status(403).json({ error: 'forbidden' });
    await users.deleteChild(child.id);
    return res.status(204).send();
  });

  return router;
}
