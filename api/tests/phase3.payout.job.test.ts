import { InMemoryRepos } from '../src/repositories';
import { runWeeklyPayout } from '../src/jobs/payout';

function fmt(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

describe('Phase 3: Weekly payout job', () => {
  it('is idempotent per family/week and sums approved completions', async () => {
    const repos = new InMemoryRepos();
    // create parent+family+child directly via repositories
    const parent = await repos.upsertParent({ id: 'p1', email: 'p@ex.com', name: 'P', families: [] });
    const fam = await repos.createFamily({ id: 'f1', name: 'F', timezone: 'UTC', parentIds: [parent.id], childIds: [] });
    parent.families.push(fam.id);
    await repos.upsertParent(parent);
    const child = await repos.createChild({ id: 'c1', familyId: fam.id, username: 'u', passwordHash: 'pw', displayName: 'C' });

    // define two chores (1 requires approval, 1 auto)
    const ch1 = await repos.createChore({ id: 'ch1', familyId: fam.id, name: 'A', value: 2, recurrence: 'daily', requiresApproval: true, active: true, assignedChildIds: [child.id] });
    const ch2 = await repos.createChore({ id: 'ch2', familyId: fam.id, name: 'B', value: 3, recurrence: 'daily', requiresApproval: false, active: true, assignedChildIds: [child.id] });

    const today = new Date();
    const dow = today.getDay();
    const start = new Date(today);
    start.setDate(today.getDate() - dow); // Sunday
    const weekStart = fmt(start);
    const mid = new Date(start);
    mid.setDate(start.getDate() + 2);
    const day1 = fmt(start);
    const day3 = fmt(mid);

    // completions: approved for ch2 (auto) on day1 and day3; pending for ch1 (should not count)
    await repos.createCompletion({ id: 'comp1', choreId: ch2.id, childId: child.id, date: day1, status: 'approved' });
    await repos.createCompletion({ id: 'comp2', choreId: ch2.id, childId: child.id, date: day3, status: 'approved' });
    await repos.createCompletion({ id: 'comp3', choreId: ch1.id, childId: child.id, date: day3, status: 'pending' });

    // run payout once
    await runWeeklyPayout({ bank: repos as any, chores: repos as any, users: repos as any, families: repos as any }, fam.id, weekStart);
    // balance should be 6 (2 days of ch2 value 3)
    const bal1 = await (repos as any).getBalance(child.id);
    expect(bal1.available).toBe(6);
    const entries1 = await (repos as any).getLedgerByChild(child.id);
    expect(entries1.find((e: any) => e.type === 'payout' && e.meta.weekStart === weekStart)).toBeTruthy();

    // run payout again (same week): no change
    await runWeeklyPayout({ bank: repos as any, chores: repos as any, users: repos as any, families: repos as any }, fam.id, weekStart);
    const bal2 = await (repos as any).getBalance(child.id);
    expect(bal2.available).toBe(6);
    const payouts = (await (repos as any).getLedgerByChild(child.id)).filter((e: any) => e.type === 'payout' && e.meta.weekStart === weekStart);
    expect(payouts.length).toBe(1);
  });
});

