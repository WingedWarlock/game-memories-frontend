export interface Dlc {
  id: number;
  gameId: number;
  title: string;
  description?: string;
  completed: boolean;
  notes?: string;
}

export type DlcRequest = Omit<Dlc, 'id' | 'gameId'>;
