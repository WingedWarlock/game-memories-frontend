export type GameStatus = 'NOT_STARTED' | 'PLAYING' | 'PAUSED' | 'COMPLETED';

export const GAME_STATUS_OPTIONS: { value: GameStatus; label: string }[] = [
  { value: 'NOT_STARTED', label: 'Não iniciado' },
  { value: 'PLAYING', label: 'Jogando' },
  { value: 'PAUSED', label: 'Pausado' },
  { value: 'COMPLETED', label: 'Concluído' },
];

export const GAME_STATUS_LABEL: Record<GameStatus, string> = {
  NOT_STARTED: 'Não iniciado',
  PLAYING: 'Jogando',
  PAUSED: 'Pausado',
  COMPLETED: 'Concluído',
};

export const GAME_STATUS_VARIANT: Record<GameStatus, 'accent' | 'success' | 'warning' | 'danger' | 'info'> = {
  NOT_STARTED: 'info',
  PLAYING: 'accent',
  PAUSED: 'warning',
  COMPLETED: 'success',
};
