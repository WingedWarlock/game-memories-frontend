import { RunStatus } from './run-status.model';

export interface Run {
  id: number;
  gameId: number;
  runName: string;
  difficulty?: string;
  startDate?: string;
  endDate?: string;
  status: RunStatus;
  completionPercentage: number;
  favoriteRun: boolean;
  notes?: string;
}

export type RunRequest = Omit<Run, 'id' | 'gameId'>;
