export type LifeEventCategory = 'WORK' | 'STUDY' | 'PROJECT' | 'TRAVEL' | 'MUSIC' | 'PERSONAL' | 'OTHER';

export const LIFE_EVENT_CATEGORY_OPTIONS: { value: LifeEventCategory; label: string }[] = [
  { value: 'WORK', label: 'Trabalho' },
  { value: 'STUDY', label: 'Estudo' },
  { value: 'PROJECT', label: 'Projeto pessoal' },
  { value: 'TRAVEL', label: 'Viagem' },
  { value: 'MUSIC', label: 'Música' },
  { value: 'PERSONAL', label: 'Pessoal' },
  { value: 'OTHER', label: 'Outro' },
];

export const LIFE_EVENT_CATEGORY_LABEL: Record<LifeEventCategory, string> = {
  WORK: 'Trabalho',
  STUDY: 'Estudo',
  PROJECT: 'Projeto pessoal',
  TRAVEL: 'Viagem',
  MUSIC: 'Música',
  PERSONAL: 'Pessoal',
  OTHER: 'Outro',
};

export interface LifeEvent {
  id: number;
  title: string;
  description?: string;
  date: string;
  category: LifeEventCategory;
}

export type LifeEventRequest = Omit<LifeEvent, 'id'>;
