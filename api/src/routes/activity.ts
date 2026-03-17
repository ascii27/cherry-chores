import { Request, Router } from 'express';
import { AuthedRequest, requireRole } from '../middleware/auth';
import { ActivityRepository, FamiliesRepository } from '../repositories';

export function activityRoutes(opts: { activity: ActivityRepository; families: FamiliesRepository }) {
  const router = Router();
  const { activity, families } = opts;

  // GET /families/:familyId/activity — parent only
  router.get('/families/:familyId/activity', requireRole('parent'), async (req: Request, res) => {
    const { familyId } = req.params;
    const fam = await families.getFamilyById(familyId);
    if (!fam || !fam.parentIds.includes((req as AuthedRequest).user!.id)) {
      return res.status(403).json({ error: 'forbidden' });
    }
    const limitRaw = req.query.limit;
    const beforeRaw = req.query.before;
    const limit = limitRaw !== undefined ? parseInt(String(limitRaw), 10) : undefined;
    const before = typeof beforeRaw === 'string' ? beforeRaw : undefined;
    const entries = await activity.listByFamily(familyId, { limit, before });
    return res.json({ entries });
  });

  return router;
}
