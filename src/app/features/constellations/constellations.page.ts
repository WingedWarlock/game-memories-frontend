import { ChangeDetectionStrategy, Component, OnDestroy, inject, signal } from '@angular/core';
import { NgFor } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Game, Saga } from '../../core/models';
import { GameService } from '../../core/services/game.service';
import { SagaService } from '../../core/services/saga.service';
import { ToastService } from '../../core/services/toast.service';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { SagaMergeFormComponent, SagaMergeSubmission } from './components/saga-merge-form/saga-merge-form.component';
import { SagaContentService } from './saga-content.service';
import { ALL_MOTIF_SHAPES, MOTIF_LINES, MOTIF_POINTS } from './saga-motifs.util';

type EntryPhase = 'tunnel' | 'title' | 'content';

const TUNNEL_DURATION_MS = 2400;
const TITLE_DURATION_MS = 1600;

@Component({
  selector: 'app-constellations',
  standalone: true,
  imports: [NgFor, RouterLink, ModalComponent, ConfirmDialogComponent, IconComponent, SagaMergeFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './constellations.page.html',
  styleUrl: './constellations.page.scss',
})
export class ConstellationsPage implements OnDestroy {
  private readonly sagaService = inject(SagaService);
  private readonly gameService = inject(GameService);
  private readonly sagaContentService = inject(SagaContentService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly loading = signal(true);
  protected readonly error = signal(false);
  protected readonly sagas = signal<Saga[]>([]);
  protected readonly games = signal<Game[]>([]);
  protected readonly heroThumbnails = signal<Record<number, string>>({});

  protected readonly showMergeModal = signal(false);
  protected readonly sagaToDelete = signal<Saga | null>(null);

  protected readonly entryPhase = signal<EntryPhase>('tunnel');

  protected readonly allMotifs = ALL_MOTIF_SHAPES;
  protected readonly motifLines = MOTIF_LINES;
  protected readonly motifPoints = MOTIF_POINTS;

  protected readonly trackBySagaId = (_: number, saga: Saga) => saga.id;

  private entryTimeouts: ReturnType<typeof setTimeout>[] = [];

  constructor() {
    this.load();
    this.startEntrySequence();
  }

  ngOnDestroy(): void {
    this.clearEntryTimeouts();
  }

  private startEntrySequence(): void {
    const reducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      this.entryPhase.set('content');
      return;
    }
    this.entryTimeouts.push(
      setTimeout(() => this.entryPhase.set('title'), TUNNEL_DURATION_MS),
      setTimeout(() => this.entryPhase.set('content'), TUNNEL_DURATION_MS + TITLE_DURATION_MS),
    );
  }

  private clearEntryTimeouts(): void {
    for (const timeout of this.entryTimeouts) {
      clearTimeout(timeout);
    }
    this.entryTimeouts = [];
  }

  skipIntro(): void {
    this.clearEntryTimeouts();
    this.entryPhase.set('content');
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    forkJoin({
      sagas: this.sagaService.getAll(),
      games: this.gameService.getAll(),
    }).subscribe({
      next: ({ sagas, games }) => {
        this.sagas.set(sagas);
        this.games.set(games);
        this.loading.set(false);
        this.loadHeroThumbnails(sagas);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  private loadHeroThumbnails(sagas: Saga[]): void {
    const withHero = sagas.filter((saga) => saga.heroImageType && saga.heroImageId != null);
    if (withHero.length === 0) {
      this.heroThumbnails.set({});
      return;
    }
    forkJoin(
      withHero.map((saga) =>
        this.sagaContentService.loadContent(saga.gameSagaNames).pipe(
          map((content) => {
            const items = saga.heroImageType === 'GAME_COVER' ? content.covers : content.screenshots;
            const match = items.find((item) => item.id === saga.heroImageId);
            return { sagaId: saga.id, url: match?.fileUrl ?? null };
          }),
          catchError(() => of({ sagaId: saga.id, url: null as string | null })),
        ),
      ),
    ).subscribe((results) => {
      const thumbnails: Record<number, string> = {};
      for (const result of results) {
        if (result.url) {
          thumbnails[result.sagaId] = result.url;
        }
      }
      this.heroThumbnails.set(thumbnails);
    });
  }

  openMergeModal(): void {
    this.showMergeModal.set(true);
  }

  closeMergeModal(): void {
    this.showMergeModal.set(false);
  }

  onMergeSaved(submission: SagaMergeSubmission): void {
    this.sagaService
      .create({
        name: submission.name,
        gameSagaNames: submission.gameSagaNames,
        musicChangePolicy: 'SAME_THROUGHOUT',
        galleryItems: [],
      })
      .subscribe({
        next: (saga) => {
          this.closeMergeModal();
          this.toast.success(`Constelação "${saga.name}" criada.`);
          this.router.navigate(['/constelacoes', saga.id, 'editar']);
        },
        error: () => this.toast.error('Não foi possível criar a constelação.'),
      });
  }

  editSaga(saga: Saga): void {
    this.router.navigate(['/constelacoes', saga.id, 'editar']);
  }

  requestDelete(saga: Saga): void {
    this.sagaToDelete.set(saga);
  }

  cancelDelete(): void {
    this.sagaToDelete.set(null);
  }

  confirmDelete(): void {
    const saga = this.sagaToDelete();
    if (!saga) {
      return;
    }
    this.sagaService.delete(saga.id).subscribe({
      next: () => {
        this.sagaToDelete.set(null);
        this.load();
        this.toast.success('Constelação removida.');
      },
      error: () => {
        this.sagaToDelete.set(null);
        this.toast.error('Não foi possível remover a constelação.');
      },
    });
  }
}
