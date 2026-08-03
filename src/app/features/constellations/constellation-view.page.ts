import { ChangeDetectionStrategy, Component, ElementRef, OnDestroy, Renderer2, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { Saga } from '../../core/models';
import { SagaService } from '../../core/services/saga.service';
import { IconComponent, IconName } from '../../shared/components/icon/icon.component';
import { SagaContent, SagaContentService, galleryKeyFor } from './saga-content.service';
import { ALL_MOTIF_SHAPES, MOTIF_LINES, MOTIF_POINTS } from './saga-motifs.util';

interface ResolvedImage {
  fileUrl: string;
  gameTitle: string;
}

type CinematicPhase = 'tunnel' | 'hero' | 'fastPass' | 'second' | 'gallery';
type GallerySubPhase = 'image' | 'batch';

interface GalleryBigItem {
  key: string;
  fileUrl: string;
  title: string;
}

type GallerySmallKind = 'memory' | 'achievement' | 'savepoint';

interface GallerySmallItem {
  key: string;
  kind: GallerySmallKind;
  title: string;
  gameTitle: string;
  runName?: string;
  date: string;
  quote?: string;
}

interface GalleryGroup {
  gameId: number;
  gameTitle: string;
  bigItems: GalleryBigItem[];
  smallItems: GallerySmallItem[];
}

interface FastPassItem {
  key: string;
  title: string;
  subtitle?: string;
  date?: string;
  fileUrl?: string;
}

const TUNNEL_DURATION_MS = 3800;
const HERO_DURATION_MS = 90000;
const SECOND_DURATION_MS = 90000;
const GALLERY_IMAGE_ONLY_MS = 9000;
const GALLERY_BATCH_MS = 6500;
const GALLERY_BATCH_SIZE = 3;
const GALLERY_BIG_MS = 6000;
const FAST_PASS_ROWS = 2;
const FAST_PASS_SECONDS_PER_ITEM = 1.4;
const FAST_PASS_TOTAL_MIN_SECONDS = 35;

const SMALL_ICON_BY_KIND: Record<GallerySmallKind, IconName> = {
  memory: 'book',
  achievement: 'trophy',
  savepoint: 'save',
};

const PHASE_LABELS: Record<CinematicPhase, string> = {
  tunnel: 'Túnel',
  hero: 'Imagem-herói',
  fastPass: 'Passagem rápida',
  second: 'Segunda imagem',
  gallery: 'Galeria',
};

@Component({
  selector: 'app-constellation-view',
  standalone: true,
  imports: [DatePipe, RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './constellation-view.page.html',
  styleUrl: './constellation-view.page.scss',
})
export class ConstellationViewPage implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly sagaService = inject(SagaService);
  private readonly sagaContentService = inject(SagaContentService);
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly renderer = inject(Renderer2);

  protected readonly loading = signal(true);
  protected readonly error = signal(false);
  protected readonly saga = signal<Saga | null>(null);
  protected readonly content = signal<SagaContent | null>(null);

  protected readonly cinematicPhase = signal<CinematicPhase>('tunnel');
  protected readonly paused = signal(false);
  protected readonly phaseLabel = computed(() => PHASE_LABELS[this.cinematicPhase()]);

  protected readonly manualTrackId = signal<number | null>(null);

  protected readonly galleryGroupIndex = signal(0);
  protected readonly galleryBigIndex = signal(0);
  protected readonly gallerySubPhase = signal<GallerySubPhase>('image');
  protected readonly galleryBatchIndex = signal(0);

  protected readonly tunnelStreaks = Array.from({ length: 700 }, (_, i) => i);
  protected readonly motifLines = MOTIF_LINES;
  protected readonly motifPoints = MOTIF_POINTS;

  protected readonly galleryKeySet = computed<Set<string>>(() => {
    const saga = this.saga();
    if (!saga) {
      return new Set();
    }
    return new Set(saga.galleryItems.map((item) => galleryKeyFor(item.itemType, item.itemId)));
  });

  protected readonly heroImage = computed<ResolvedImage | null>(() => {
    const saga = this.saga();
    const content = this.content();
    if (!saga || !content || !saga.heroImageType || saga.heroImageId == null) {
      return null;
    }
    return this.resolveImage(saga.heroImageType === 'GAME_COVER' ? content.covers : content.screenshots, saga.heroImageId);
  });

  protected readonly secondImage = computed<ResolvedImage | null>(() => {
    const saga = this.saga();
    const content = this.content();
    if (!saga || !content || !saga.secondImageType || saga.secondImageId == null) {
      return null;
    }
    return this.resolveImage(saga.secondImageType === 'GAME_COVER' ? content.covers : content.screenshots, saga.secondImageId);
  });

  protected readonly themeTrack = computed(() => {
    const saga = this.saga();
    const content = this.content();
    if (!saga?.themeMusicId || !content) {
      return null;
    }
    return content.music.find((track) => track.id === saga.themeMusicId) ?? null;
  });

  protected readonly activeTrack = computed(() => {
    const manualId = this.manualTrackId();
    const content = this.content();
    if (manualId != null && content) {
      const manual = content.music.find((track) => track.id === manualId);
      if (manual) {
        return manual;
      }
    }
    return this.themeTrack();
  });

  protected readonly sagaMotifs = ALL_MOTIF_SHAPES;

  protected readonly fastPassItems = computed<FastPassItem[]>(() => {
    const content = this.content();
    const keySet = this.galleryKeySet();
    if (!content) {
      return [];
    }

    const dated: FastPassItem[] = [];
    for (const memory of content.memories) {
      if (keySet.has(memory.key)) {
        dated.push({ key: memory.key, title: memory.title, subtitle: memory.gameTitle, date: memory.date });
      }
    }
    for (const achievement of content.achievements) {
      if (keySet.has(achievement.key)) {
        dated.push({ key: achievement.key, title: achievement.title, subtitle: achievement.gameTitle, date: achievement.date });
      }
    }
    for (const savePoint of content.savePoints) {
      if (keySet.has(savePoint.key)) {
        dated.push({ key: savePoint.key, title: savePoint.title, subtitle: savePoint.gameTitle, date: savePoint.date });
      }
    }
    dated.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));

    const images: FastPassItem[] = [];
    for (const shot of content.screenshots) {
      if (keySet.has(shot.key)) {
        images.push({ key: shot.key, title: shot.title || shot.gameTitle, subtitle: shot.gameTitle, fileUrl: shot.fileUrl });
      }
    }
    for (const cover of content.covers) {
      if (keySet.has(cover.key)) {
        images.push({ key: cover.key, title: cover.title || cover.gameTitle, subtitle: cover.gameTitle, fileUrl: cover.fileUrl });
      }
    }

    return [...dated, ...images];
  });

  protected readonly fastPassRows = computed<FastPassItem[][]>(() => {
    const items = this.fastPassItems();
    if (items.length === 0) {
      return [];
    }
    const perRow = Math.ceil(items.length / FAST_PASS_ROWS);
    const rows: FastPassItem[][] = [];
    for (let i = 0; i < items.length; i += perRow) {
      rows.push(items.slice(i, i + perRow));
    }
    return rows;
  });

  protected readonly fastPassTotalSeconds = computed(() => {
    const count = this.fastPassItems().length;
    return Math.max(FAST_PASS_TOTAL_MIN_SECONDS, count * FAST_PASS_SECONDS_PER_ITEM);
  });

  protected readonly galleryGroups = computed<GalleryGroup[]>(() => {
    const content = this.content();
    const keySet = this.galleryKeySet();
    if (!content) {
      return [];
    }

    const groups = new Map<number, GalleryGroup>();
    const getGroup = (gameId: number, gameTitle: string): GalleryGroup => {
      let group = groups.get(gameId);
      if (!group) {
        group = { gameId, gameTitle, bigItems: [], smallItems: [] };
        groups.set(gameId, group);
      }
      return group;
    };

    for (const cover of content.covers) {
      if (keySet.has(cover.key)) {
        getGroup(cover.gameId, cover.gameTitle).bigItems.push({
          key: cover.key,
          fileUrl: cover.fileUrl,
          title: cover.title || cover.gameTitle,
        });
      }
    }
    for (const shot of content.screenshots) {
      if (keySet.has(shot.key)) {
        getGroup(shot.gameId, shot.gameTitle).bigItems.push({
          key: shot.key,
          fileUrl: shot.fileUrl,
          title: shot.title || shot.gameTitle,
        });
      }
    }
    for (const memory of content.memories) {
      if (keySet.has(memory.key)) {
        getGroup(memory.gameId, memory.gameTitle).smallItems.push({
          key: memory.key,
          kind: 'memory',
          title: memory.title,
          gameTitle: memory.gameTitle,
          date: memory.date,
          quote: memory.description,
        });
      }
    }
    for (const achievement of content.achievements) {
      if (keySet.has(achievement.key)) {
        getGroup(achievement.gameId, achievement.gameTitle).smallItems.push({
          key: achievement.key,
          kind: 'achievement',
          title: achievement.title,
          gameTitle: achievement.gameTitle,
          date: achievement.date,
        });
      }
    }
    for (const savePoint of content.savePoints) {
      if (keySet.has(savePoint.key)) {
        getGroup(savePoint.gameId, savePoint.gameTitle).smallItems.push({
          key: savePoint.key,
          kind: 'savepoint',
          title: savePoint.title,
          gameTitle: savePoint.gameTitle,
          runName: savePoint.runName,
          date: savePoint.date,
        });
      }
    }

    for (const group of groups.values()) {
      group.smallItems.sort((a, b) => a.date.localeCompare(b.date));
    }

    const gameOrder = content.games.map((game) => game.gameId);
    return Array.from(groups.values()).sort((a, b) => {
      const dateA = a.smallItems[0]?.date;
      const dateB = b.smallItems[0]?.date;
      if (dateA && dateB) {
        return dateA.localeCompare(dateB);
      }
      if (dateA) {
        return -1;
      }
      if (dateB) {
        return 1;
      }
      return gameOrder.indexOf(a.gameId) - gameOrder.indexOf(b.gameId);
    });
  });

  protected readonly currentGalleryGroup = computed<GalleryGroup | null>(() => {
    const groups = this.galleryGroups();
    if (groups.length === 0) {
      return null;
    }
    return groups[this.galleryGroupIndex() % groups.length] ?? null;
  });

  protected readonly currentGalleryBig = computed<GalleryBigItem | null>(() => {
    const group = this.currentGalleryGroup();
    if (!group || group.bigItems.length === 0) {
      return null;
    }
    return group.bigItems[this.galleryBigIndex() % group.bigItems.length] ?? null;
  });

  protected readonly currentGalleryBatches = computed<GallerySmallItem[][]>(() => {
    const group = this.currentGalleryGroup();
    if (!group) {
      return [];
    }
    const batches: GallerySmallItem[][] = [];
    for (let i = 0; i < group.smallItems.length; i += GALLERY_BATCH_SIZE) {
      batches.push(group.smallItems.slice(i, i + GALLERY_BATCH_SIZE));
    }
    return batches;
  });

  protected readonly currentGalleryBatch = computed<GallerySmallItem[]>(() => {
    const batches = this.currentGalleryBatches();
    if (batches.length === 0) {
      return [];
    }
    return batches[this.galleryBatchIndex() % batches.length] ?? [];
  });

  protected readonly smallIcon = (kind: GallerySmallKind): IconName => SMALL_ICON_BY_KIND[kind];

  private phaseTimeout?: ReturnType<typeof setTimeout>;
  private gallerySubTimeout?: ReturnType<typeof setTimeout>;
  private galleryBigTimer?: ReturnType<typeof setInterval>;

  private lastSampledHeroUrl: string | null = null;

  constructor() {
    this.load();
    effect(() => {
      const hero = this.heroImage();
      if (hero && hero.fileUrl !== this.lastSampledHeroUrl) {
        this.lastSampledHeroUrl = hero.fileUrl;
        this.sampleAccentColor(hero.fileUrl);
      }
    });
  }

  ngOnDestroy(): void {
    this.clearAllTimers();
  }

  private resolveImage(items: { id: number; fileUrl: string; gameTitle: string }[], id: number): ResolvedImage | null {
    const match = items.find((item) => item.id === id);
    return match ? { fileUrl: match.fileUrl, gameTitle: match.gameTitle } : null;
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
            this.loading.set(false);
            this.goToPhase('tunnel');
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

  onManualTrackChange(event: Event): void {
    const value = Number((event.target as HTMLSelectElement).value);
    this.manualTrackId.set(Number.isNaN(value) || value < 0 ? null : value);
  }

  onCinematicImageLoad(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (!img.naturalWidth || !img.naturalHeight || typeof window === 'undefined') {
      return;
    }
    const imageRatio = img.naturalWidth / img.naturalHeight;
    const viewportRatio = window.innerWidth / window.innerHeight;
    const closeEnough = Math.abs(imageRatio - viewportRatio) / viewportRatio < 0.22;
    this.renderer.setStyle(img, 'object-fit', closeEnough ? 'cover' : 'contain');
  }

  togglePause(): void {
    this.paused.update((value) => !value);
    if (this.paused()) {
      this.clearAllTimers();
    } else {
      this.startPhaseTimers(this.cinematicPhase());
    }
  }

  skipPhase(): void {
    if (this.cinematicPhase() === 'gallery') {
      this.advanceGalleryStep();
      return;
    }
    const order: CinematicPhase[] = ['tunnel', 'hero', 'fastPass', 'second', 'gallery'];
    const index = order.indexOf(this.cinematicPhase());
    if (index < order.length - 1) {
      this.goToPhase(order[index + 1]);
    }
  }

  previousPhase(): void {
    if (this.cinematicPhase() === 'gallery') {
      this.retreatGalleryStep();
      return;
    }
    const order: CinematicPhase[] = ['tunnel', 'hero', 'fastPass', 'second', 'gallery'];
    const index = order.indexOf(this.cinematicPhase());
    if (index > 0) {
      this.goToPhase(order[index - 1]);
    }
  }

  private goToPhase(phase: CinematicPhase): void {
    this.clearAllTimers();
    this.cinematicPhase.set(phase);
    if (phase === 'gallery') {
      this.galleryGroupIndex.set(0);
      this.resetGalleryGroupState();
    }
    if (!this.paused()) {
      this.startPhaseTimers(phase);
    }
  }

  private startPhaseTimers(phase: CinematicPhase): void {
    switch (phase) {
      case 'tunnel':
        this.phaseTimeout = setTimeout(() => this.goToPhase('hero'), TUNNEL_DURATION_MS);
        break;
      case 'hero':
        this.phaseTimeout = setTimeout(() => this.goToPhase('fastPass'), HERO_DURATION_MS);
        break;
      case 'fastPass':
        if (this.fastPassItems().length === 0) {
          this.goToPhase('second');
        } else {
          this.phaseTimeout = setTimeout(() => this.goToPhase('second'), this.fastPassTotalSeconds() * 1000);
        }
        break;
      case 'second':
        this.phaseTimeout = setTimeout(() => this.goToPhase('gallery'), SECOND_DURATION_MS);
        break;
      case 'gallery':
        this.galleryBigTimer = setInterval(() => this.advanceGalleryBig(), GALLERY_BIG_MS);
        this.startGalleryStepTimer();
        break;
    }
  }

  private resetGalleryGroupState(): void {
    const groups = this.galleryGroups();
    const group = groups[this.galleryGroupIndex() % groups.length] ?? null;
    this.galleryBigIndex.set(0);
    this.galleryBatchIndex.set(0);
    this.gallerySubPhase.set(group && group.bigItems.length > 0 ? 'image' : 'batch');
  }

  private startGalleryStepTimer(): void {
    clearTimeout(this.gallerySubTimeout);
    if (this.gallerySubPhase() === 'image') {
      this.gallerySubTimeout = setTimeout(() => this.enterGalleryBatches(), GALLERY_IMAGE_ONLY_MS);
    } else {
      this.gallerySubTimeout = setTimeout(() => this.advanceGalleryBatch(), GALLERY_BATCH_MS);
    }
  }

  private enterGalleryBatches(): void {
    const batches = this.currentGalleryBatches();
    if (batches.length === 0) {
      this.advanceGalleryGroup();
      return;
    }
    this.gallerySubPhase.set('batch');
    this.galleryBatchIndex.set(0);
    this.startGalleryStepTimer();
  }

  private advanceGalleryBatch(): void {
    const batches = this.currentGalleryBatches();
    const next = this.galleryBatchIndex() + 1;
    if (next >= batches.length) {
      this.advanceGalleryGroup();
    } else {
      this.galleryBatchIndex.set(next);
      this.startGalleryStepTimer();
    }
  }

  private advanceGalleryStep(): void {
    clearTimeout(this.gallerySubTimeout);
    if (this.gallerySubPhase() === 'image') {
      this.enterGalleryBatches();
    } else {
      this.advanceGalleryBatch();
    }
  }

  private advanceGalleryGroup(): void {
    const groups = this.galleryGroups();
    if (groups.length === 0) {
      return;
    }
    const nextIndex = this.galleryGroupIndex() + 1;
    if (nextIndex >= groups.length) {
      this.goToPhase('tunnel');
      return;
    }
    this.galleryGroupIndex.set(nextIndex);
    this.resetGalleryGroupState();
    this.startGalleryStepTimer();
  }

  private retreatGalleryStep(): void {
    clearTimeout(this.gallerySubTimeout);
    if (this.gallerySubPhase() === 'batch' && this.galleryBatchIndex() > 0) {
      this.galleryBatchIndex.update((index) => index - 1);
      this.startGalleryStepTimer();
      return;
    }
    const currentGroup = this.currentGalleryGroup();
    if (this.gallerySubPhase() === 'batch' && currentGroup && currentGroup.bigItems.length > 0) {
      this.gallerySubPhase.set('image');
      this.startGalleryStepTimer();
      return;
    }
    if (this.galleryGroupIndex() === 0) {
      this.goToPhase('second');
      return;
    }

    const groups = this.galleryGroups();
    const previousIndex = this.galleryGroupIndex() - 1;
    this.galleryGroupIndex.set(previousIndex);
    this.galleryBigIndex.set(0);
    const previousGroup = groups[previousIndex];
    const previousBatchCount = Math.ceil(previousGroup.smallItems.length / GALLERY_BATCH_SIZE);
    if (previousBatchCount > 0) {
      this.gallerySubPhase.set('batch');
      this.galleryBatchIndex.set(previousBatchCount - 1);
    } else {
      this.gallerySubPhase.set('image');
      this.galleryBatchIndex.set(0);
    }
    this.startGalleryStepTimer();
  }

  private advanceGalleryBig(): void {
    const group = this.currentGalleryGroup();
    if (group && group.bigItems.length > 1) {
      this.galleryBigIndex.update((index) => (index + 1) % group.bigItems.length);
    }
  }

  private clearAllTimers(): void {
    clearTimeout(this.phaseTimeout);
    clearTimeout(this.gallerySubTimeout);
    clearInterval(this.galleryBigTimer);
  }

  private sampleAccentColor(url: string): void {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const size = 16;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return;
        }
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);
        let r = 0;
        let g = 0;
        let b = 0;
        let count = 0;
        for (let i = 0; i < data.length; i += 4) {
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          count++;
        }
        if (count === 0) {
          return;
        }
        const accent = `rgb(${Math.round(r / count)}, ${Math.round(g / count)}, ${Math.round(b / count)})`;
        this.renderer.setStyle(this.elementRef.nativeElement, '--saga-accent', accent);
      } catch {}
    };
    img.src = url;
  }
}
