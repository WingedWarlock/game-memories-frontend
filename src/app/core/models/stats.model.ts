import { GameRating } from './game-rating.model';
import { LifeEvent } from './life-event.model';

export interface NameCount {
  name: string;
  count: number;
}

export interface YearCount {
  year: number;
  count: number;
}

export interface GameRef {
  id: number;
  title: string;
}

export interface GameCountRef {
  id: number;
  title: string;
  count: number;
}

export interface StatsLibrary {
  totalGames: number;
  favoriteGames: number;
  completedGames: number;
  playingGames: number;
  pausedGames: number;
  notStartedGames: number;
  hundredPercentGames: number;
  totalRuns: number;
  totalMemories: number;
  totalSavePoints: number;
  totalScreenshots: number;
  totalMusic: number;
  totalMods: number;
  totalDlcs: number;
  totalAchievements: number;
  unlockedAchievements: number;
}

export interface StatsTimelineHighlights {
  yearWithMostGamesStarted: YearCount | null;
  yearWithMostGamesCompleted: YearCount | null;
  yearWithMostMemories: YearCount | null;
  yearWithMostRuns: YearCount | null;
}

export interface StatsHighlights {
  mostPlayedSaga: string | null;
  favoriteGenre: string | null;
  mostUsedPlatform: string | null;
  firstGameRegistered: GameRef | null;
  lastGameRegistered: GameRef | null;
  gameWithMostRuns: GameCountRef | null;
  gameWithMostMemories: GameCountRef | null;
  gameWithMostSavePoints: GameCountRef | null;
}

export interface Stats {
  library: StatsLibrary;
  bySaga: NameCount[];
  byPlatform: NameCount[];
  byGenre: NameCount[];
  byStatus: NameCount[];
  byRating: NameCount[];
  timelineHighlights: StatsTimelineHighlights;
  highlights: StatsHighlights;
}

export interface GameRatingRef {
  id: number;
  title: string;
  rating: GameRating;
}

export interface GameDateRef {
  id: number;
  title: string;
  date: string;
}

export interface RunSpan {
  gameTitle: string;
  runName: string;
  days: number;
}

export interface MemoryHighlight {
  gameId: number;
  gameTitle: string;
  title: string;
  description?: string;
  memoryDate: string;
}

export interface Retrospective {
  year: number;
  gamesStarted: number;
  gamesCompleted: number;
  hundredPercentCount: number;
  favoriteOfYear: GameRef | null;
  bestRatingOfYear: GameRatingRef | null;
  topSaga: string | null;
  topGenre: string | null;
  topPlatform: string | null;
  runsCount: number;
  memoriesCount: number;
  savePointsCount: number;
  screenshotsCount: number;
  musicCount: number;
  firstGameStarted: GameDateRef | null;
  lastGameStarted: GameDateRef | null;
  firstGameCompleted: GameDateRef | null;
  lastGameCompleted: GameDateRef | null;
  longestRun: RunSpan | null;
  shortestRun: RunSpan | null;
  mostPlayedGameOfYear: GameCountRef | null;
  highlightMemories: MemoryHighlight[];
  lifeEvents: LifeEvent[];
}
