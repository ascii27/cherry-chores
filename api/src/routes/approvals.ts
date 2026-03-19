import { Request, Router } from 'express';
import { AuthedRequest, requireRole } from '../middleware/auth';
import {
  ActivityRepository,
  BankRepository,
  BonusRepository,
  ChoresRepository,
  FamiliesRepository,
  SaversRepository,
  UsersRepository,
} from '../repositories';
import { LedgerEntry } from '../bank.types';
import { applyAllocation } from '../alloc';
import { emitActivity } from '../activity';

export function approvalsRoutes(opts: {
  chores: ChoresRepository;
  bonus: BonusRepository;
  bank: BankRepository;
  users: UsersRepository;
  families: FamiliesRepository;
  savers?: SaversRepository;
  activity?: ActivityRepository;
}) {
  const router = Router();
  const { chores, bonus, bank, users, families, savers, activity } = opts;

  /**
   * POST /api/approvals/bulk-approve
   *
   * Body: { completionIds?: string[], claimIds?: string[] }
   * At least one array must be non-empty.
   *
   * Returns 200 { succeeded: string[], failed: Array<{ id: string, error: string }> }
   */
  router.post('/approvals/bulk-approve', requireRole('parent'), async (req: Request, res) => {
    const actor = (req as AuthedRequest).user!;
    const { completionIds, claimIds } = req.body || {};

    const cids: string[] = Array.isArray(completionIds) ? completionIds : [];
    const kids: string[] = Array.isArray(claimIds) ? claimIds : [];

    if (cids.length === 0 && kids.length === 0) {
      return res.status(400).json({ error: 'no ids provided' });
    }

    const succeeded: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    // Process completion IDs
    for (const id of cids) {
      try {
        // Find the completion — we need to search across families the parent belongs to.
        // We get the completion by scanning pending completions per family.
        // First try to find which family this completion belongs to by fetching the parent's families.
        const parent = await users.getParentById(actor.id);
        if (!parent) {
          failed.push({ id, error: 'parent not found' });
          continue;
        }

        // Find the completion across all parent families
        let pending = null;
        let completionFamilyId: string | null = null;
        for (const fid of parent.families) {
          const fam = await families.getFamilyById(fid);
          if (!fam || !fam.parentIds.includes(actor.id)) continue;
          const pendingList = await chores.listPendingCompletionsByFamily(fid);
          const found = pendingList.find((x) => x.id === id);
          if (found) {
            pending = found;
            completionFamilyId = fid;
            break;
          }
        }

        if (!pending || !completionFamilyId) {
          failed.push({ id, error: 'not found' });
          continue;
        }

        // Verify the chore's family belongs to this parent
        const choreItem = await chores.getChoreById(pending.choreId);
        if (!choreItem) {
          failed.push({ id, error: 'chore not found' });
          continue;
        }
        const fam = await families.getFamilyById(choreItem.familyId);
        if (!fam || !fam.parentIds.includes(actor.id)) {
          failed.push({ id, error: 'forbidden' });
          continue;
        }

        // Approve: delete pending and create approved
        await chores.deleteCompletion(pending.id);
        await chores.createCompletion({
          ...pending,
          id: `comp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          status: 'approved',
        });

        // Emit activity
        await emitActivity(activity, {
          familyId: choreItem.familyId,
          childId: pending.childId,
          eventType: 'chore_approved',
          actorId: actor.id,
          actorRole: 'parent',
          refId: pending.choreId,
          amount: choreItem.value,
        });

        succeeded.push(id);
      } catch (err: any) {
        failed.push({ id, error: err?.message || 'unexpected error' });
      }
    }

    // Process claim IDs
    for (const id of kids) {
      try {
        const claim = await bonus.getClaimById(id);
        if (!claim) {
          failed.push({ id, error: 'claim not found' });
          continue;
        }
        if (claim.status !== 'pending') {
          failed.push({ id, error: 'claim is not pending' });
          continue;
        }

        const b = await bonus.getBonusById(claim.bonusId);
        if (!b) {
          failed.push({ id, error: 'bonus not found' });
          continue;
        }

        const fam = await families.getFamilyById(b.familyId);
        if (!fam || !fam.parentIds.includes(actor.id)) {
          failed.push({ id, error: 'forbidden' });
          continue;
        }

        // Verify the child belongs to this family
        const child = await users.getChildById(claim.childId);
        if (!child || child.familyId !== b.familyId) {
          failed.push({ id, error: 'child not in family' });
          continue;
        }

        // Create ledger entry
        const entry: LedgerEntry = {
          id: `bonus_entry_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
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
        await bonus.updateClaim({
          ...claim,
          status: 'approved',
          resolvedAt: new Date().toISOString(),
          resolvedBy: actor.id,
        });

        // Emit activity
        await emitActivity(activity, {
          familyId: b.familyId,
          childId: claim.childId,
          eventType: 'bonus_approved',
          actorId: actor.id,
          actorRole: 'parent',
          refId: b.id,
          amount: b.value,
        });

        succeeded.push(id);
      } catch (err: any) {
        failed.push({ id, error: err?.message || 'unexpected error' });
      }
    }

    return res.status(200).json({ succeeded, failed });
  });

  return router;
}
