import { Request, Router } from 'express';
import { AuthedRequest, requireRole } from '../middleware/auth';
import { TokensRepository, UsersRepository } from '../repositories';

export function tokenRoutes(opts: { tokens: TokensRepository; users: UsersRepository }) {
  const router = Router();
  const { tokens } = opts;

  // List tokens for current parent
  router.get('/tokens', requireRole('parent'), async (req: Request, res) => {
    const parentId = (req as AuthedRequest).user!.id;
    const list = await tokens.listTokens(parentId);
    res.json(list);
  });

  // Create token for current parent
  router.post('/tokens', requireRole('parent'), async (req: Request, res) => {
    const parentId = (req as AuthedRequest).user!.id;
    const { label, expiresAt } = req.body || {};
    const rec = await tokens.createToken(parentId, label, typeof expiresAt === 'string' ? expiresAt : undefined);
    // Return raw token only at creation time
    res.status(201).json(rec);
  });

  // Revoke token by id (must belong to current parent)
  router.delete('/tokens/:id', requireRole('parent'), async (req: Request, res) => {
    const parentId = (req as AuthedRequest).user!.id;
    await tokens.revokeToken(parentId, req.params.id);
    res.status(204).send();
  });

  return router;
}

