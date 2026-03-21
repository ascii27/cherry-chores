export type Recurrence = 'daily' | 'weekly' | 'biweekly-odd' | 'biweekly-even';

export interface Chore {
  id: string;
  familyId: string;
  name: string;
  description?: string;
  value: number;
  recurrence: Recurrence;
  dueDay?: number; // 0-6 for weekly / biweekly
  requiresApproval: boolean;
  active: boolean;
  assignedChildIds: string[];
  emoji?: string; // auto-assigned emoji icon
}

export type CompletionStatus = 'pending' | 'approved';

export interface Completion {
  id: string;
  choreId: string;
  childId: string;
  date: string; // YYYY-MM-DD local family time
  status: CompletionStatus;
}
