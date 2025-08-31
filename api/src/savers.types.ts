export interface SaverItem {
  id: string;
  childId: string;
  name: string;
  description?: string;
  imageUrl?: string;
  target: number; // target coins to purchase
  isGoal: boolean; // whether this saver is active as a goal
  allocation: number; // 0..100 percentage of credits to reserve
}

