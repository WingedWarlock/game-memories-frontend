export type GalleryItemType = 'GAME_MEMORY' | 'ACHIEVEMENT' | 'SAVE_POINT' | 'GAME_SCREENSHOT' | 'GAME_COVER';
export type MusicChangePolicy = 'SAME_THROUGHOUT' | 'CHANGE_IN_GALLERY';

export interface SagaGalleryItem {
  id: number;
  itemType: GalleryItemType;
  itemId: number;
}

export type SagaGalleryItemRequest = Omit<SagaGalleryItem, 'id'>;

export interface Saga {
  id: number;
  name: string;
  gameSagaNames: string[];
  heroImageType?: GalleryItemType;
  heroImageId?: number;
  secondImageType?: GalleryItemType;
  secondImageId?: number;
  themeMusicId?: number;
  musicChangePolicy: MusicChangePolicy;
  galleryItems: SagaGalleryItem[];
  createdAt?: string;
  updatedAt?: string;
}

export type SagaRequest = Omit<Saga, 'id' | 'createdAt' | 'updatedAt' | 'galleryItems'> & {
  galleryItems: SagaGalleryItemRequest[];
};
