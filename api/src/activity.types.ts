export type ActivityEventType =
  | 'chore_completed'
  | 'chore_approved'
  | 'chore_rejected'
  | 'bonus_claimed'
  | 'bonus_approved'
  | 'bonus_rejected'
  | 'payout'
  | 'adjustment'
  | 'spend'
  | 'purchase';

export type ActivityEntry = {
  id: string;
  familyId: string;
  childId: string;
  eventType: ActivityEventType;
  actorId?: string;
  actorRole?: 'parent' | 'child' | 'system';
  refId?: string;        // chore id, bonus id, saver id, etc.
  amount?: number;
  note?: string;
  createdAt: string;
};
