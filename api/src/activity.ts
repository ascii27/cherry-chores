import { ActivityRepository } from './repositories';
import { ActivityEntry } from './activity.types';

// Helper to emit an activity entry (fire-and-forget friendly; logs errors but doesn't throw)
export async function emitActivity(
  activity: ActivityRepository | undefined,
  entry: Omit<ActivityEntry, 'id' | 'createdAt'>
): Promise<void> {
  if (!activity) return;
  try {
    await activity.addEntry({
      ...entry,
      id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Failed to emit activity entry', err);
  }
}

// NOTE: bonus_claimed, bonus_approved, bonus_rejected should be emitted from bonus routes
// (those live on branch phase-7-bonuses and are not integrated here).
