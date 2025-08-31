import { Request, Router } from 'express';
import { AuthedRequest, requireRole } from '../middleware/auth';
import { ChoresRepository, FamiliesRepository, UsersRepository } from '../repositories';
import { Chore, Completion } from '../chores.types';

function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export function choresRoutes(opts: { chores: ChoresRepository; families: FamiliesRepository; users: UsersRepository }) {
  const router = Router();
  const { chores, families, users } = opts;

  // Parent creates chore
  router.post('/chores', requireRole('parent'), async (req: Request, res) => {
    const { familyId, name, description, value, recurrence, dueDay, requiresApproval, assignedChildIds, active } = req.body || {};
    if (!familyId || !name || typeof value !== 'number' || !recurrence) return res.status(400).json({ error: 'missing fields' });
    const fam = await families.getFamilyById(familyId);
    if (!fam) return res.status(404).json({ error: 'family not found' });
    if (!fam.parentIds.includes((req as AuthedRequest).user!.id)) return res.status(403).json({ error: 'forbidden' });
    const id = `chore_${Date.now()}`;
    const chore: Chore = {
      id,
      familyId,
      name,
      description,
      value,
      recurrence,
      dueDay,
      requiresApproval: !!requiresApproval,
      active: active !== false,
      assignedChildIds: Array.isArray(assignedChildIds) ? assignedChildIds : []
    };
    await chores.createChore(chore);
    return res.status(201).json(chore);
  });

  // Parent updates chore
  router.patch('/chores/:id', requireRole('parent'), async (req: Request, res) => {
    const existing = await chores.getChoreById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'not found' });
    const fam = await families.getFamilyById(existing.familyId);
    if (!fam || !fam.parentIds.includes((req as AuthedRequest).user!.id)) return res.status(403).json({ error: 'forbidden' });
    const { name, description, value, recurrence, dueDay, requiresApproval, active, assignedChildIds } = req.body || {};
    const updated: Chore = {
      ...existing,
      name: name ?? existing.name,
      description: description ?? existing.description,
      value: typeof value === 'number' ? value : existing.value,
      recurrence: recurrence ?? existing.recurrence,
      dueDay: typeof dueDay === 'number' ? dueDay : existing.dueDay,
      requiresApproval: typeof requiresApproval === 'boolean' ? requiresApproval : existing.requiresApproval,
      active: typeof active === 'boolean' ? active : existing.active,
      assignedChildIds: Array.isArray(assignedChildIds) ? assignedChildIds : existing.assignedChildIds
    };
    await chores.updateChore(updated);
    res.json(updated);
  });

  router.delete('/chores/:id', requireRole('parent'), async (req: Request, res) => {
    const existing = await chores.getChoreById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'not found' });
    const fam = await families.getFamilyById(existing.familyId);
    if (!fam || !fam.parentIds.includes((req as AuthedRequest).user!.id)) return res.status(403).json({ error: 'forbidden' });
    await chores.deleteChore(existing.id);
    res.status(204).send();
  });

  // List chores for a family (parent)
  router.get('/chores', requireRole('parent'), async (req: Request, res) => {
    const { familyId } = req.query as any;
    if (!familyId) return res.status(400).json({ error: 'missing familyId' });
    const fam = await families.getFamilyById(familyId);
    if (!fam || !fam.parentIds.includes((req as AuthedRequest).user!.id)) return res.status(403).json({ error: 'forbidden' });
    const list = await chores.listChoresByFamily(familyId);
    res.json(list);
  });

  // Child: list chores for today/week
  router.get('/children/:childId/chores', async (req: Request, res) => {
    const child = await users.getChildById(req.params.childId);
    if (!child) return res.status(404).json({ error: 'child not found' });
    const scope = (req.query.scope as string) || 'today';
    const famChores = await chores.listChoresByFamily(child.familyId);
    const assigned = famChores.filter((c) => c.active && c.assignedChildIds.includes(child.id));
    const now = new Date();
    const dow = now.getDay();
    const today = todayStr();
    // compute week range (Sunday..Saturday)
    const start = new Date(now);
    start.setDate(now.getDate() - dow);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const startStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
    const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
    const completions = await chores.listCompletionsForChildInRange(child.id, startStr, endStr);
    function statusFor(choreId: string, date: string) {
      const comp = completions.find((c) => c.choreId === choreId && c.date === date);
      return comp ? comp.status : null;
    }
    let items: any[] = [];
    if (scope === 'today') {
      items = assigned.filter((c) => (c.recurrence === 'daily') || (c.recurrence === 'weekly' && c.dueDay === dow)).map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        value: c.value,
        requiresApproval: c.requiresApproval,
        date: today,
        status: statusFor(c.id, today)
      }));
    } else {
      items = assigned.filter((c) => c.recurrence === 'daily' || (c.recurrence === 'weekly' && c.dueDay! >= 0)).map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        value: c.value,
        requiresApproval: c.requiresApproval,
        dueDay: c.recurrence === 'weekly' ? c.dueDay : undefined,
        status: c.recurrence === 'weekly' && c.dueDay === dow ? statusFor(c.id, today) : null
      }));
    }
    res.json(items);
  });

  // Child marks chore complete
  router.post('/chores/:id/complete', async (req: Request, res) => {
    const { childId } = req.body || {};
    if (!childId) return res.status(400).json({ error: 'missing childId' });
    const child = await users.getChildById(childId);
    if (!child) return res.status(404).json({ error: 'child not found' });
    const chore = await chores.getChoreById(req.params.id);
    if (!chore || !chore.assignedChildIds.includes(childId)) return res.status(404).json({ error: 'not found' });
    const c: Completion = { id: `comp_${Date.now()}`, choreId: chore.id, childId, date: todayStr(), status: chore.requiresApproval ? 'pending' : 'approved' };
    await chores.createCompletion(c);
    res.json(c);
  });

  // Child unmark (only if completion exists and is pending)
  router.post('/chores/:id/uncomplete', async (req: Request, res) => {
    const { childId } = req.body || {};
    if (!childId) return res.status(400).json({ error: 'missing childId' });
    const compDate = todayStr();
    // naive: need completions in range and matching today
    // We could add a lookup by chore+child+date but for MVP we'll scan today's range
    const comps = await chores.listCompletionsForChildInRange(childId, compDate, compDate);
    const comp = comps.find((x) => x.choreId === req.params.id && x.date === compDate);
    if (!comp) return res.status(404).json({ error: 'not found' });
    // Allow reverting even if already approved (no ledger impact in Phase 2)
    await chores.deleteCompletion(comp.id);
    res.status(204).send();
  });

  // Parent approvals queue
  router.get('/approvals', requireRole('parent'), async (req: Request, res) => {
    const { familyId } = req.query as any;
    if (!familyId) return res.status(400).json({ error: 'missing familyId' });
    const fam = await families.getFamilyById(familyId);
    if (!fam || !fam.parentIds.includes((req as AuthedRequest).user!.id)) return res.status(403).json({ error: 'forbidden' });
    const pend = await chores.listPendingCompletionsByFamily(familyId);
    res.json(pend);
  });

  router.post('/approvals/:id/approve', requireRole('parent'), async (req: Request, res) => {
    const { id } = req.params;
    // naive approve: delete and recreate approved, but better to update; for simplicity here, delete and insert
    // Find existing via family scan
    const { familyId } = req.body || {};
    if (!familyId) return res.status(400).json({ error: 'missing familyId' });
    const fam = await families.getFamilyById(familyId);
    if (!fam || !fam.parentIds.includes((req as AuthedRequest).user!.id)) return res.status(403).json({ error: 'forbidden' });
    const pending = (await chores.listPendingCompletionsByFamily(familyId)).find((x) => x.id === id);
    if (!pending) return res.status(404).json({ error: 'not found' });
    await chores.deleteCompletion(pending.id);
    await chores.createCompletion({ ...pending, id: `comp_${Date.now()}`, status: 'approved' });
    res.status(204).send();
  });

  router.post('/approvals/:id/reject', requireRole('parent'), async (req: Request, res) => {
    const { id } = req.params;
    const { familyId } = req.body || {};
    if (!familyId) return res.status(400).json({ error: 'missing familyId' });
    const fam = await families.getFamilyById(familyId);
    if (!fam || !fam.parentIds.includes((req as AuthedRequest).user!.id)) return res.status(403).json({ error: 'forbidden' });
    const pending = (await chores.listPendingCompletionsByFamily(familyId)).find((x) => x.id === id);
    if (!pending) return res.status(404).json({ error: 'not found' });
    await chores.deleteCompletion(pending.id);
    res.status(204).send();
  });

  // Bulk approve/reject
  router.post('/approvals/bulk-approve', requireRole('parent'), async (req: Request, res) => {
    const { familyId, ids } = req.body || {};
    if (!familyId || !Array.isArray(ids)) return res.status(400).json({ error: 'missing fields' });
    const fam = await families.getFamilyById(familyId);
    if (!fam || !fam.parentIds.includes((req as AuthedRequest).user!.id)) return res.status(403).json({ error: 'forbidden' });
    const pend = await chores.listPendingCompletionsByFamily(familyId);
    for (const id of ids) {
      const p = pend.find((x) => x.id === id);
      if (p) {
        await chores.deleteCompletion(p.id);
        await chores.createCompletion({ ...p, id: `comp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, status: 'approved' });
      }
    }
    res.status(204).send();
  });
  router.post('/approvals/bulk-reject', requireRole('parent'), async (req: Request, res) => {
    const { familyId, ids } = req.body || {};
    if (!familyId || !Array.isArray(ids)) return res.status(400).json({ error: 'missing fields' });
    const fam = await families.getFamilyById(familyId);
    if (!fam || !fam.parentIds.includes((req as AuthedRequest).user!.id)) return res.status(403).json({ error: 'forbidden' });
    const pend = await chores.listPendingCompletionsByFamily(familyId);
    for (const id of ids) {
      const p = pend.find((x) => x.id === id);
      if (p) await chores.deleteCompletion(p.id);
    }
    res.status(204).send();
  });

  return router;
}
