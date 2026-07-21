import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NgFor } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

import { Achievement, Game, GameMemory, LifeEvent, LifeEventRequest, Retrospective, Run, SavePoint } from '../../core/models';
import { GameService } from '../../core/services/game.service';
import { RunService } from '../../core/services/run.service';
import { SavePointService } from '../../core/services/save-point.service';
import { GameMemoryService } from '../../core/services/game-memory.service';
import { AchievementService } from '../../core/services/achievement.service';
import { LifeEventService } from '../../core/services/life-event.service';
import { StatsService } from '../../core/services/stats.service';
import { ToastService } from '../../core/services/toast.service';
import { SpecialDaysService } from '../../core/services/special-days.service';
import { SpecialDay, SpecialDayCandidate, filterSpecialDaysForDate } from '../../core/utils/special-days.util';
import { LIFE_EVENT_CATEGORY_LABEL } from '../../core/models/life-event.model';

import { GameCardComponent } from '../games/components/game-card/game-card.component';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { LifeEventFormComponent } from '../life-events/components/life-event-form/life-event-form.component';
import { LibraryRun, LibraryTimelineChartComponent } from './components/library-timeline-chart/library-timeline-chart.component';
import { QuickNavComponent } from '../../shared/components/quick-nav/quick-nav.component';

interface TimelineEntry {
  key: string;
  game: Game;
  isPlaying: boolean;
  captionLabel: string | null;
  completionDate: string | null;
}

interface TimelineYearGroup {
  year: number;
  entries: TimelineEntry[];
  lifeEvents: LifeEvent[];
  summary: Retrospective | null;
}

function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

@Component({
  selector: 'app-timeline',
  standalone: true,
  imports: [
    NgFor,
    RouterLink,
    GameCardComponent,
    ModalComponent,
    ConfirmDialogComponent,
    IconComponent,
    LifeEventFormComponent,
    LibraryTimelineChartComponent,
    QuickNavComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './timeline.page.html',
  styleUrl: './timeline.page.scss',
})
export class TimelinePage {
  private readonly gameService = inject(GameService);
  private readonly runService = inject(RunService);
  private readonly savePointService = inject(SavePointService);
  private readonly memoryService = inject(GameMemoryService);
  private readonly achievementService = inject(AchievementService);
  private readonly lifeEventService = inject(LifeEventService);
  private readonly statsService = inject(StatsService);
  private readonly toast = inject(ToastService);
  private readonly specialDaysService = inject(SpecialDaysService);

  protected readonly loading = signal(true);
  protected readonly error = signal(false);
  protected readonly yearGroups = signal<TimelineYearGroup[]>([]);
  protected readonly isEmpty = signal(false);
  protected readonly expandedYears = signal<Set<number>>(new Set());
  private expansionInitialized = false;

  private readonly museumSpecialDayCandidates = signal<SpecialDayCandidate[]>([]);
  protected readonly museumSpecialDaysToday = computed<SpecialDay[]>(() => {
    const today = new Date();
    return filterSpecialDaysForDate(
      this.museumSpecialDayCandidates(),
      today.getMonth() + 1,
      today.getDate(),
      today.getFullYear(),
      'Hoje',
    );
  });

  protected readonly allYearsExpanded = computed(() => {
    const groups = this.yearGroups();
    return groups.length > 0 && groups.every((group) => this.expandedYears().has(group.year));
  });

  protected readonly quickNavItems = computed(() => {
    const items = this.yearGroups().map((group) => ({ id: `year-${group.year}`, label: String(group.year) }));
    if (this.libraryRuns().length > 0) {
      items.push({ id: 'library-timeline', label: 'Geral' });
    }
    return items;
  });

  protected readonly showMoments = signal(true);

  protected readonly showLifeEventModal = signal(false);
  protected readonly editingLifeEvent = signal<LifeEvent | null>(null);
  protected readonly lifeEventToDelete = signal<LifeEvent | null>(null);

  protected readonly lifeEventCategoryLabel = (category: LifeEvent['category']) => LIFE_EVENT_CATEGORY_LABEL[category];
  protected readonly trackByLifeEventId = (_: number, lifeEvent: LifeEvent) => lifeEvent.id;

  protected readonly libraryRuns = signal<LibraryRun[]>([]);
  protected readonly librarySavePointsByRun = signal<Map<number, SavePoint[]>>(new Map());
  protected readonly libraryMemoriesByRun = signal<Map<number, GameMemory[]>>(new Map());
  protected readonly libraryAchievementsByRun = signal<Map<number, Achievement[]>>(new Map());
  protected readonly allLifeEvents = signal<LifeEvent[]>([]);

  constructor() {
    this.load();
    this.specialDaysService.getCandidates().subscribe((candidates) => this.museumSpecialDayCandidates.set(candidates));
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);

    this.gameService
      .getAll()
      .pipe(
        switchMap((games) => {
          const lifeEvents$ = this.lifeEventService.getAll().pipe(catchError(() => of<LifeEvent[]>([])));
          if (games.length === 0) {
            return lifeEvents$.pipe(map((lifeEvents) => ({ games, runsByGameId: new Map<number, Run[]>(), lifeEvents })));
          }
          const runRequests = games.map((game) => this.runService.getByGame(game.id).pipe(catchError(() => of<Run[]>([]))));
          return forkJoin([forkJoin(runRequests), lifeEvents$]).pipe(
            map(([runsList, lifeEvents]) => {
              const runsByGameId = new Map<number, Run[]>();
              games.forEach((game, index) => runsByGameId.set(game.id, runsList[index]));
              return { games, runsByGameId, lifeEvents };
            }),
          );
        }),
      )
      .subscribe({
        next: ({ games, runsByGameId, lifeEvents }) => {
          const groups = this.buildYearGroups(games, runsByGameId, lifeEvents);
          this.loadSummaries(groups);
          this.loadLibraryTimeline(games, runsByGameId);
          this.allLifeEvents.set(lifeEvents);
        },
        error: () => {
          this.error.set(true);
          this.loading.set(false);
        },
      });
  }

  private loadLibraryTimeline(games: Game[], runsByGameId: Map<number, Run[]>): void {
    const gameTitleById = new Map(games.map((game) => [game.id, game.title]));
    const libraryRuns: LibraryRun[] = [];
    for (const runs of runsByGameId.values()) {
      for (const run of runs) {
        libraryRuns.push({ ...run, gameTitle: gameTitleById.get(run.gameId) ?? '' });
      }
    }
    this.libraryRuns.set(libraryRuns);

    if (libraryRuns.length === 0) {
      this.librarySavePointsByRun.set(new Map());
      this.libraryMemoriesByRun.set(new Map());
      this.libraryAchievementsByRun.set(new Map());
      return;
    }

    forkJoin(
      libraryRuns.map((run) => this.savePointService.getByRun(run.id).pipe(catchError(() => of<SavePoint[]>([])))),
    ).subscribe((savePointsList) => {
      const map = new Map<number, SavePoint[]>();
      libraryRuns.forEach((run, index) => map.set(run.id, savePointsList[index]));
      this.librarySavePointsByRun.set(map);
    });

    // Memórias e conquistas não pertencem a uma run — jogamos elas na primeira run (por data de início) de cada jogo.
    const firstRunIdByGameId = new Map<number, number>();
    for (const [gameId, runs] of runsByGameId.entries()) {
      const firstRun = [...runs].sort((a, b) => {
        if (a.startDate && b.startDate) return a.startDate.localeCompare(b.startDate);
        if (a.startDate) return -1;
        if (b.startDate) return 1;
        return a.id - b.id;
      })[0];
      if (firstRun) {
        firstRunIdByGameId.set(gameId, firstRun.id);
      }
    }

    const gamesWithRuns = games.filter((game) => firstRunIdByGameId.has(game.id));
    if (gamesWithRuns.length === 0) {
      this.libraryMemoriesByRun.set(new Map());
      this.libraryAchievementsByRun.set(new Map());
      return;
    }

    forkJoin(
      gamesWithRuns.map((game) => this.memoryService.getByGame(game.id).pipe(catchError(() => of<GameMemory[]>([])))),
    ).subscribe((memoriesList) => {
      const map = new Map<number, GameMemory[]>();
      gamesWithRuns.forEach((game, index) => {
        const runId = firstRunIdByGameId.get(game.id)!;
        map.set(runId, [...(map.get(runId) ?? []), ...memoriesList[index]]);
      });
      this.libraryMemoriesByRun.set(map);
    });

    forkJoin(
      gamesWithRuns.map((game) => this.achievementService.getByGame(game.id).pipe(catchError(() => of<Achievement[]>([])))),
    ).subscribe((achievementsList) => {
      const map = new Map<number, Achievement[]>();
      gamesWithRuns.forEach((game, index) => {
        const runId = firstRunIdByGameId.get(game.id)!;
        map.set(runId, [...(map.get(runId) ?? []), ...achievementsList[index]]);
      });
      this.libraryAchievementsByRun.set(map);
    });
  }

  private loadSummaries(groups: TimelineYearGroup[]): void {
    if (groups.length === 0) {
      this.yearGroups.set([]);
      this.isEmpty.set(true);
      this.loading.set(false);
      return;
    }

    if (!this.expansionInitialized) {
      this.expansionInitialized = true;
      this.expandedYears.set(new Set(groups.map((group) => group.year)));
    }

    forkJoin(groups.map((group) => this.statsService.getRetrospective(group.year).pipe(catchError(() => of(null))))).subscribe(
      (summaries) => {
        this.yearGroups.set(groups.map((group, index) => ({ ...group, summary: summaries[index] })));
        this.isEmpty.set(false);
        this.loading.set(false);
      },
    );
  }

  private buildYearGroups(games: Game[], runsByGameId: Map<number, Run[]>, lifeEvents: LifeEvent[]): TimelineYearGroup[] {
    const currentYear = new Date().getFullYear();

    const playingEntries: TimelineEntry[] = games
      .map((game) => ({ game, run: (runsByGameId.get(game.id) ?? []).find((run) => run.status === 'IN_PROGRESS') }))
      .filter((entry): entry is { game: Game; run: Run } => !!entry.run)
      .map(({ game, run }) => ({
        key: `playing-${game.id}`,
        game,
        isPlaying: true,
        captionLabel: run.startDate ? `${run.runName} — iniciado em ${formatDate(run.startDate)}` : run.runName,
        completionDate: null,
      }));

    const completedByYear = new Map<number, TimelineEntry[]>();

    for (const game of games) {
      const completedRuns = (runsByGameId.get(game.id) ?? []).filter((run) => run.status === 'COMPLETED' && !!run.endDate);
      for (const run of completedRuns) {
        const year = Number(run.endDate!.slice(0, 4));
        const entry: TimelineEntry = {
          key: `run-${run.id}`,
          game,
          isPlaying: false,
          captionLabel: `${run.runName} — concluído em ${formatDate(run.endDate!)}`,
          completionDate: run.endDate!,
        };
        const list = completedByYear.get(year) ?? [];
        list.push(entry);
        completedByYear.set(year, list);
      }
    }

    for (const list of completedByYear.values()) {
      list.sort((a, b) => b.completionDate!.localeCompare(a.completionDate!));
    }

    const lifeEventsByYear = new Map<number, LifeEvent[]>();
    for (const lifeEvent of lifeEvents) {
      const year = Number(lifeEvent.date.slice(0, 4));
      const list = lifeEventsByYear.get(year) ?? [];
      list.push(lifeEvent);
      lifeEventsByYear.set(year, list);
    }
    for (const list of lifeEventsByYear.values()) {
      list.sort((a, b) => a.date.localeCompare(b.date));
    }

    const years = new Set(completedByYear.keys());
    for (const year of lifeEventsByYear.keys()) {
      years.add(year);
    }
    if (playingEntries.length > 0) {
      years.add(currentYear);
    }

    return Array.from(years)
      .sort((a, b) => b - a)
      .map((year) => {
        const entries =
          year === currentYear ? [...playingEntries, ...(completedByYear.get(year) ?? [])] : (completedByYear.get(year) ?? []);
        return { year, entries, lifeEvents: lifeEventsByYear.get(year) ?? [], summary: null };
      })
      .filter((group) => group.entries.length > 0 || group.lifeEvents.length > 0);
  }

  // ---------- Grupos recolhíveis ----------

  isYearExpanded(year: number): boolean {
    return this.expandedYears().has(year);
  }

  toggleYear(year: number): void {
    const next = new Set(this.expandedYears());
    if (next.has(year)) {
      next.delete(year);
    } else {
      next.add(year);
    }
    this.expandedYears.set(next);
  }

  toggleAllYears(): void {
    this.expandedYears.set(this.allYearsExpanded() ? new Set() : new Set(this.yearGroups().map((group) => group.year)));
  }

  toggleMoments(): void {
    this.showMoments.update((value) => !value);
  }

  onQuickNavBeforeScroll(id: string): void {
    if (!id.startsWith('year-')) {
      return;
    }
    const year = Number(id.slice('year-'.length));
    if (!this.expandedYears().has(year)) {
      const next = new Set(this.expandedYears());
      next.add(year);
      this.expandedYears.set(next);
    }
  }

  // ---------- Momentos de vida ----------

  openCreateLifeEvent(): void {
    this.editingLifeEvent.set(null);
    this.showLifeEventModal.set(true);
  }

  openEditLifeEvent(lifeEvent: LifeEvent): void {
    this.editingLifeEvent.set(lifeEvent);
    this.showLifeEventModal.set(true);
  }

  closeLifeEventModal(): void {
    this.showLifeEventModal.set(false);
    this.editingLifeEvent.set(null);
  }

  onLifeEventSaved(payload: LifeEventRequest): void {
    const editing = this.editingLifeEvent();
    const request = editing ? this.lifeEventService.update(editing.id, payload) : this.lifeEventService.create(payload);
    request.subscribe({
      next: () => {
        this.closeLifeEventModal();
        this.load();
        this.toast.success(editing ? 'Momento atualizado com sucesso.' : 'Momento adicionado com sucesso.');
      },
      error: () => {
        this.toast.error(editing ? 'Não foi possível atualizar o momento.' : 'Não foi possível adicionar o momento.');
      },
    });
  }

  requestDeleteLifeEvent(lifeEvent: LifeEvent): void {
    this.lifeEventToDelete.set(lifeEvent);
  }

  confirmDeleteLifeEvent(): void {
    const lifeEvent = this.lifeEventToDelete();
    if (!lifeEvent) {
      return;
    }
    this.lifeEventService.delete(lifeEvent.id).subscribe({
      next: () => {
        this.lifeEventToDelete.set(null);
        this.load();
        this.toast.success('Momento removido com sucesso.');
      },
      error: () => {
        this.lifeEventToDelete.set(null);
        this.toast.error('Não foi possível remover o momento.');
      },
    });
  }
}
