export interface GameScreenshot {
  id: number;
  gameId: number;
  filePath: string;
  originalFileName: string;
  title?: string;
  description?: string;
  fileUrl: string;
}
