import { ChangeDetectionStrategy, Component, OnDestroy, computed, effect, inject, input, signal } from '@angular/core';
import { GameCover } from '../../../../core/models';
import { GameCoverService } from '../../../../core/services/game-cover.service';
import { IconComponent } from '../../../../shared/components/icon/icon.component';

const MIN_ROTATION_MS = 30_000;
const MAX_ROTATION_MS = 60_000;
const FADE_MS = 400;

@Component({
  selector: 'app-cover-carousel',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cover-carousel.component.html',
  styleUrl: './cover-carousel.component.scss',
})
export class CoverCarouselComponent implements OnDestroy {
  private readonly coverService = inject(GameCoverService);

  /** Self-fetch mode: pass a gameId and the component loads its own covers. */
  readonly gameId = input<number | null>(null);
  /** Data-driven mode: pass the covers array directly (e.g. kept in sync with a manager UI). */
  readonly covers = input<GameCover[] | null>(null);
  readonly altText = input<string>('Capa do jogo');
  readonly iconSize = input<number>(32);

  private readonly fetchedCovers = signal<GameCover[]>([]);
  protected readonly activeCovers = computed(() => this.covers() ?? this.fetchedCovers());

  protected readonly currentIndex = signal(0);
  protected readonly visible = signal(true);

  private rotationTimeout?: ReturnType<typeof setTimeout>;
  private fadeTimeout?: ReturnType<typeof setTimeout>;

  constructor() {
    effect(() => {
      const explicitCovers = this.covers();
      if (explicitCovers) {
        this.resetRotation(explicitCovers);
        return;
      }

      const id = this.gameId();
      if (id == null) {
        this.resetRotation([]);
        return;
      }

      this.coverService.findByGame(id).subscribe({
        next: (covers) => this.resetRotation(covers),
      });
    });
  }

  ngOnDestroy(): void {
    this.clearTimers();
  }

  private resetRotation(covers: GameCover[]): void {
    this.clearTimers();
    this.fetchedCovers.set(covers);
    this.currentIndex.set(covers.length > 0 ? Math.floor(Math.random() * covers.length) : 0);
    this.visible.set(true);
    if (covers.length > 1) {
      this.scheduleNext();
    }
  }

  private scheduleNext(): void {
    const delay = MIN_ROTATION_MS + Math.random() * (MAX_ROTATION_MS - MIN_ROTATION_MS);
    this.rotationTimeout = setTimeout(() => {
      this.visible.set(false);
      this.fadeTimeout = setTimeout(() => {
        const total = this.activeCovers().length;
        this.currentIndex.update((i) => (total > 0 ? (i + 1) % total : 0));
        this.visible.set(true);
        this.scheduleNext();
      }, FADE_MS);
    }, delay);
  }

  private clearTimers(): void {
    if (this.rotationTimeout) {
      clearTimeout(this.rotationTimeout);
    }
    if (this.fadeTimeout) {
      clearTimeout(this.fadeTimeout);
    }
  }
}
