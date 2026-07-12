import { GameStatus } from './game-status.model';
import { GameRating } from './game-rating.model';

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
  rating?: GameRating;
  myHundredPercent: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type GameRequest = Omit<Game, 'id' | 'createdAt' | 'updatedAt'>;
