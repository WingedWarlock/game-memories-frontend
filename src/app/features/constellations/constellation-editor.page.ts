import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe, NgFor } from '@angular/common';
import { GalleryItemType, Saga, SagaGalleryItemRequest, SagaRequest } from '../../core/models';
import { SagaService } from '../../core/services/saga.service';
import { ToastService } from '../../core/services/toast.service';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { SagaContent, SagaContentService, galleryKeyFor } from './saga-content.service';
import { ALL_MOTIF_SHAPES, MOTIF_LINES, MOTIF_POINTS } from './saga-motifs.util';

function imageKey(type: GalleryItemType, id: number): string {
  return `${type}:${id}`;
}

@Component({
  selector: 'app-constellation-editor',
  standalone: true,
  imports: [NgFor, DatePipe, RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './constellation-editor.page.html',
  styleUrl: './constellation-editor.page.scss',
})
export class ConstellationEditorPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly sagaService = inject(SagaService);
  private readonly sagaContentService = inject(SagaContentService);
  private readonly toast = inject(ToastService);

  protected readonly loading = signal(true);
  protected readonly error = signal(false);
  protected readonly saving = signal(false);
  protected readonly saga = signal<Saga | null>(null);
  protected readonly content = signal<SagaContent | null>(null);

  protected readonly heroKey = signal<string | null>(null);
  protected readonly secondKey = signal<string | null>(null);
  protected readonly themeMusicId = signal<number | null>(null);
  protected readonly selectedGalleryKeys = signal<Set<string>>(new Set());

  protected readonly sagaMotifs = ALL_MOTIF_SHAPES;
  protected readonly motifLines = MOTIF_LINES;
  protected readonly motifPoints = MOTIF_POINTS;

  protected readonly selectedThemeTrack = computed(() => {
    const content = this.content();
    const id = this.themeMusicId();
    if (!content || id == null) {
      return null;
    }
    return content.music.find((track) => track.id === id) ?? null;
  });

  protected readonly trackByKey = (_: number, item: { key: string }) => item.key;

  constructor() {
    this.load();
  }

  private load(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.loading.set(true);
    this.error.set(false);
    this.sagaService.getById(id).subscribe({
      next: (saga) => {
        this.saga.set(saga);
        this.sagaContentService.loadContent(saga.gameSagaNames).subscribe({
          next: (content) => {
            this.content.set(content);
            this.initializeFromSaga(saga);
            this.loading.set(false);
          },
          error: () => {
            this.error.set(true);
            this.loading.set(false);
          },
        });
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  private initializeFromSaga(saga: Saga): void {
    if (saga.heroImageType && saga.heroImageId != null) {
      this.heroKey.set(imageKey(saga.heroImageType, saga.heroImageId));
    }
    if (saga.secondImageType && saga.secondImageId != null) {
      this.secondKey.set(imageKey(saga.secondImageType, saga.secondImageId));
    }
    this.themeMusicId.set(saga.themeMusicId ?? null);

    const keys = new Set<string>();
    for (const item of saga.galleryItems) {
      keys.add(galleryKeyFor(item.itemType, item.itemId));
    }
    this.selectedGalleryKeys.set(keys);
  }

  isHero(type: GalleryItemType, id: number): boolean {
    return this.heroKey() === imageKey(type, id);
  }

  selectHero(type: GalleryItemType, id: number): void {
    this.heroKey.set(imageKey(type, id));
  }

  isSecond(type: GalleryItemType, id: number): boolean {
    return this.secondKey() === imageKey(type, id);
  }

  selectSecond(type: GalleryItemType, id: number): void {
    this.secondKey.set(imageKey(type, id));
  }

  onThemeMusicChange(event: Event): void {
    const value = Number((event.target as HTMLSelectElement).value);
    this.themeMusicId.set(Number.isNaN(value) || value < 0 ? null : value);
  }

  isGallerySelected(key: string): boolean {
    return this.selectedGalleryKeys().has(key);
  }

  toggleGallerySelection(key: string): void {
    const next = new Set(this.selectedGalleryKeys());
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    this.selectedGalleryKeys.set(next);
  }

  save(): void {
    const saga = this.saga();
    const content = this.content();
    if (!saga || !content) {
      return;
    }

    const galleryItems: SagaGalleryItemRequest[] = [];
    for (const memory of content.memories) {
      if (this.selectedGalleryKeys().has(memory.key)) {
        galleryItems.push({ itemType: 'GAME_MEMORY', itemId: memory.id });
      }
    }
    for (const achievement of content.achievements) {
      if (this.selectedGalleryKeys().has(achievement.key)) {
        galleryItems.push({ itemType: 'ACHIEVEMENT', itemId: achievement.id });
      }
    }
    for (const savePoint of content.savePoints) {
      if (this.selectedGalleryKeys().has(savePoint.key)) {
        galleryItems.push({ itemType: 'SAVE_POINT', itemId: savePoint.id });
      }
    }
    for (const screenshot of content.screenshots) {
      if (this.selectedGalleryKeys().has(screenshot.key)) {
        galleryItems.push({ itemType: 'GAME_SCREENSHOT', itemId: screenshot.id });
      }
    }
    for (const cover of content.covers) {
      if (this.selectedGalleryKeys().has(cover.key)) {
        galleryItems.push({ itemType: 'GAME_COVER', itemId: cover.id });
      }
    }

    const [heroType, heroIdStr] = this.heroKey()?.split(':') ?? [];
    const [secondType, secondIdStr] = this.secondKey()?.split(':') ?? [];

    const request: SagaRequest = {
      name: saga.name,
      gameSagaNames: saga.gameSagaNames,
      heroImageType: heroType as GalleryItemType | undefined,
      heroImageId: heroIdStr ? Number(heroIdStr) : undefined,
      secondImageType: secondType as GalleryItemType | undefined,
      secondImageId: secondIdStr ? Number(secondIdStr) : undefined,
      themeMusicId: this.themeMusicId() ?? undefined,
      musicChangePolicy: 'SAME_THROUGHOUT',
      galleryItems,
    };

    this.saving.set(true);
    this.sagaService.update(saga.id, request).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success('Constelação salva.');
        this.router.navigate(['/constelacoes', saga.id]);
      },
      error: () => {
        this.saving.set(false);
        this.toast.error('Não foi possível salvar a constelação.');
      },
    });
  }
}
