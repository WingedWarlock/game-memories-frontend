import { GameStatus } from './game-status.model';

export interface Game {
  id: number;
  title: string;
  saga?: string;
  platform: string;
  genre?: string;
  status: GameStatus;
  favorite: boolean;
  description?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type GameRequest = Omit<Game, 'id' | 'createdAt' | 'updatedAt'>;
