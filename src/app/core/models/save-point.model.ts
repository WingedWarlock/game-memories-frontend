export interface SavePoint {
  id: number;
  runId: number;
  slot: string;
  title: string;
  description?: string;
  date?: string;
}

export type SavePointRequest = Omit<SavePoint, 'id' | 'runId'>;
