export interface GameCover {
  id: number;
  gameId: number;
  filePath: string;
  originalFileName: string;
  displayOrder: number;
  title?: string;
  fileUrl: string;
}
