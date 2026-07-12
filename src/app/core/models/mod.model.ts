export interface Mod {
  id: number;
  gameId: number;
  title: string;
  description?: string;
  link?: string;
  active: boolean;
  notes?: string;
}

export type ModRequest = Omit<Mod, 'id' | 'gameId'>;
