export type BonusClaimType = 'one-time' | 'unlimited';
export type BonusClaimStatus = 'pending' | 'approved' | 'rejected';

export type Bonus = {
  id: string;
  familyId: string;
  name: string;
  description?: string;
  value: number;           // coins
  claimType: BonusClaimType;
  childIds?: string[];     // undefined or empty = all children in family
  active: boolean;
  createdAt: string;
};

export type BonusClaim = {
  id: string;
  bonusId: string;
  childId: string;
  note?: string;
  status: BonusClaimStatus;
  rejectionReason?: string;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;     // parent id
};
