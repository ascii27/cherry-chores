import { Request, Router } from 'express';
import { AuthedRequest } from '../middleware/auth';
import { UsersRepository } from '../repositories';

export function meRoutes(opts: { users: UsersRepository }) {
  const router = Router();
  const { users } = opts;

  router.get('/me', async (req: Request, res) => {
    const u = (req as AuthedRequest).user;
    if (!u) return res.status(401).json({ error: 'unauthorized' });
    if (u.role === 'parent') {
      const parent = await users.getParentById(u.id);
      if (!parent) return res.status(404).json({ error: 'not found' });
      return res.json({ id: parent.id, email: parent.email, name: parent.name, families: parent.families });
    }
    // child
    return res.json({ id: u.id, role: 'child', familyId: u.familyId });
  });

  return router;
}
