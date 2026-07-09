export interface SavePoint {
  id: number;
  runId: number;
  slot: string;
  title: string;
  description?: string;
}

export type SavePointRequest = Omit<SavePoint, 'id' | 'runId'>;
