import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, signal, viewChildren } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';

import {
  Achievement,
  AchievementRequest,
  Dlc,
  DlcRequest,
  Game,
  GameCover,
  GameMemory,
  GameMemoryRequest,
  GameMusic,
  GameRequest,
  GameScreenshot,
  Mod,
  ModRequest,
  Run,
  RunRequest,
  SavePoint,
} from '../../core/models';
import { GAME_STATUS_LABEL, GAME_STATUS_VARIANT } from '../../core/models/game-status.model';
import { GAME_RATING_LABEL, GAME_RATING_VARIANT } from '../../core/models/game-rating.model';
import { RUN_STATUS_LABEL, RUN_STATUS_VARIANT } from '../../core/models/run-status.model';
import { MEMORY_TYPE_LABEL, MEMORY_TYPE_VARIANT } from '../../core/models/memory-type.model';
import { GameService } from '../../core/services/game.service';
import { RunService } from '../../core/services/run.service';
import { GameMemoryService } from '../../core/services/game-memory.service';
import { GameCoverService } from '../../core/services/game-cover.service';
import { GameScreenshotService } from '../../core/services/game-screenshot.service';
import { GameMusicService } from '../../core/services/game-music.service';
import { AchievementService } from '../../core/services/achievement.service';
import { DlcService } from '../../core/services/dlc.service';
import { ModService } from '../../core/services/mod.service';
import { SavePointService } from '../../core/services/save-point.service';
import { ToastService } from '../../core/services/toast.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

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
import { AchievementFormComponent } from '../achievements/components/achievement-form/achievement-form.component';
import { DlcFormComponent } from '../dlcs/components/dlc-form/dlc-form.component';
import { ModFormComponent } from '../mods/components/mod-form/mod-form.component';
import { GameTimelineChartComponent } from './components/game-timeline-chart/game-timeline-chart.component';

interface SectionTab {
  key: string;
  label: string;
}

const SECTION_TABS: SectionTab[] = [
  { key: 'info', label: 'Informações' },
  { key: 'runs', label: 'Runs' },
  { key: 'memories', label: 'Memories' },
  { key: 'screenshots', label: 'Screenshots' },
  { key: 'music', label: 'Músicas' },
  { key: 'achievements', label: 'Conquistas' },
  { key: 'dlcs', label: 'DLCs' },
  { key: 'mods', label: 'Mods' },
  { key: 'timeline', label: 'Linha do Tempo' },
];

const FUTURE_TABS = ['Estatísticas', 'Histórico'];

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
    AchievementFormComponent,
    DlcFormComponent,
    ModFormComponent,
    GameTimelineChartComponent,
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
  private readonly achievementService = inject(AchievementService);
  private readonly dlcService = inject(DlcService);
  private readonly modService = inject(ModService);
  private readonly savePointService = inject(SavePointService);
  private readonly toast = inject(ToastService);

  protected readonly futureTabs = FUTURE_TABS;
  protected readonly sectionTabs = SECTION_TABS;

  protected readonly visibleSections = signal<Set<string>>(new Set(SECTION_TABS.map((tab) => tab.key)));
  protected readonly allSectionsSelected = computed(() => this.visibleSections().size === SECTION_TABS.length);

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

  protected readonly achievements = signal<Achievement[]>([]);
  protected readonly loadingAchievements = signal(true);
  protected readonly showAchievementModal = signal(false);
  protected readonly editingAchievement = signal<Achievement | null>(null);
  protected readonly achievementToDelete = signal<Achievement | null>(null);

  protected readonly dlcs = signal<Dlc[]>([]);
  protected readonly loadingDlcs = signal(true);
  protected readonly showDlcModal = signal(false);
  protected readonly editingDlc = signal<Dlc | null>(null);
  protected readonly dlcToDelete = signal<Dlc | null>(null);

  protected readonly mods = signal<Mod[]>([]);
  protected readonly loadingMods = signal(true);
  protected readonly showModModal = signal(false);
  protected readonly editingMod = signal<Mod | null>(null);
  protected readonly modToDelete = signal<Mod | null>(null);

  protected readonly savePointsByRun = signal<Map<number, SavePoint[]>>(new Map());

  protected readonly gameStatusLabel = (status: Game['status']) => GAME_STATUS_LABEL[status];
  protected readonly gameStatusVariant = (status: Game['status']) => GAME_STATUS_VARIANT[status];
  protected readonly gameRatingLabel = (rating: NonNullable<Game['rating']>) => GAME_RATING_LABEL[rating];
  protected readonly gameRatingVariant = (rating: NonNullable<Game['rating']>) => GAME_RATING_VARIANT[rating];
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
    this.loadAchievements(id);
    this.loadDlcs(id);
    this.loadMods(id);
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
        this.loadSavePointsForTimeline(runs);
      },
      error: () => this.loadingRuns.set(false),
    });
  }

  private loadSavePointsForTimeline(runs: Run[]): void {
    if (runs.length === 0) {
      this.savePointsByRun.set(new Map());
      return;
    }
    forkJoin(runs.map((run) => this.savePointService.getByRun(run.id).pipe(catchError(() => of<SavePoint[]>([]))))).subscribe(
      (savePointsList) => {
        const map = new Map<number, SavePoint[]>();
        runs.forEach((run, index) => map.set(run.id, savePointsList[index]));
        this.savePointsByRun.set(map);
      },
    );
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

  private loadAchievements(id: number): void {
    this.loadingAchievements.set(true);
    this.achievementService.getByGame(id).subscribe({
      next: (achievements) => {
        this.achievements.set(achievements);
        this.loadingAchievements.set(false);
      },
      error: () => this.loadingAchievements.set(false),
    });
  }

  private loadDlcs(id: number): void {
    this.loadingDlcs.set(true);
    this.dlcService.getByGame(id).subscribe({
      next: (dlcs) => {
        this.dlcs.set(dlcs);
        this.loadingDlcs.set(false);
      },
      error: () => this.loadingDlcs.set(false),
    });
  }

  private loadMods(id: number): void {
    this.loadingMods.set(true);
    this.modService.getByGame(id).subscribe({
      next: (mods) => {
        this.mods.set(mods);
        this.loadingMods.set(false);
      },
      error: () => this.loadingMods.set(false),
    });
  }

  // ---------- Filtro de abas ----------

  isSectionVisible(key: string): boolean {
    return this.visibleSections().has(key);
  }

  toggleSection(key: string): void {
    const next = new Set(this.visibleSections());
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    this.visibleSections.set(next);
  }

  toggleAllSections(): void {
    this.visibleSections.set(this.allSectionsSelected() ? new Set() : new Set(SECTION_TABS.map((tab) => tab.key)));
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
    this.loadSavePointsForTimeline(this.runs());
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

  // ---------- Achievements ----------

  openCreateAchievement(): void {
    this.editingAchievement.set(null);
    this.showAchievementModal.set(true);
  }

  openEditAchievement(achievement: Achievement): void {
    this.editingAchievement.set(achievement);
    this.showAchievementModal.set(true);
  }

  closeAchievementModal(): void {
    this.showAchievementModal.set(false);
    this.editingAchievement.set(null);
  }

  onAchievementSaved(payload: AchievementRequest): void {
    const game = this.game();
    const editing = this.editingAchievement();
    if (!game) {
      return;
    }
    const request = editing
      ? this.achievementService.update(editing.id, payload)
      : this.achievementService.create(game.id, payload);
    request.subscribe({
      next: () => {
        this.closeAchievementModal();
        this.loadAchievements(game.id);
        this.toast.success(editing ? 'Conquista atualizada com sucesso.' : 'Conquista criada com sucesso.');
      },
      error: () => {
        this.toast.error(editing ? 'Não foi possível atualizar a conquista.' : 'Não foi possível criar a conquista.');
      },
    });
  }

  requestDeleteAchievement(achievement: Achievement): void {
    this.achievementToDelete.set(achievement);
  }

  confirmDeleteAchievement(): void {
    const achievement = this.achievementToDelete();
    const game = this.game();
    if (!achievement || !game) {
      return;
    }
    this.achievementService.delete(achievement.id).subscribe({
      next: () => {
        this.achievementToDelete.set(null);
        this.loadAchievements(game.id);
        this.toast.success('Conquista removida com sucesso.');
      },
      error: () => {
        this.achievementToDelete.set(null);
        this.toast.error('Não foi possível remover a conquista.');
      },
    });
  }

  // ---------- DLCs ----------

  openCreateDlc(): void {
    this.editingDlc.set(null);
    this.showDlcModal.set(true);
  }

  openEditDlc(dlc: Dlc): void {
    this.editingDlc.set(dlc);
    this.showDlcModal.set(true);
  }

  closeDlcModal(): void {
    this.showDlcModal.set(false);
    this.editingDlc.set(null);
  }

  onDlcSaved(payload: DlcRequest): void {
    const game = this.game();
    const editing = this.editingDlc();
    if (!game) {
      return;
    }
    const request = editing ? this.dlcService.update(editing.id, payload) : this.dlcService.create(game.id, payload);
    request.subscribe({
      next: () => {
        this.closeDlcModal();
        this.loadDlcs(game.id);
        this.toast.success(editing ? 'DLC atualizada com sucesso.' : 'DLC criada com sucesso.');
      },
      error: () => {
        this.toast.error(editing ? 'Não foi possível atualizar a DLC.' : 'Não foi possível criar a DLC.');
      },
    });
  }

  requestDeleteDlc(dlc: Dlc): void {
    this.dlcToDelete.set(dlc);
  }

  confirmDeleteDlc(): void {
    const dlc = this.dlcToDelete();
    const game = this.game();
    if (!dlc || !game) {
      return;
    }
    this.dlcService.delete(dlc.id).subscribe({
      next: () => {
        this.dlcToDelete.set(null);
        this.loadDlcs(game.id);
        this.toast.success('DLC removida com sucesso.');
      },
      error: () => {
        this.dlcToDelete.set(null);
        this.toast.error('Não foi possível remover a DLC.');
      },
    });
  }

  // ---------- Mods ----------

  openCreateMod(): void {
    this.editingMod.set(null);
    this.showModModal.set(true);
  }

  openEditMod(mod: Mod): void {
    this.editingMod.set(mod);
    this.showModModal.set(true);
  }

  closeModModal(): void {
    this.showModModal.set(false);
    this.editingMod.set(null);
  }

  onModSaved(payload: ModRequest): void {
    const game = this.game();
    const editing = this.editingMod();
    if (!game) {
      return;
    }
    const request = editing ? this.modService.update(editing.id, payload) : this.modService.create(game.id, payload);
    request.subscribe({
      next: () => {
        this.closeModModal();
        this.loadMods(game.id);
        this.toast.success(editing ? 'Mod atualizado com sucesso.' : 'Mod criado com sucesso.');
      },
      error: () => {
        this.toast.error(editing ? 'Não foi possível atualizar o mod.' : 'Não foi possível criar o mod.');
      },
    });
  }

  requestDeleteMod(mod: Mod): void {
    this.modToDelete.set(mod);
  }

  confirmDeleteMod(): void {
    const mod = this.modToDelete();
    const game = this.game();
    if (!mod || !game) {
      return;
    }
    this.modService.delete(mod.id).subscribe({
      next: () => {
        this.modToDelete.set(null);
        this.loadMods(game.id);
        this.toast.success('Mod removido com sucesso.');
      },
      error: () => {
        this.modToDelete.set(null);
        this.toast.error('Não foi possível remover o mod.');
      },
    });
  }
}
