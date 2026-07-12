export type HistoryEventType =
  | 'GAME_ADDED'
  | 'GAME_REMOVED'
  | 'GAME_FAVORITED'
  | 'GAME_UNFAVORITED'
  | 'GAME_HUNDRED_PERCENT'
  | 'GAME_RATING_CHANGED'
  | 'GAME_STATUS_CHANGED'
  | 'RUN_CREATED'
  | 'RUN_COMPLETED'
  | 'MEMORY_ADDED'
  | 'SCREENSHOT_ADDED'
  | 'MUSIC_ADDED'
  | 'ACHIEVEMENT_UNLOCKED'
  | 'DLC_ADDED'
  | 'MOD_ADDED'
  | 'SAVEPOINT_ADDED'
  | 'LIFE_EVENT_ADDED';

export interface HistoryEvent {
  id: number;
  type: HistoryEventType;
  gameId?: number;
  gameTitle?: string;
  description: string;
  occurredAt: string;
}
