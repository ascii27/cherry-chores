import { Request, Router } from 'express';
import { AuthedRequest, requireRole } from '../middleware/auth';
import { BankRepository, ChoresRepository, FamiliesRepository, UsersRepository, SaversRepository } from '../repositories';
import { LedgerEntry } from '../bank.types';
import { runWeeklyPayout } from '../jobs/payout';
import { applyAllocation } from '../alloc';

export function bankRoutes(opts: { bank: BankRepository; users: UsersRepository; families: FamiliesRepository; chores: ChoresRepository; savers?: SaversRepository }) {
  const router = Router();
  const { bank, users, families, chores, savers } = opts;

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
    if (amount > 0 && savers) await applyAllocation(bank, savers, child.id, amount);
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

  // Parent manually triggers payout for current week (or provided weekStart)
  router.post('/bank/payout', requireRole('parent'), async (req: Request, res) => {
    const { familyId, weekStart } = req.body || {};
    if (!familyId) return res.status(400).json({ error: 'missing familyId' });
    const fam = await families.getFamilyById(familyId);
    if (!fam) return res.status(404).json({ error: 'family not found' });
    if (!fam.parentIds.includes((req as AuthedRequest).user!.id)) return res.status(403).json({ error: 'forbidden' });
    function currentWeekStartStr() {
      const now = new Date();
      const dow = now.getDay();
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      start.setDate(now.getDate() - dow);
      return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
    }
    const ws = typeof weekStart === 'string' && weekStart.length >= 8 ? weekStart : currentWeekStartStr();
    await runWeeklyPayout({ bank, chores, users, families, savers }, familyId, ws);
    res.status(204).send();
  });

  // Manually allocate coins from available to a specific goal (reserve)
  router.post('/bank/:childId/allocate', async (req: Request, res) => {
    if (!savers) return res.status(501).json({ error: 'savers not configured' });
    const child = await users.getChildById(req.params.childId);
    if (!child) return res.status(404).json({ error: 'not found' });
    const actor = (req as AuthedRequest).user;
    const fam = await families.getFamilyById(child.familyId);
    const isParent = actor?.role === 'parent' && !!fam && fam.parentIds.includes(actor.id);
    const isChildSelf = actor?.role === 'child' && actor.id === child.id;
    if (!(isParent || isChildSelf)) return res.status(403).json({ error: 'forbidden' });
    const { saverId, amount } = req.body || {};
    if (!saverId || typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: 'invalid fields' });
    const saver = await savers.getSaverById(saverId);
    if (!saver || saver.childId !== child.id) return res.status(404).json({ error: 'saver not found' });
    if (!saver.isGoal) return res.status(400).json({ error: 'saver is not a goal' });
    const bal = await bank.getBalance(child.id);
    if (bal.available < amount) return res.status(400).json({ error: 'insufficient funds' });
    await bank.addLedgerEntry({
      id: `reserve_${child.id}_${saver.id}_${Date.now()}`,
      childId: child.id,
      amount: -Math.abs(amount),
      type: 'reserve',
      note: `Manual allocation to ${saver.name}`,
      createdAt: new Date().toISOString(),
      actor: isParent ? { role: 'parent', id: actor!.id } : { role: 'child', id: child.id },
      meta: { saverId: saver.id }
    });
    const newBal = await bank.getBalance(child.id);
    res.status(201).json({ ok: true, balance: newBal });
  });

  return router;
}
