export type MemoryType = 'MEMORY' | 'NOTE' | 'ACHIEVEMENT' | 'MILESTONE';

export const MEMORY_TYPE_OPTIONS: { value: MemoryType; label: string }[] = [
  { value: 'MEMORY', label: 'Memória' },
  { value: 'NOTE', label: 'Anotação' },
  { value: 'ACHIEVEMENT', label: 'Conquista' },
  { value: 'MILESTONE', label: 'Marco' },
];

export const MEMORY_TYPE_LABEL: Record<MemoryType, string> = {
  MEMORY: 'Memória',
  NOTE: 'Anotação',
  ACHIEVEMENT: 'Conquista',
  MILESTONE: 'Marco',
};

export const MEMORY_TYPE_VARIANT: Record<MemoryType, 'accent' | 'success' | 'warning' | 'danger' | 'info'> = {
  MEMORY: 'accent',
  NOTE: 'info',
  ACHIEVEMENT: 'warning',
  MILESTONE: 'success',
};
