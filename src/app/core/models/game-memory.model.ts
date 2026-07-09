import { MemoryType } from './memory-type.model';

export interface GameMemory {
  id: number;
  gameId: number;
  title: string;
  description: string;
  memoryDate: string;
  type: MemoryType;
}

export type GameMemoryRequest = Omit<GameMemory, 'id' | 'gameId'>;
