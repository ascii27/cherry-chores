import { Request, Router } from 'express';
import { AuthedRequest, requireRole } from '../middleware/auth';
import { ActivityRepository, BankRepository, ChoresRepository, FamiliesRepository, SaversRepository, UsersRepository } from '../repositories';
import { Chore, Completion } from '../chores.types';
import { LedgerEntry } from '../bank.types';
import { applyAllocation } from '../alloc';
import { emitActivity } from '../activity';
import { llm } from '../llm';

function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

// Emoji fallback table — used when LLM is unavailable
const CHORE_EMOJI_MAP: Record<string, string> = {
  dishes: '🍽️', dishwasher: '🍽️', wash: '🧼', clean: '🧹',
  vacuum: '🧹', sweep: '🧹', mop: '🪣', laundry: '👕', fold: '👕',
  trash: '🗑️', garbage: '🗑️', recycle: '♻️', bathroom: '🚿',
  toilet: '🚽', shower: '🚿', bedroom: '🛏️', bed: '🛏️',
  homework: '📚', study: '📚', read: '📖', feed: '🐾',
  pet: '🐾', dog: '🐕', cat: '🐈', water: '💧', plant: '🌱',
  garden: '🌻', cook: '🍳', dinner: '🍽️', lunch: '🥪',
  breakfast: '🥞', grocery: '🛒', shopping: '🛒', table: '🪑',
  floor: '🧹', window: '🪟', car: '🚗', snow: '❄️', lawn: '🌿',
  tidy: '🧹', organize: '📦', sort: '📦', wipe: '🧻', dust: '🧹',
};

function fallbackEmoji(name: string): string {
  const lower = name.toLowerCase();
  for (const [keyword, emoji] of Object.entries(CHORE_EMOJI_MAP)) {
    if (lower.includes(keyword)) return emoji;
  }
  return '⭐';
}

/** Returns true if chore c is due on date d */
function isChoreActiveOnDate(c: Chore, d: Date): boolean {
  const dow = d.getDay();
  if (c.recurrence === 'daily') return true;
  if (c.recurrence === 'weekly') return c.dueDay === dow;
  if (c.recurrence === 'biweekly-odd' || c.recurrence === 'biweekly-even') {
    if (c.dueDay !== dow) return false;
    // Which occurrence of this weekday within the month? (1-based)
    const occurrence = Math.ceil(d.getDate() / 7);
    const isOdd = occurrence % 2 === 1;
    return c.recurrence === 'biweekly-odd' ? isOdd : !isOdd;
  }
  if (c.recurrence === 'custom-days') return !!(c.dueDays?.includes(dow));
  return false;
}

/** Fire-and-forget: assign an emoji to a newly created chore */
async function assignEmoji(chore: Chore, choresRepo: ChoresRepository): Promise<void> {
  try {
    let emoji = fallbackEmoji(chore.name);
    const raw = await llm.generate(
      `Reply with exactly one emoji that best represents this household chore for a child: "${chore.name}". Reply with only the emoji character, nothing else.`,
      { maxTokens: 10, temperature: 0.3 }
    );
    const clean = raw.trim();
    // Accept if it looks like an emoji (short grapheme cluster)
    if (clean.length > 0 && clean.length <= 8 && [...clean].length <= 3) emoji = clean;
    await choresRepo.updateChore({ ...chore, emoji });
  } catch (err) {
    console.warn('[chores] emoji fetch failed:', (err as any)?.message || err);
  }
}

export function choresRoutes(opts: { chores: ChoresRepository; families: FamiliesRepository; users: UsersRepository; bank?: BankRepository; savers?: SaversRepository; activity?: ActivityRepository }) {
  const router = Router();
  const { chores, families, users, bank, savers, activity } = opts;

  // Parent creates chore
  router.post('/chores', requireRole('parent'), async (req: Request, res) => {
    const { familyId, name, description, value, recurrence, dueDay, dueDays, requiresApproval, assignedChildIds, active } = req.body || {};
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
      dueDays: Array.isArray(dueDays) ? dueDays : undefined,
      requiresApproval: !!requiresApproval,
      active: active !== false,
      assignedChildIds: Array.isArray(assignedChildIds) ? assignedChildIds : [],
      emoji: fallbackEmoji(name), // immediate fallback while LLM runs
    };
    await chores.createChore(chore);
    // Fire-and-forget LLM emoji — don't block the response
    assignEmoji(chore, chores);
    return res.status(201).json(chore);
  });

  // Parent updates chore
  router.patch('/chores/:id', requireRole('parent'), async (req: Request, res) => {
    const existing = await chores.getChoreById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'not found' });
    const fam = await families.getFamilyById(existing.familyId);
    if (!fam || !fam.parentIds.includes((req as AuthedRequest).user!.id)) return res.status(403).json({ error: 'forbidden' });
    const { name, description, value, recurrence, dueDay, dueDays, requiresApproval, active, assignedChildIds } = req.body || {};
    const updated: Chore = {
      ...existing,
      name: name ?? existing.name,
      description: description ?? existing.description,
      value: typeof value === 'number' ? value : existing.value,
      recurrence: recurrence ?? existing.recurrence,
      dueDay: typeof dueDay === 'number' ? dueDay : existing.dueDay,
      dueDays: Array.isArray(dueDays) ? dueDays : existing.dueDays,
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
      items = assigned.filter((c) => isChoreActiveOnDate(c, now)).map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        value: c.value,
        emoji: c.emoji,
        requiresApproval: c.requiresApproval,
        date: today,
        status: statusFor(c.id, today)
      }));
    } else {
      items = assigned.filter((c) => c.recurrence === 'daily' || c.dueDay != null || c.recurrence === 'custom-days').map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        value: c.value,
        emoji: c.emoji,
        requiresApproval: c.requiresApproval,
        dueDay: c.recurrence !== 'daily' ? c.dueDay : undefined,
        status: isChoreActiveOnDate(c, now) ? statusFor(c.id, today) : null
      }));
    }
    res.json(items);
  });

  // Child: weekly overview (Sun..Sat)
  router.get('/children/:childId/chores/week', async (req: Request, res) => {
    const child = await users.getChildById(req.params.childId);
    if (!child) return res.status(404).json({ error: 'child not found' });
    const famChores = await chores.listChoresByFamily(child.familyId);
    const assigned = famChores.filter((c) => c.active && c.assignedChildIds.includes(child.id));
    const now = new Date();
    const dowToday = now.getDay();
    // compute week start (Sunday)
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(now.getDate() - dowToday);
    function fmt(d: Date) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
    const days: any[] = [];
    const completions = await chores.listCompletionsForChildInRange(child.id, fmt(start), fmt(new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6)));
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const dateStr = fmt(d);
      const dueItems = assigned.filter((c) => isChoreActiveOnDate(c, d));
      const items = dueItems.map((c) => {
        const comp = completions.find((x) => x.choreId === c.id && x.date === dateStr);
        const status = comp ? comp.status : (i < dowToday ? 'missed' : (i === dowToday ? 'due' : 'planned'));
        return { id: c.id, name: c.name, value: c.value, status };
      });
      const plannedValue = dueItems.reduce((s, c) => s + (c.value || 0), 0);
      const approvedValue = completions.filter((x) => x.date === dateStr && x.status === 'approved').reduce((s, x) => {
        const ch = dueItems.find((c) => c.id === x.choreId);
        return s + (ch?.value || 0);
      }, 0);
      days.push({ date: dateStr, dow: d.getDay(), items, plannedValue, approvedValue });
    }
    const totalPlanned = days.reduce((s, d) => s + d.plannedValue, 0);
    const totalApproved = days.reduce((s, d) => s + d.approvedValue, 0);
    res.json({ weekStart: fmt(start), days, totalPlanned, totalApproved, today: dowToday });
  });

  // Child marks chore complete
  router.post('/chores/:id/complete', async (req: Request, res) => {
    const { childId, date } = req.body || {};
    if (!childId) return res.status(400).json({ error: 'missing childId' });
    const child = await users.getChildById(childId);
    if (!child) return res.status(404).json({ error: 'child not found' });
    const chore = await chores.getChoreById(req.params.id);
    if (!chore || !chore.assignedChildIds.includes(childId)) return res.status(404).json({ error: 'not found' });
    const compDate = typeof date === 'string' && /\d{4}-\d{2}-\d{2}/.test(date) ? date : todayStr();
    const c: Completion = { id: `comp_${Date.now()}`, choreId: chore.id, childId, date: compDate, status: chore.requiresApproval ? 'pending' : 'approved' };
    await chores.createCompletion(c);
    await emitActivity(activity, {
      familyId: chore.familyId,
      childId,
      eventType: 'chore_completed',
      actorId: childId,
      actorRole: 'child',
      refId: chore.id,
      amount: chore.value,
    });
    res.json(c);
  });

  // Child unmark (only if completion exists and is pending)
  router.post('/chores/:id/uncomplete', async (req: Request, res) => {
    const { childId, date } = req.body || {};
    if (!childId) return res.status(400).json({ error: 'missing childId' });
    const compDate = typeof date === 'string' && /\d{4}-\d{2}-\d{2}/.test(date) ? date : todayStr();
    const comps = await chores.listCompletionsForChildInRange(childId, compDate, compDate);
    const comp = comps.find((x) => x.choreId === req.params.id && x.date === compDate);
    if (!comp) return res.status(404).json({ error: 'not found' });
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
    const { familyId } = req.body || {};
    if (!familyId) return res.status(400).json({ error: 'missing familyId' });
    const fam = await families.getFamilyById(familyId);
    if (!fam || !fam.parentIds.includes((req as AuthedRequest).user!.id)) return res.status(403).json({ error: 'forbidden' });
    const pending = (await chores.listPendingCompletionsByFamily(familyId)).find((x) => x.id === id);
    if (!pending) return res.status(404).json({ error: 'not found' });
    await chores.deleteCompletion(pending.id);
    await chores.createCompletion({ ...pending, id: `comp_${Date.now()}`, status: 'approved' });
    const approvedChore = await chores.getChoreById(pending.choreId);
    // Immediately credit the child
    if (bank && approvedChore) {
      const entry: LedgerEntry = {
        id: `chore_entry_${Date.now()}`,
        childId: pending.childId,
        amount: approvedChore.value,
        type: 'payout',
        note: `Chore: ${approvedChore.name}`,
        meta: { choreId: approvedChore.id, completionId: pending.id },
        actor: { role: 'parent', id: (req as AuthedRequest).user!.id },
        createdAt: new Date().toISOString(),
      };
      await bank.addLedgerEntry(entry);
      if (savers) await applyAllocation(bank, savers, pending.childId, approvedChore.value);
    }
    await emitActivity(activity, {
      familyId,
      childId: pending.childId,
      eventType: 'chore_approved',
      actorId: (req as AuthedRequest).user!.id,
      actorRole: 'parent',
      refId: pending.choreId,
      amount: approvedChore?.value,
    });
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
    await emitActivity(activity, {
      familyId,
      childId: pending.childId,
      eventType: 'chore_rejected',
      actorId: (req as AuthedRequest).user!.id,
      actorRole: 'parent',
      refId: pending.choreId,
    });
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
