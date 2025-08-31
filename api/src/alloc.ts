import { BankRepository, SaversRepository } from './repositories';

// Apply auto-allocation on a positive credit amount: reserve portions per goal
export async function applyAllocation(bank: BankRepository, savers: SaversRepository, childId: string, creditAmount: number) {
  if (creditAmount <= 0) return;
  const goals = (await savers.listSaversByChild(childId)).filter((s) => s.isGoal && s.allocation > 0);
  if (goals.length === 0) return;
  // For each goal, reserve floor(credit * pct/100). Remainder stays available.
  for (const g of goals) {
    const portion = Math.floor((creditAmount * g.allocation) / 100);
    if (portion <= 0) continue;
    await bank.addLedgerEntry({
      id: `reserve_${childId}_${g.id}_${Date.now()}`,
      childId,
      amount: -portion,
      type: 'reserve',
      note: `Reserve for goal: ${g.name}`,
      createdAt: new Date().toISOString(),
      actor: { role: 'system', name: 'Auto-allocation' },
      meta: { saverId: g.id }
    });
  }
}
