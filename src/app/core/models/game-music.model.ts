export interface GameMusic {
  id: number;
  gameId: number;
  filePath: string;
  originalFileName: string;
  title?: string;
  artist?: string;
  description?: string;
  fileUrl: string;
}
