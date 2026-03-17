import { Request, Router } from 'express';
import { AuthedRequest, requireRole } from '../middleware/auth';
import { BonusRepository, FamiliesRepository, UsersRepository, BankRepository, SaversRepository } from '../repositories';
import { Bonus, BonusClaim } from '../bonus.types';
import { LedgerEntry } from '../bank.types';
import { applyAllocation } from '../alloc';

export function bonusRoutes(opts: {
  bonus: BonusRepository;
  users: UsersRepository;
  families: FamiliesRepository;
  bank: BankRepository;
  savers?: SaversRepository;
}) {
  const router = Router();
  const { bonus, users, families, bank, savers } = opts;

  // GET /families/:familyId/bonuses
  // Parent: all bonuses; Child: active bonuses visible to them
  router.get('/families/:familyId/bonuses', async (req: Request, res) => {
    const actor = (req as AuthedRequest).user;
    if (!actor) return res.status(401).json({ error: 'unauthorized' });

    const { familyId } = req.params;
    const fam = await families.getFamilyById(familyId);
    if (!fam) return res.status(404).json({ error: 'family not found' });

    if (actor.role === 'parent') {
      if (!fam.parentIds.includes(actor.id)) return res.status(403).json({ error: 'forbidden' });
      const list = await bonus.listBonusesByFamily(familyId);
      return res.json(list);
    } else if (actor.role === 'child') {
      const child = await users.getChildById(actor.id);
      if (!child || child.familyId !== familyId) return res.status(403).json({ error: 'forbidden' });
      const list = await bonus.listBonusesByFamily(familyId);
      const visible = list.filter(
        (b) =>
          b.active &&
          (!b.childIds || b.childIds.length === 0 || b.childIds.includes(actor.id))
      );
      return res.json(visible);
    } else {
      return res.status(403).json({ error: 'forbidden' });
    }
  });

  // POST /families/:familyId/bonuses (parent only)
  router.post('/families/:familyId/bonuses', requireRole('parent'), async (req: Request, res) => {
    const { familyId } = req.params;
    const fam = await families.getFamilyById(familyId);
    if (!fam) return res.status(404).json({ error: 'family not found' });
    if (!fam.parentIds.includes((req as AuthedRequest).user!.id)) return res.status(403).json({ error: 'forbidden' });

    const { name, description, value, claimType, childIds } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name is required' });
    if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0)
      return res.status(400).json({ error: 'value must be a positive integer' });
    if (claimType !== 'one-time' && claimType !== 'unlimited')
      return res.status(400).json({ error: "claimType must be 'one-time' or 'unlimited'" });

    const newBonus: Bonus = {
      id: `bonus_${Date.now()}`,
      familyId,
      name,
      description: description ?? undefined,
      value,
      claimType,
      childIds: Array.isArray(childIds) ? childIds : undefined,
      active: true,
      createdAt: new Date().toISOString(),
    };
    await bonus.createBonus(newBonus);
    return res.status(201).json(newBonus);
  });

  // PATCH /bonuses/:id (parent only)
  router.patch('/bonuses/:id', requireRole('parent'), async (req: Request, res) => {
    const existing = await bonus.getBonusById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'not found' });
    const fam = await families.getFamilyById(existing.familyId);
    if (!fam || !fam.parentIds.includes((req as AuthedRequest).user!.id))
      return res.status(403).json({ error: 'forbidden' });

    const { name, description, value, claimType, childIds, active } = req.body || {};
    const updated: Bonus = {
      ...existing,
      name: name ?? existing.name,
      description: description !== undefined ? description : existing.description,
      value: typeof value === 'number' ? value : existing.value,
      claimType: claimType ?? existing.claimType,
      childIds: Array.isArray(childIds) ? childIds : existing.childIds,
      active: typeof active === 'boolean' ? active : existing.active,
    };
    await bonus.updateBonus(updated);
    return res.json(updated);
  });

  // DELETE /bonuses/:id (parent only)
  router.delete('/bonuses/:id', requireRole('parent'), async (req: Request, res) => {
    const existing = await bonus.getBonusById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'not found' });
    const fam = await families.getFamilyById(existing.familyId);
    if (!fam || !fam.parentIds.includes((req as AuthedRequest).user!.id))
      return res.status(403).json({ error: 'forbidden' });
    await bonus.deleteBonus(existing.id);
    return res.status(204).send();
  });

  // POST /bonuses/:id/claim (child only)
  router.post('/bonuses/:id/claim', requireRole('child'), async (req: Request, res) => {
    const actor = (req as AuthedRequest).user!;
    const b = await bonus.getBonusById(req.params.id);
    if (!b) return res.status(404).json({ error: 'not found' });

    // Check bonus is active
    if (!b.active) return res.status(400).json({ error: 'bonus is not active' });

    // Check visibility
    const child = await users.getChildById(actor.id);
    if (!child) return res.status(404).json({ error: 'child not found' });
    if (child.familyId !== b.familyId) return res.status(403).json({ error: 'forbidden' });
    if (b.childIds && b.childIds.length > 0 && !b.childIds.includes(actor.id))
      return res.status(403).json({ error: 'forbidden' });

    // For one-time bonuses, check if already claimed
    if (b.claimType === 'one-time') {
      const alreadyClaimed = await bonus.hasChildClaimed(b.id, actor.id);
      if (alreadyClaimed) return res.status(409).json({ error: 'already claimed' });
    }

    const { note } = req.body || {};
    const claim: BonusClaim = {
      id: `claim_${Date.now()}`,
      bonusId: b.id,
      childId: actor.id,
      note: note ?? undefined,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    await bonus.createClaim(claim);
    return res.status(201).json(claim);
  });

  // GET /families/:familyId/bonuses/claims/pending (parent only)
  router.get('/families/:familyId/bonuses/claims/pending', requireRole('parent'), async (req: Request, res) => {
    const { familyId } = req.params;
    const fam = await families.getFamilyById(familyId);
    if (!fam) return res.status(404).json({ error: 'family not found' });
    if (!fam.parentIds.includes((req as AuthedRequest).user!.id))
      return res.status(403).json({ error: 'forbidden' });

    const pendingClaims = await bonus.listPendingClaimsByFamily(familyId);
    // Enrich with bonus details
    const enriched = await Promise.all(
      pendingClaims.map(async (c) => {
        const b = await bonus.getBonusById(c.bonusId);
        return { ...c, bonus: b };
      })
    );
    return res.json(enriched);
  });

  // POST /bonuses/claims/:claimId/approve (parent only)
  router.post('/bonuses/claims/:claimId/approve', requireRole('parent'), async (req: Request, res) => {
    const actor = (req as AuthedRequest).user!;
    const claim = await bonus.getClaimById(req.params.claimId);
    if (!claim) return res.status(404).json({ error: 'claim not found' });
    if (claim.status !== 'pending') return res.status(400).json({ error: 'claim is not pending' });

    const b = await bonus.getBonusById(claim.bonusId);
    if (!b) return res.status(404).json({ error: 'bonus not found' });

    const fam = await families.getFamilyById(b.familyId);
    if (!fam || !fam.parentIds.includes(actor.id))
      return res.status(403).json({ error: 'forbidden' });

    // Verify the child belongs to this family
    const child = await users.getChildById(claim.childId);
    if (!child || child.familyId !== b.familyId)
      return res.status(403).json({ error: 'forbidden' });

    // Create ledger entry
    const entry: LedgerEntry = {
      id: `bonus_entry_${Date.now()}`,
      childId: claim.childId,
      amount: b.value,
      type: 'bonus',
      note: `Bonus: ${b.name}`,
      meta: { bonusId: b.id, claimId: claim.id },
      actor: { role: 'parent', id: actor.id },
      createdAt: new Date().toISOString(),
    };
    await bank.addLedgerEntry(entry);

    // Apply auto-allocation if savers configured
    if (savers) await applyAllocation(bank, savers, claim.childId, b.value);

    // Update claim status
    const updatedClaim: BonusClaim = {
      ...claim,
      status: 'approved',
      resolvedAt: new Date().toISOString(),
      resolvedBy: actor.id,
    };
    await bonus.updateClaim(updatedClaim);

    const bal = await bank.getBalance(claim.childId);
    return res.json({ ok: true, claim: updatedClaim, balance: bal });
  });

  // POST /bonuses/claims/:claimId/reject (parent only)
  router.post('/bonuses/claims/:claimId/reject', requireRole('parent'), async (req: Request, res) => {
    const actor = (req as AuthedRequest).user!;
    const claim = await bonus.getClaimById(req.params.claimId);
    if (!claim) return res.status(404).json({ error: 'claim not found' });
    if (claim.status !== 'pending') return res.status(400).json({ error: 'claim is not pending' });

    const b = await bonus.getBonusById(claim.bonusId);
    if (!b) return res.status(404).json({ error: 'bonus not found' });

    const fam = await families.getFamilyById(b.familyId);
    if (!fam || !fam.parentIds.includes(actor.id))
      return res.status(403).json({ error: 'forbidden' });

    const { reason } = req.body || {};
    const updatedClaim: BonusClaim = {
      ...claim,
      status: 'rejected',
      rejectionReason: reason ?? undefined,
      resolvedAt: new Date().toISOString(),
      resolvedBy: actor.id,
    };
    await bonus.updateClaim(updatedClaim);
    return res.json({ ok: true, claim: updatedClaim });
  });

  return router;
}
