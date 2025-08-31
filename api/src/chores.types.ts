export type Recurrence = 'daily' | 'weekly';

export interface Chore {
  id: string;
  familyId: string;
  name: string;
  description?: string;
  value: number;
  recurrence: Recurrence;
  dueDay?: number; // 0-6 for weekly
  requiresApproval: boolean;
  active: boolean;
  assignedChildIds: string[];
}

export type CompletionStatus = 'pending' | 'approved';

export interface Completion {
  id: string;
  choreId: string;
  childId: string;
  date: string; // YYYY-MM-DD local family time
  status: CompletionStatus;
}

