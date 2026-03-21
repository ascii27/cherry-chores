export type Recurrence = 'daily' | 'weekly' | 'biweekly-odd' | 'biweekly-even' | 'custom-days';

export interface Chore {
  id: string;
  familyId: string;
  name: string;
  description?: string;
  value: number;
  recurrence: Recurrence;
  dueDay?: number;   // 0-6 for weekly / biweekly
  dueDays?: number[]; // 0-6 array for custom-days
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
