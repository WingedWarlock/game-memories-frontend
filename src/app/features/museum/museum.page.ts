import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { DatePipe, NgFor } from '@angular/common';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  Achievement,
  Game,
  GameMemory,
  GameMusic,
  GameScreenshot,
  LifeEvent,
  Run,
  SavePoint,
} from '../../core/models';
import { LIFE_EVENT_CATEGORY_LABEL } from '../../core/models/life-event.model';
import { GameService } from '../../core/services/game.service';
import { RunService } from '../../core/services/run.service';
import { GameMemoryService } from '../../core/services/game-memory.service';
import { AchievementService } from '../../core/services/achievement.service';
import { GameScreenshotService } from '../../core/services/game-screenshot.service';
import { GameMusicService } from '../../core/services/game-music.service';
import { SavePointService } from '../../core/services/save-point.service';
import { LifeEventService } from '../../core/services/life-event.service';
import { IconComponent, IconName } from '../../shared/components/icon/icon.component';
import { CoverCarouselComponent } from '../games/components/cover-carousel/cover-carousel.component';

interface GameYearEntry {
  gameId: number;
  title: string;
  saga?: string;
  startedThisYear: boolean;
  completedThisYear: boolean;
}

interface MemoryEntry {
  key: string;
  gameId: number;
  gameTitle: string;
  title: string;
  description: string;
  date: string;
}

interface AchievementEntry {
  key: string;
  gameId: number;
  gameTitle: string;
  title: string;
  description?: string;
  date: string;
}

interface SavePointEntry {
  key: string;
  gameId: number;
  gameTitle: string;
  runName: string;
  title: string;
  description?: string;
  date: string;
}

interface ScreenshotEntry {
  key: string;
  gameId: number;
  gameTitle: string;
  fileUrl: string;
  title?: string;
}

interface MusicEntry {
  key: string;
  gameId: number;
  gameTitle: string;
  fileUrl: string;
  title?: string;
  originalFileName: string;
  artist?: string;
}

interface YearHighlights {
  firstGameStarted: { gameTitle: string; date: string } | null;
  lastGameCompleted: { gameTitle: string; date: string } | null;
  longestRun: { gameTitle: string; runName: string; days: number } | null;
}

interface YearExhibit {
  year: number;
  games: GameYearEntry[];
  memories: MemoryEntry[];
  achievements: AchievementEntry[];
  savePoints: SavePointEntry[];
  lifeEvents: LifeEvent[];
  screenshots: ScreenshotEntry[];
  musicTracks: MusicEntry[];
  highlights: YearHighlights;
}

type SpecialDayKind = 'run-started' | 'run-completed' | 'memory' | 'achievement' | 'save-point' | 'life-event';

interface SpecialDayCandidate {
  key: string;
  date: string;
  kind: SpecialDayKind;
  gameTitle?: string;
  runName?: string;
  label: string;
}

interface SpecialDay {
  key: string;
  yearsAgo: number;
  text: string;
}

type ReliveSlideKind = 'intro' | 'games' | 'highlights' | 'timeline' | 'screenshots' | 'outro';
type ReliveTimelineItemKind = 'memory' | 'achievement' | 'save-point' | 'life-event';

interface ReliveTimelineItem {
  kind: ReliveTimelineItemKind;
  icon: IconName;
  title: string;
  subtitle: string;
  body?: string;
}

interface ReliveHighlight {
  label: string;
  title: string;
  meta: string;
}

interface ReliveSlide {
  kind: ReliveSlideKind;
  title: string;
  body?: string;
  games?: GameYearEntry[];
  items?: ReliveTimelineItem[];
  screenshots?: ScreenshotEntry[];
  highlights?: ReliveHighlight[];
}

interface ReliveState {
  year: number;
  slides: ReliveSlide[];
  index: number;
  tracks: MusicEntry[];
  trackIndex: number;
}

const RELIVE_SLIDE_MS = 8000;
const MAX_SCREENSHOTS_PER_YEAR = 18;
const MAX_RELIVE_SCREENSHOTS = 18;
const TIMELINE_ITEMS_PER_SLIDE = 4;
const SCREENSHOTS_PER_SLIDE = 6;

function yearOf(dateStr: string): number {
  return Number(dateStr.slice(0, 4));
}

function formatBrDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

function daysBetween(startDate: string, endDate: string): number {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  return Math.max(0, Math.round((end - start) / 86400000));
}

@Component({
  selector: 'app-museum',
  standalone: true,
  imports: [NgFor, DatePipe, IconComponent, CoverCarouselComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './museum.page.html',
  styleUrl: './museum.page.scss',
})
export class MuseumPage implements OnDestroy {
  private readonly gameService = inject(GameService);
  private readonly runService = inject(RunService);
  private readonly memoryService = inject(GameMemoryService);
  private readonly achievementService = inject(AchievementService);
  private readonly screenshotService = inject(GameScreenshotService);
  private readonly musicService = inject(GameMusicService);
  private readonly savePointService = inject(SavePointService);
  private readonly lifeEventService = inject(LifeEventService);

  protected readonly loading = signal(true);
  protected readonly error = signal(false);
  protected readonly exhibits = signal<YearExhibit[]>([]);
  protected readonly selectedYear = signal<number | null>(null);

  private readonly specialDayCandidates = signal<SpecialDayCandidate[]>([]);

  protected readonly currentExhibit = computed<YearExhibit | null>(() => {
    const year = this.selectedYear();
    if (year == null) {
      return null;
    }
    return this.exhibits().find((exhibit) => exhibit.year === year) ?? null;
  });

  protected readonly specialDays = computed<SpecialDay[]>(() => {
    const today = new Date();
    const todayMonth = today.getMonth() + 1;
    const todayDay = today.getDate();
    const currentYear = today.getFullYear();

    const matches: SpecialDay[] = [];
    for (const candidate of this.specialDayCandidates()) {
      const [yearStr, monthStr, dayStr] = candidate.date.split('-');
      const year = Number(yearStr);
      if (Number(monthStr) !== todayMonth || Number(dayStr) !== todayDay || year >= currentYear) {
        continue;
      }
      const yearsAgo = currentYear - year;
      matches.push({ key: candidate.key, yearsAgo, text: this.buildSpecialDayText(candidate, yearsAgo) });
    }
    return matches.sort((a, b) => b.yearsAgo - a.yearsAgo);
  });

  protected readonly relive = signal<ReliveState | null>(null);
  protected readonly reliveMuted = signal(false);
  protected readonly reliveTransitioning = signal(false);
  protected readonly currentSlide = computed<ReliveSlide | null>(() => {
    const state = this.relive();
    return state ? (state.slides[state.index] ?? null) : null;
  });
  protected readonly reliveTrack = computed<MusicEntry | null>(() => {
    const state = this.relive();
    if (!state || state.trackIndex < 0) {
      return null;
    }
    return state.tracks[state.trackIndex] ?? null;
  });

  protected readonly reliveAudioEl = viewChild<ElementRef<HTMLAudioElement>>('reliveAudio');

  protected readonly lifeEventCategoryLabel = (category: LifeEvent['category']) => LIFE_EVENT_CATEGORY_LABEL[category];

  protected readonly trackByExhibitYear = (_: number, exhibit: YearExhibit) => exhibit.year;
  protected readonly trackByGameEntryId = (_: number, entry: GameYearEntry) => entry.gameId;
  protected readonly trackByMemoryKey = (_: number, entry: MemoryEntry) => entry.key;
  protected readonly trackByAchievementKey = (_: number, entry: AchievementEntry) => entry.key;
  protected readonly trackBySavePointKey = (_: number, entry: SavePointEntry) => entry.key;
  protected readonly trackByScreenshotKey = (_: number, entry: ScreenshotEntry) => entry.key;
  protected readonly trackByLifeEventId = (_: number, entry: LifeEvent) => entry.id;
  protected readonly trackBySpecialDayKey = (_: number, entry: SpecialDay) => entry.key;

  private reliveTimer?: ReturnType<typeof setInterval>;
  private reliveTransitionTimeout?: ReturnType<typeof setTimeout>;

  constructor() {
    this.load();
    effect(() => {
      const track = this.reliveTrack();
      const audio = this.reliveAudioEl()?.nativeElement;
      if (!audio || !track) {
        return;
      }
      audio.load();
      void audio.play().catch(() => {});
    });
  }

  ngOnDestroy(): void {
    this.clearReliveTimer();
    clearTimeout(this.reliveTransitionTimeout);
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.gameService.getAll().subscribe({
      next: (games) => {
        if (games.length === 0) {
          this.exhibits.set([]);
          this.loading.set(false);
          return;
        }
        forkJoin({
          runs: forkJoin(games.map((game) => this.runService.getByGame(game.id).pipe(catchError(() => of<Run[]>([]))))),
          memories: forkJoin(
            games.map((game) => this.memoryService.getByGame(game.id).pipe(catchError(() => of<GameMemory[]>([])))),
          ),
          achievements: forkJoin(
            games.map((game) => this.achievementService.getByGame(game.id).pipe(catchError(() => of<Achievement[]>([])))),
          ),
          screenshots: forkJoin(
            games.map((game) => this.screenshotService.findByGame(game.id).pipe(catchError(() => of<GameScreenshot[]>([])))),
          ),
          music: forkJoin(
            games.map((game) => this.musicService.findByGame(game.id).pipe(catchError(() => of<GameMusic[]>([])))),
          ),
          lifeEvents: this.lifeEventService.getAll().pipe(catchError(() => of<LifeEvent[]>([]))),
        }).subscribe(({ runs, memories, achievements, screenshots, music, lifeEvents }) => {
          const allRuns: { game: Game; run: Run }[] = [];
          games.forEach((game, index) => {
            for (const run of runs[index]) {
              allRuns.push({ game, run });
            }
          });

          if (allRuns.length === 0) {
            this.finishLoading(games, allRuns, memories, achievements, screenshots, music, lifeEvents, []);
            return;
          }

          forkJoin(
            allRuns.map(({ run }) => this.savePointService.getByRun(run.id).pipe(catchError(() => of<SavePoint[]>([])))),
          ).subscribe((savePointLists) => {
            this.finishLoading(games, allRuns, memories, achievements, screenshots, music, lifeEvents, savePointLists);
          });
        });
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  selectYear(year: number): void {
    this.selectedYear.set(year);
  }

  startRelive(exhibit: YearExhibit): void {
    const slides = this.buildReliveSlides(exhibit);
    if (slides.length === 0) {
      return;
    }
    this.relive.set({
      year: exhibit.year,
      slides,
      index: 0,
      tracks: exhibit.musicTracks,
      trackIndex: exhibit.musicTracks.length > 0 ? 0 : -1,
    });
    this.reliveMuted.set(false);
    this.pulseTransition();
    this.restartReliveTimer();
  }

  selectReliveTrack(index: number): void {
    const state = this.relive();
    if (!state) {
      return;
    }
    this.relive.set({ ...state, trackIndex: index });
  }

  onReliveTrackChange(event: Event): void {
    const value = Number((event.target as HTMLSelectElement).value);
    if (!Number.isNaN(value)) {
      this.selectReliveTrack(value);
    }
  }

  closeRelive(): void {
    this.clearReliveTimer();
    clearTimeout(this.reliveTransitionTimeout);
    this.reliveTransitioning.set(false);
    this.relive.set(null);
  }

  reliveNext(): void {
    const state = this.relive();
    if (!state) {
      return;
    }
    if (state.index >= state.slides.length - 1) {
      this.closeRelive();
      return;
    }
    this.relive.set({ ...state, index: state.index + 1 });
    this.pulseTransition();
    this.restartReliveTimer();
  }

  relivePrev(): void {
    const state = this.relive();
    if (!state || state.index === 0) {
      return;
    }
    this.relive.set({ ...state, index: state.index - 1 });
    this.pulseTransition();
    this.restartReliveTimer();
  }

  private pulseTransition(): void {
    this.reliveTransitioning.set(true);
    clearTimeout(this.reliveTransitionTimeout);
    this.reliveTransitionTimeout = setTimeout(() => this.reliveTransitioning.set(false), 700);
  }

  toggleReliveMute(): void {
    this.reliveMuted.update((value) => !value);
  }

  private restartReliveTimer(): void {
    this.clearReliveTimer();
    this.reliveTimer = setInterval(() => this.reliveNext(), RELIVE_SLIDE_MS);
  }

  private clearReliveTimer(): void {
    if (this.reliveTimer) {
      clearInterval(this.reliveTimer);
      this.reliveTimer = undefined;
    }
  }

  private buildReliveSlides(exhibit: YearExhibit): ReliveSlide[] {
    const slides: ReliveSlide[] = [
      {
        kind: 'intro',
        title: String(exhibit.year),
        body: `${exhibit.games.length} jogo(s) · ${exhibit.memories.length} memória(s) · ${exhibit.achievements.length} conquista(s)`,
      },
    ];

    if (exhibit.games.length > 0) {
      slides.push({
        kind: 'games',
        title: 'Jogos do ano',
        games: exhibit.games,
      });
    }

    const highlightCards: ReliveHighlight[] = [];
    if (exhibit.highlights.firstGameStarted) {
      highlightCards.push({
        label: 'Primeiro jogo iniciado',
        title: exhibit.highlights.firstGameStarted.gameTitle,
        meta: formatBrDate(exhibit.highlights.firstGameStarted.date),
      });
    }
    if (exhibit.highlights.lastGameCompleted) {
      highlightCards.push({
        label: 'Último jogo terminado',
        title: exhibit.highlights.lastGameCompleted.gameTitle,
        meta: formatBrDate(exhibit.highlights.lastGameCompleted.date),
      });
    }
    if (exhibit.highlights.longestRun) {
      highlightCards.push({
        label: 'Maior aventura',
        title: exhibit.highlights.longestRun.gameTitle,
        meta: `${exhibit.highlights.longestRun.runName} · ${exhibit.highlights.longestRun.days} dia(s)`,
      });
    }
    if (highlightCards.length > 0) {
      slides.push({
        kind: 'highlights',
        title: 'Destaques do ano',
        highlights: highlightCards,
      });
    }

    const timeline: { date: string; item: ReliveTimelineItem }[] = [];

    for (const memory of exhibit.memories) {
      timeline.push({
        date: memory.date,
        item: {
          kind: 'memory',
          icon: 'book',
          title: memory.title,
          body: memory.description,
          subtitle: `${memory.gameTitle} · ${formatBrDate(memory.date)}`,
        },
      });
    }
    for (const achievement of exhibit.achievements) {
      timeline.push({
        date: achievement.date,
        item: {
          kind: 'achievement',
          icon: 'trophy',
          title: achievement.title,
          subtitle: `${achievement.gameTitle} · ${formatBrDate(achievement.date)}`,
        },
      });
    }
    for (const savePoint of exhibit.savePoints) {
      timeline.push({
        date: savePoint.date,
        item: {
          kind: 'save-point',
          icon: 'save',
          title: savePoint.title,
          subtitle: `${savePoint.gameTitle} · ${savePoint.runName} · ${formatBrDate(savePoint.date)}`,
        },
      });
    }
    for (const lifeEvent of exhibit.lifeEvents) {
      timeline.push({
        date: lifeEvent.date,
        item: {
          kind: 'life-event',
          icon: 'calendar',
          title: lifeEvent.title,
          subtitle: `${LIFE_EVENT_CATEGORY_LABEL[lifeEvent.category]} · ${formatBrDate(lifeEvent.date)}`,
        },
      });
    }

    timeline.sort((a, b) => a.date.localeCompare(b.date));
    for (let i = 0; i < timeline.length; i += TIMELINE_ITEMS_PER_SLIDE) {
      slides.push({
        kind: 'timeline',
        title: 'Momentos',
        items: timeline.slice(i, i + TIMELINE_ITEMS_PER_SLIDE).map((entry) => entry.item),
      });
    }

    const screenshots = exhibit.screenshots.slice(0, MAX_RELIVE_SCREENSHOTS);
    for (let i = 0; i < screenshots.length; i += SCREENSHOTS_PER_SLIDE) {
      slides.push({
        kind: 'screenshots',
        title: 'Screenshots',
        screenshots: screenshots.slice(i, i + SCREENSHOTS_PER_SLIDE),
      });
    }

    slides.push({
      kind: 'outro',
      title: String(exhibit.year),
      body: 'Foi assim que foi esse ano. Até a próxima visita ao museu.',
    });

    return slides;
  }

  private buildSpecialDayText(candidate: SpecialDayCandidate, yearsAgo: number): string {
    const yearsLabel = `${yearsAgo} ${yearsAgo === 1 ? 'ano' : 'anos'}`;
    switch (candidate.kind) {
      case 'run-completed':
        return `Hoje faz ${yearsLabel} que você terminou ${candidate.gameTitle} (run "${candidate.runName}").`;
      case 'run-started':
        return `Hoje faz ${yearsLabel} que você começou sua run "${candidate.runName}" em ${candidate.gameTitle}.`;
      case 'achievement':
        return `Hoje faz ${yearsLabel} que você desbloqueou "${candidate.label}" em ${candidate.gameTitle}.`;
      case 'memory':
        return `Hoje faz ${yearsLabel} que você registrou a memória "${candidate.label}" em ${candidate.gameTitle}.`;
      case 'save-point':
        return `Hoje faz ${yearsLabel} que você salvou em "${candidate.label}" — ${candidate.gameTitle}.`;
      case 'life-event':
        return `Hoje faz ${yearsLabel}: ${candidate.label}.`;
    }
  }

  private finishLoading(
    games: Game[],
    allRuns: { game: Game; run: Run }[],
    memoriesLists: GameMemory[][],
    achievementsLists: Achievement[][],
    screenshotsLists: GameScreenshot[][],
    musicLists: GameMusic[][],
    lifeEvents: LifeEvent[],
    savePointLists: SavePoint[][],
  ): void {
    const yearMap = new Map<number, YearExhibit>();
    const getExhibit = (year: number): YearExhibit => {
      let exhibit = yearMap.get(year);
      if (!exhibit) {
        exhibit = {
          year,
          games: [],
          memories: [],
          achievements: [],
          savePoints: [],
          lifeEvents: [],
          screenshots: [],
          musicTracks: [],
          highlights: { firstGameStarted: null, lastGameCompleted: null, longestRun: null },
        };
        yearMap.set(year, exhibit);
      }
      return exhibit;
    };

    const firstStartedByYear = new Map<number, { gameTitle: string; date: string }>();
    const lastCompletedByYear = new Map<number, { gameTitle: string; date: string }>();
    const longestRunByYear = new Map<number, { gameTitle: string; runName: string; days: number }>();

    const gameYearsPlayed = new Map<number, Set<number>>();
    const addGameYear = (game: Game, year: number, started: boolean, completed: boolean) => {
      if (!Number.isFinite(year)) {
        return;
      }
      if (!gameYearsPlayed.has(game.id)) {
        gameYearsPlayed.set(game.id, new Set());
      }
      gameYearsPlayed.get(game.id)!.add(year);

      const exhibit = getExhibit(year);
      let entry = exhibit.games.find((g) => g.gameId === game.id);
      if (!entry) {
        entry = { gameId: game.id, title: game.title, saga: game.saga, startedThisYear: false, completedThisYear: false };
        exhibit.games.push(entry);
      }
      entry.startedThisYear = entry.startedThisYear || started;
      entry.completedThisYear = entry.completedThisYear || completed;
    };

    for (const { game, run } of allRuns) {
      if (run.startDate) {
        const year = yearOf(run.startDate);
        addGameYear(game, year, true, false);
        const currentFirst = firstStartedByYear.get(year);
        if (!currentFirst || run.startDate < currentFirst.date) {
          firstStartedByYear.set(year, { gameTitle: game.title, date: run.startDate });
        }
      }
      if (run.endDate) {
        const year = yearOf(run.endDate);
        addGameYear(game, year, false, true);
        const currentLast = lastCompletedByYear.get(year);
        if (!currentLast || run.endDate > currentLast.date) {
          lastCompletedByYear.set(year, { gameTitle: game.title, date: run.endDate });
        }
      }
      if (run.startDate && run.endDate && run.endDate >= run.startDate) {
        const year = yearOf(run.endDate);
        const days = daysBetween(run.startDate, run.endDate);
        const currentLongest = longestRunByYear.get(year);
        if (!currentLongest || days > currentLongest.days) {
          longestRunByYear.set(year, { gameTitle: game.title, runName: run.runName, days });
        }
      }
    }

    games.forEach((game, index) => {
      for (const memory of memoriesLists[index]) {
        if (!memory.memoryDate) {
          continue;
        }
        getExhibit(yearOf(memory.memoryDate)).memories.push({
          key: `memory-${memory.id}`,
          gameId: game.id,
          gameTitle: game.title,
          title: memory.title,
          description: memory.description,
          date: memory.memoryDate,
        });
      }
      for (const achievement of achievementsLists[index]) {
        if (!achievement.unlocked || !achievement.unlockedDate) {
          continue;
        }
        getExhibit(yearOf(achievement.unlockedDate)).achievements.push({
          key: `achievement-${achievement.id}`,
          gameId: game.id,
          gameTitle: game.title,
          title: achievement.title,
          description: achievement.description,
          date: achievement.unlockedDate,
        });
      }
    });

    allRuns.forEach(({ game, run }, index) => {
      for (const savePoint of savePointLists[index] ?? []) {
        if (!savePoint.date) {
          continue;
        }
        getExhibit(yearOf(savePoint.date)).savePoints.push({
          key: `savepoint-${savePoint.id}`,
          gameId: game.id,
          gameTitle: game.title,
          runName: run.runName,
          title: savePoint.title,
          description: savePoint.description,
          date: savePoint.date,
        });
      }
    });

    for (const lifeEvent of lifeEvents) {
      if (!lifeEvent.date) {
        continue;
      }
      getExhibit(yearOf(lifeEvent.date)).lifeEvents.push(lifeEvent);
    }

    games.forEach((game, index) => {
      const years = gameYearsPlayed.get(game.id);
      if (!years || years.size === 0) {
        return;
      }
      for (const shot of screenshotsLists[index]) {
        for (const year of years) {
          const exhibit = getExhibit(year);
          if (exhibit.screenshots.length < MAX_SCREENSHOTS_PER_YEAR) {
            exhibit.screenshots.push({
              key: `screenshot-${shot.id}-${year}`,
              gameId: game.id,
              gameTitle: game.title,
              fileUrl: shot.fileUrl,
              title: shot.title,
            });
          }
        }
      }
      for (const track of musicLists[index]) {
        for (const year of years) {
          getExhibit(year).musicTracks.push({
            key: `music-${track.id}-${year}`,
            gameId: game.id,
            gameTitle: game.title,
            fileUrl: track.fileUrl,
            title: track.title,
            originalFileName: track.originalFileName,
            artist: track.artist,
          });
        }
      }
    });

    const exhibits = Array.from(yearMap.values())
      .sort((a, b) => b.year - a.year)
      .map((exhibit) => ({
        ...exhibit,
        games: exhibit.games.slice().sort((a, b) => a.title.localeCompare(b.title, 'pt-BR', { sensitivity: 'base' })),
        memories: exhibit.memories.slice().sort((a, b) => a.date.localeCompare(b.date)),
        achievements: exhibit.achievements.slice().sort((a, b) => a.date.localeCompare(b.date)),
        savePoints: exhibit.savePoints.slice().sort((a, b) => a.date.localeCompare(b.date)),
        lifeEvents: exhibit.lifeEvents.slice().sort((a, b) => a.date.localeCompare(b.date)),
        highlights: {
          firstGameStarted: firstStartedByYear.get(exhibit.year) ?? null,
          lastGameCompleted: lastCompletedByYear.get(exhibit.year) ?? null,
          longestRun: longestRunByYear.get(exhibit.year) ?? null,
        },
      }));

    this.exhibits.set(exhibits);
    this.loading.set(false);
    if (exhibits.length > 0 && this.selectedYear() == null) {
      this.selectedYear.set(exhibits[0].year);
    }

    this.buildSpecialDayCandidates(games, allRuns, memoriesLists, achievementsLists, lifeEvents, savePointLists);
  }

  private buildSpecialDayCandidates(
    games: Game[],
    allRuns: { game: Game; run: Run }[],
    memoriesLists: GameMemory[][],
    achievementsLists: Achievement[][],
    lifeEvents: LifeEvent[],
    savePointLists: SavePoint[][],
  ): void {
    const candidates: SpecialDayCandidate[] = [];

    for (const { game, run } of allRuns) {
      if (run.startDate) {
        candidates.push({
          key: `run-started-${run.id}`,
          date: run.startDate,
          kind: 'run-started',
          gameTitle: game.title,
          runName: run.runName,
          label: run.runName,
        });
      }
      if (run.endDate) {
        candidates.push({
          key: `run-completed-${run.id}`,
          date: run.endDate,
          kind: 'run-completed',
          gameTitle: game.title,
          runName: run.runName,
          label: run.runName,
        });
      }
    }

    games.forEach((game, index) => {
      for (const memory of memoriesLists[index]) {
        if (!memory.memoryDate) {
          continue;
        }
        candidates.push({
          key: `memory-${memory.id}`,
          date: memory.memoryDate,
          kind: 'memory',
          gameTitle: game.title,
          label: memory.title,
        });
      }
      for (const achievement of achievementsLists[index]) {
        if (!achievement.unlocked || !achievement.unlockedDate) {
          continue;
        }
        candidates.push({
          key: `achievement-${achievement.id}`,
          date: achievement.unlockedDate,
          kind: 'achievement',
          gameTitle: game.title,
          label: achievement.title,
        });
      }
    });

    allRuns.forEach(({ game, run }, index) => {
      for (const savePoint of savePointLists[index] ?? []) {
        if (!savePoint.date) {
          continue;
        }
        candidates.push({
          key: `savepoint-${savePoint.id}`,
          date: savePoint.date,
          kind: 'save-point',
          gameTitle: game.title,
          label: savePoint.title,
        });
      }
    });

    for (const lifeEvent of lifeEvents) {
      if (!lifeEvent.date) {
        continue;
      }
      candidates.push({
        key: `life-event-${lifeEvent.id}`,
        date: lifeEvent.date,
        kind: 'life-event',
        label: lifeEvent.title,
      });
    }

    this.specialDayCandidates.set(candidates);
  }
}
