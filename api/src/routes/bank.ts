import { Request, Router } from 'express';
import { AuthedRequest, requireRole } from '../middleware/auth';
import { BankRepository, FamiliesRepository, UsersRepository } from '../repositories';
import { LedgerEntry } from '../bank.types';

export function bankRoutes(opts: { bank: BankRepository; users: UsersRepository; families: FamiliesRepository }) {
  const router = Router();
  const { bank, users, families } = opts;

  // Get balance and recent ledger entries for a child
  router.get('/bank/:childId', async (req: Request, res) => {
    const child = await users.getChildById(req.params.childId);
    if (!child) return res.status(404).json({ error: 'not found' });
    const bal = await bank.getBalance(child.id);
    const entries = await bank.getLedgerByChild(child.id);
    res.json({ balance: bal, entries });
  });

  // Parent adjustment (credit/debit) for a child
  router.post('/bank/:childId/adjust', requireRole('parent'), async (req: Request, res) => {
    const child = await users.getChildById(req.params.childId);
    if (!child) return res.status(404).json({ error: 'not found' });
    const fam = await families.getFamilyById(child.familyId);
    if (!fam || !fam.parentIds.includes((req as AuthedRequest).user!.id)) return res.status(403).json({ error: 'forbidden' });
    const { amount, note } = req.body || {};
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount === 0) return res.status(400).json({ error: 'invalid amount' });
    const actorParent = await users.getParentById((req as AuthedRequest).user!.id);
    const entry: LedgerEntry = {
      id: `adj_${Date.now()}`,
      childId: child.id,
      amount,
      type: 'adjustment',
      note,
      actor: { role: 'parent', id: actorParent?.id, name: actorParent?.name, email: actorParent?.email },
      createdAt: new Date().toISOString()
    };
    await bank.addLedgerEntry(entry);
    const bal = await bank.getBalance(child.id);
    res.status(201).json({ ok: true, balance: bal });
  });

  // Child spend (records a debit). Allow child self or parent on child's behalf
  router.post('/bank/:childId/spend', async (req: Request, res) => {
    const child = await users.getChildById(req.params.childId);
    if (!child) return res.status(404).json({ error: 'not found' });
    const actor = (req as AuthedRequest).user;
    const fam = await families.getFamilyById(child.familyId);
    const isParent = actor?.role === 'parent' && !!fam && fam.parentIds.includes(actor.id);
    const isChildSelf = actor?.role === 'child' && actor.id === child.id;
    if (!isParent && !isChildSelf) return res.status(403).json({ error: 'forbidden' });
    const { amount, note } = req.body || {};
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: 'invalid amount' });
    const bal = await bank.getBalance(child.id);
    if (bal.available < amount) return res.status(400).json({ error: 'insufficient funds' });
    const actorInfo = isParent ? await users.getParentById(actor!.id) : await users.getChildById(child.id);
    const entry: LedgerEntry = {
      id: `spend_${Date.now()}`,
      childId: child.id,
      amount: -Math.abs(amount),
      type: 'spend',
      note,
      actor: isParent
        ? { role: 'parent', id: actorInfo?.id, name: (actorInfo as any)?.name, email: (actorInfo as any)?.email }
        : { role: 'child', id: actorInfo?.id, name: (actorInfo as any)?.displayName },
      createdAt: new Date().toISOString()
    };
    await bank.addLedgerEntry(entry);
    const newBal = await bank.getBalance(child.id);
    res.status(201).json({ ok: true, balance: newBal });
  });

  return router;
}
