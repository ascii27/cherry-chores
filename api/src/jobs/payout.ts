import { BankRepository, ChoresRepository, FamiliesRepository, UsersRepository, SaversRepository } from '../repositories';
import { LedgerEntry } from '../bank.types';
import { applyAllocation } from '../alloc';

export interface PayoutDeps {
  bank: BankRepository;
  chores: ChoresRepository;
  users: UsersRepository;
  families: FamiliesRepository;
  savers?: SaversRepository;
}

// Compute week range given a weekStart (YYYY-MM-DD, Sunday) inclusive..inclusive
function weekRange(weekStart: string): { start: string; end: string } {
  const [y, m, d] = weekStart.split('-').map((x) => parseInt(x, 10));
  const start = new Date(y, m - 1, d);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const fmt = (dt: Date) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  return { start: fmt(start), end: fmt(end) };
}

export async function runWeeklyPayout(deps: PayoutDeps, familyId: string, weekStart: string) {
  const { bank, chores, users, families } = deps;
  const fam = await families.getFamilyById(familyId);
  if (!fam) throw new Error('family not found');
  const { start, end } = weekRange(weekStart);

  for (const childId of fam.childIds) {
    const child = await users.getChildById(childId);
    if (!child) continue;

    // idempotency: skip if already paid out for this week
    const existing = await bank.findPayoutForWeek(childId, familyId, weekStart);
    if (existing) continue;

    const comps = await chores.listCompletionsForChildInRange(childId, start, end);
    const approved = comps.filter((c) => c.status === 'approved');
    if (!approved.length) continue;

    // Sum chore values by referencing chores list for the family
    const famChores = await chores.listChoresByFamily(familyId);
    const valueById = new Map(famChores.map((c) => [c.id, c.value] as const));
    const total = approved.reduce((sum, c) => sum + (valueById.get(c.choreId) || 0), 0);
    if (total === 0) continue;

    const entry: LedgerEntry = {
      id: `payout_${familyId}_${weekStart}_${childId}`,
      childId,
      amount: total,
      type: 'payout',
      meta: { familyId, weekStart },
      actor: { role: 'system', name: 'Weekly Payout' },
      createdAt: new Date().toISOString()
    };
    await bank.addLedgerEntry(entry);
    if (deps.savers) await applyAllocation(bank, deps.savers, childId, total);
  }
}
