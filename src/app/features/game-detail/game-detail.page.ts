import { ChangeDetectionStrategy, Component, ElementRef, effect, inject, signal, viewChildren } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';

import {
  Game,
  GameCover,
  GameMemory,
  GameMemoryRequest,
  GameMusic,
  GameRequest,
  GameScreenshot,
  Run,
  RunRequest,
} from '../../core/models';
import { GAME_STATUS_LABEL, GAME_STATUS_VARIANT } from '../../core/models/game-status.model';
import { RUN_STATUS_LABEL, RUN_STATUS_VARIANT } from '../../core/models/run-status.model';
import { MEMORY_TYPE_LABEL, MEMORY_TYPE_VARIANT } from '../../core/models/memory-type.model';
import { GameService } from '../../core/services/game.service';
import { RunService } from '../../core/services/run.service';
import { GameMemoryService } from '../../core/services/game-memory.service';
import { GameCoverService } from '../../core/services/game-cover.service';
import { GameScreenshotService } from '../../core/services/game-screenshot.service';
import { GameMusicService } from '../../core/services/game-music.service';
import { ToastService } from '../../core/services/toast.service';

import { ModalComponent } from '../../shared/components/modal/modal.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { FavoriteIconComponent } from '../../shared/components/favorite-icon/favorite-icon.component';
import { FileUploadButtonComponent } from '../../shared/components/file-upload-button/file-upload-button.component';

import { GameFormComponent } from '../games/components/game-form/game-form.component';
import { CoverCarouselComponent } from '../games/components/cover-carousel/cover-carousel.component';
import { RunFormComponent } from '../runs/components/run-form/run-form.component';
import { SavePointsPanelComponent } from '../runs/components/save-points-panel/save-points-panel.component';
import { MemoryFormComponent } from '../memories/components/memory-form/memory-form.component';

const FUTURE_TABS = ['Conquistas', 'DLCs', 'Mods', 'Linha do Tempo', 'Estatísticas', 'Histórico'];

@Component({
  selector: 'app-game-detail',
  standalone: true,
  imports: [
    RouterLink,
    DatePipe,
    ModalComponent,
    ConfirmDialogComponent,
    IconComponent,
    StatusBadgeComponent,
    FavoriteIconComponent,
    FileUploadButtonComponent,
    GameFormComponent,
    CoverCarouselComponent,
    RunFormComponent,
    SavePointsPanelComponent,
    MemoryFormComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './game-detail.page.html',
  styleUrl: './game-detail.page.scss',
})
export class GameDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly gameService = inject(GameService);
  private readonly runService = inject(RunService);
  private readonly memoryService = inject(GameMemoryService);
  private readonly coverService = inject(GameCoverService);
  private readonly screenshotService = inject(GameScreenshotService);
  private readonly musicService = inject(GameMusicService);
  private readonly toast = inject(ToastService);

  protected readonly futureTabs = FUTURE_TABS;

  protected readonly game = signal<Game | null>(null);
  protected readonly loadingGame = signal(true);
  protected readonly errorGame = signal(false);

  protected readonly runs = signal<Run[]>([]);
  protected readonly loadingRuns = signal(true);

  protected readonly memories = signal<GameMemory[]>([]);
  protected readonly loadingMemories = signal(true);

  protected readonly showGameModal = signal(false);
  protected readonly deletingGame = signal(false);

  protected readonly showRunModal = signal(false);
  protected readonly editingRun = signal<Run | null>(null);
  protected readonly runToDelete = signal<Run | null>(null);

  protected readonly selectedRunForSavePoints = signal<Run | null>(null);

  protected readonly showMemoryModal = signal(false);
  protected readonly editingMemory = signal<GameMemory | null>(null);
  protected readonly memoryToDelete = signal<GameMemory | null>(null);

  protected readonly covers = signal<GameCover[]>([]);
  protected readonly loadingCovers = signal(true);
  protected readonly coverToDelete = signal<GameCover | null>(null);

  protected readonly screenshots = signal<GameScreenshot[]>([]);
  protected readonly loadingScreenshots = signal(true);
  protected readonly screenshotToDelete = signal<GameScreenshot | null>(null);
  protected readonly lightboxScreenshot = signal<GameScreenshot | null>(null);

  protected readonly music = signal<GameMusic[]>([]);
  protected readonly loadingMusic = signal(true);
  protected readonly musicToDelete = signal<GameMusic | null>(null);
  protected readonly nowPlayingTrackId = signal<number | null>(null);
  private readonly musicPlayers = viewChildren<ElementRef<HTMLAudioElement>>('musicPlayer');
  private hasAutoplayed = false;

  protected readonly gameStatusLabel = (status: Game['status']) => GAME_STATUS_LABEL[status];
  protected readonly gameStatusVariant = (status: Game['status']) => GAME_STATUS_VARIANT[status];
  protected readonly runStatusLabel = (status: Run['status']) => RUN_STATUS_LABEL[status];
  protected readonly runStatusVariant = (status: Run['status']) => RUN_STATUS_VARIANT[status];
  protected readonly memoryTypeLabel = (type: GameMemory['type']) => MEMORY_TYPE_LABEL[type];
  protected readonly memoryTypeVariant = (type: GameMemory['type']) => MEMORY_TYPE_VARIANT[type];

  constructor() {
    this.loadAll(this.route.snapshot.paramMap.get('id'));
    this.route.paramMap.subscribe((params) => {
      const idParam = params.get('id');
      if (idParam !== null && Number(idParam) !== this.game()?.id) {
        this.loadAll(idParam);
      }
    });

    effect(() => {
      const tracks = this.music();
      const players = this.musicPlayers();
      if (this.hasAutoplayed || tracks.length === 0 || players.length !== tracks.length) {
        return;
      }
      this.hasAutoplayed = true;
      const index = Math.floor(Math.random() * tracks.length);
      const track = tracks[index];
      const player = players[index]?.nativeElement;
      if (player) {
        this.nowPlayingTrackId.set(track.id);
        this.playWithRetry(player);
      }
    });
  }

  /**
   * Browsers block unmuted audio autoplay on a fresh page load (e.g. after F5) since
   * there's no user gesture yet in that context. If play() is rejected, retry once on
   * the user's very next click/keydown anywhere on the page.
   */
  private playWithRetry(player: HTMLAudioElement): void {
    player.play().catch(() => {
      const retry = () => player.play().catch(() => {});
      document.addEventListener('click', retry, { once: true });
      document.addEventListener('keydown', retry, { once: true });
    });
  }

  private loadAll(idParam: string | null): void {
    const id = Number(idParam);
    if (!idParam || Number.isNaN(id)) {
      this.errorGame.set(true);
      this.loadingGame.set(false);
      return;
    }
    this.hasAutoplayed = false;
    this.nowPlayingTrackId.set(null);
    this.loadGame(id);
    this.loadRuns(id);
    this.loadMemories(id);
    this.loadCovers(id);
    this.loadScreenshots(id);
    this.loadMusic(id);
  }

  private loadGame(id: number): void {
    this.loadingGame.set(true);
    this.errorGame.set(false);
    this.gameService.getById(id).subscribe({
      next: (game) => {
        this.game.set(game);
        this.loadingGame.set(false);
      },
      error: () => {
        this.errorGame.set(true);
        this.loadingGame.set(false);
      },
    });
  }

  private loadRuns(id: number): void {
    this.loadingRuns.set(true);
    this.runService.getByGame(id).subscribe({
      next: (runs) => {
        this.runs.set(runs);
        this.loadingRuns.set(false);
      },
      error: () => this.loadingRuns.set(false),
    });
  }

  private loadMemories(id: number): void {
    this.loadingMemories.set(true);
    this.memoryService.getByGame(id).subscribe({
      next: (memories) => {
        this.memories.set(memories);
        this.loadingMemories.set(false);
      },
      error: () => this.loadingMemories.set(false),
    });
  }

  private loadCovers(id: number): void {
    this.loadingCovers.set(true);
    this.coverService.findByGame(id).subscribe({
      next: (covers) => {
        this.covers.set(covers);
        this.loadingCovers.set(false);
      },
      error: () => this.loadingCovers.set(false),
    });
  }

  private loadScreenshots(id: number): void {
    this.loadingScreenshots.set(true);
    this.screenshotService.findByGame(id).subscribe({
      next: (screenshots) => {
        this.screenshots.set(screenshots);
        this.loadingScreenshots.set(false);
      },
      error: () => this.loadingScreenshots.set(false),
    });
  }

  private loadMusic(id: number): void {
    this.loadingMusic.set(true);
    this.musicService.findByGame(id).subscribe({
      next: (music) => {
        this.music.set(music);
        this.loadingMusic.set(false);
      },
      error: () => this.loadingMusic.set(false),
    });
  }

  // ---------- Game ----------

  openEditGame(): void {
    this.showGameModal.set(true);
  }

  closeGameModal(): void {
    this.showGameModal.set(false);
  }

  onGameSaved(payload: GameRequest): void {
    const game = this.game();
    if (!game) {
      return;
    }
    this.gameService.update(game.id, payload).subscribe({
      next: (updated) => {
        this.game.set(updated);
        this.closeGameModal();
        this.toast.success('Game atualizado com sucesso.');
      },
      error: () => this.toast.error('Não foi possível atualizar o game.'),
    });
  }

  requestDeleteGame(): void {
    this.deletingGame.set(true);
  }

  confirmDeleteGame(): void {
    const game = this.game();
    if (!game) {
      return;
    }
    this.gameService.delete(game.id).subscribe({
      next: () => {
        this.toast.success('Game removido com sucesso.');
        this.router.navigate(['/biblioteca']);
      },
      error: () => {
        this.deletingGame.set(false);
        this.toast.error('Não foi possível remover o game.');
      },
    });
  }

  // ---------- Runs ----------

  openCreateRun(): void {
    this.editingRun.set(null);
    this.showRunModal.set(true);
  }

  openEditRun(run: Run): void {
    this.editingRun.set(run);
    this.showRunModal.set(true);
  }

  closeRunModal(): void {
    this.showRunModal.set(false);
    this.editingRun.set(null);
  }

  onRunSaved(payload: RunRequest): void {
    const game = this.game();
    const editing = this.editingRun();
    if (!game) {
      return;
    }
    const request = editing ? this.runService.update(editing.id, payload) : this.runService.create(game.id, payload);
    request.subscribe({
      next: () => {
        this.closeRunModal();
        this.loadRuns(game.id);
        this.toast.success(editing ? 'Run atualizada com sucesso.' : 'Run criada com sucesso.');
      },
      error: () => {
        this.toast.error(editing ? 'Não foi possível atualizar a run.' : 'Não foi possível criar a run.');
      },
    });
  }

  requestDeleteRun(run: Run): void {
    this.runToDelete.set(run);
  }

  confirmDeleteRun(): void {
    const run = this.runToDelete();
    const game = this.game();
    if (!run || !game) {
      return;
    }
    this.runService.delete(run.id).subscribe({
      next: () => {
        this.runToDelete.set(null);
        this.loadRuns(game.id);
        this.toast.success('Run removida com sucesso.');
      },
      error: () => {
        this.runToDelete.set(null);
        this.toast.error('Não foi possível remover a run.');
      },
    });
  }

  openSavePoints(run: Run): void {
    this.selectedRunForSavePoints.set(run);
  }

  closeSavePoints(): void {
    this.selectedRunForSavePoints.set(null);
  }

  // ---------- Memories ----------

  openCreateMemory(): void {
    this.editingMemory.set(null);
    this.showMemoryModal.set(true);
  }

  openEditMemory(memory: GameMemory): void {
    this.editingMemory.set(memory);
    this.showMemoryModal.set(true);
  }

  closeMemoryModal(): void {
    this.showMemoryModal.set(false);
    this.editingMemory.set(null);
  }

  onMemorySaved(payload: GameMemoryRequest): void {
    const game = this.game();
    const editing = this.editingMemory();
    if (!game) {
      return;
    }
    const request = editing
      ? this.memoryService.update(editing.id, payload)
      : this.memoryService.create(game.id, payload);
    request.subscribe({
      next: () => {
        this.closeMemoryModal();
        this.loadMemories(game.id);
        this.toast.success(editing ? 'Memória atualizada com sucesso.' : 'Memória criada com sucesso.');
      },
      error: () => {
        this.toast.error(editing ? 'Não foi possível atualizar a memória.' : 'Não foi possível criar a memória.');
      },
    });
  }

  requestDeleteMemory(memory: GameMemory): void {
    this.memoryToDelete.set(memory);
  }

  confirmDeleteMemory(): void {
    const memory = this.memoryToDelete();
    const game = this.game();
    if (!memory || !game) {
      return;
    }
    this.memoryService.delete(memory.id).subscribe({
      next: () => {
        this.memoryToDelete.set(null);
        this.loadMemories(game.id);
        this.toast.success('Memória removida com sucesso.');
      },
      error: () => {
        this.memoryToDelete.set(null);
        this.toast.error('Não foi possível remover a memória.');
      },
    });
  }

  // ---------- Covers ----------

  uploadCover(file: File): void {
    const game = this.game();
    if (!game) {
      return;
    }
    const formData = new FormData();
    formData.append('file', file);
    formData.append('displayOrder', String(this.covers().length));
    this.coverService.upload(game.id, formData).subscribe({
      next: () => {
        this.loadCovers(game.id);
        this.toast.success('Capa adicionada com sucesso.');
      },
      error: () => this.toast.error('Não foi possível enviar a capa.'),
    });
  }

  requestDeleteCover(cover: GameCover): void {
    this.coverToDelete.set(cover);
  }

  confirmDeleteCover(): void {
    const cover = this.coverToDelete();
    const game = this.game();
    if (!cover || !game) {
      return;
    }
    this.coverService.delete(cover.id).subscribe({
      next: () => {
        this.coverToDelete.set(null);
        this.loadCovers(game.id);
        this.toast.success('Capa removida com sucesso.');
      },
      error: () => {
        this.coverToDelete.set(null);
        this.toast.error('Não foi possível remover a capa.');
      },
    });
  }

  // ---------- Screenshots ----------

  uploadScreenshot(file: File): void {
    const game = this.game();
    if (!game) {
      return;
    }
    const formData = new FormData();
    formData.append('file', file);
    this.screenshotService.upload(game.id, formData).subscribe({
      next: () => {
        this.loadScreenshots(game.id);
        this.toast.success('Screenshot adicionado com sucesso.');
      },
      error: () => this.toast.error('Não foi possível enviar o screenshot.'),
    });
  }

  openLightbox(screenshot: GameScreenshot): void {
    this.lightboxScreenshot.set(screenshot);
  }

  closeLightbox(): void {
    this.lightboxScreenshot.set(null);
  }

  requestDeleteScreenshot(screenshot: GameScreenshot): void {
    this.screenshotToDelete.set(screenshot);
  }

  confirmDeleteScreenshot(): void {
    const screenshot = this.screenshotToDelete();
    const game = this.game();
    if (!screenshot || !game) {
      return;
    }
    this.screenshotService.delete(screenshot.id).subscribe({
      next: () => {
        this.screenshotToDelete.set(null);
        this.loadScreenshots(game.id);
        this.toast.success('Screenshot removido com sucesso.');
      },
      error: () => {
        this.screenshotToDelete.set(null);
        this.toast.error('Não foi possível remover o screenshot.');
      },
    });
  }

  // ---------- Music ----------

  uploadMusic(file: File): void {
    const game = this.game();
    if (!game) {
      return;
    }
    const formData = new FormData();
    formData.append('file', file);
    this.musicService.upload(game.id, formData).subscribe({
      next: () => {
        this.loadMusic(game.id);
        this.toast.success('Música adicionada com sucesso.');
      },
      error: () => this.toast.error('Não foi possível enviar a música.'),
    });
  }

  requestDeleteMusic(track: GameMusic): void {
    this.musicToDelete.set(track);
  }

  confirmDeleteMusic(): void {
    const track = this.musicToDelete();
    const game = this.game();
    if (!track || !game) {
      return;
    }
    this.musicService.delete(track.id).subscribe({
      next: () => {
        this.musicToDelete.set(null);
        this.loadMusic(game.id);
        this.toast.success('Música removida com sucesso.');
      },
      error: () => {
        this.musicToDelete.set(null);
        this.toast.error('Não foi possível remover a música.');
      },
    });
  }
}
