export type RunStatus = 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';

export const RUN_STATUS_OPTIONS: { value: RunStatus; label: string }[] = [
  { value: 'IN_PROGRESS', label: 'Em andamento' },
  { value: 'COMPLETED', label: 'Concluída' },
  { value: 'ABANDONED', label: 'Abandonada' },
];

export const RUN_STATUS_LABEL: Record<RunStatus, string> = {
  IN_PROGRESS: 'Em andamento',
  COMPLETED: 'Concluída',
  ABANDONED: 'Abandonada',
};

export const RUN_STATUS_VARIANT: Record<RunStatus, 'accent' | 'success' | 'warning' | 'danger' | 'info'> = {
  IN_PROGRESS: 'accent',
  COMPLETED: 'success',
  ABANDONED: 'danger',
};
