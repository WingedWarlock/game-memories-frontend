export interface Achievement {
  id: number;
  gameId: number;
  title: string;
  description?: string;
  unlocked: boolean;
  unlockedDate?: string;
}

export type AchievementRequest = Omit<Achievement, 'id' | 'gameId'>;
