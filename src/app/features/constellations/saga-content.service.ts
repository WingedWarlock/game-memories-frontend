import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { Achievement, Game, GameCover, GameMemory, GameMusic, GameScreenshot, GalleryItemType, Run, SavePoint } from '../../core/models';
import { GameService } from '../../core/services/game.service';
import { RunService } from '../../core/services/run.service';
import { GameMemoryService } from '../../core/services/game-memory.service';
import { AchievementService } from '../../core/services/achievement.service';
import { GameScreenshotService } from '../../core/services/game-screenshot.service';
import { GameMusicService } from '../../core/services/game-music.service';
import { GameCoverService } from '../../core/services/game-cover.service';
import { SavePointService } from '../../core/services/save-point.service';

export function galleryKeyFor(type: GalleryItemType, id: number): string {
  switch (type) {
    case 'GAME_MEMORY':
      return `memory-${id}`;
    case 'ACHIEVEMENT':
      return `achievement-${id}`;
    case 'SAVE_POINT':
      return `savepoint-${id}`;
    case 'GAME_SCREENSHOT':
      return `screenshot-${id}`;
    case 'GAME_COVER':
      return `cover-${id}`;
  }
}

export interface SagaGameEntry {
  gameId: number;
  title: string;
}

export interface SagaMemoryEntry {
  key: string;
  gameId: number;
  gameTitle: string;
  id: number;
  title: string;
  description: string;
  date: string;
}

export interface SagaAchievementEntry {
  key: string;
  gameId: number;
  gameTitle: string;
  id: number;
  title: string;
  description?: string;
  date: string;
}

export interface SagaSavePointEntry {
  key: string;
  gameId: number;
  gameTitle: string;
  runName: string;
  id: number;
  title: string;
  description?: string;
  date: string;
}

export interface SagaScreenshotEntry {
  key: string;
  gameId: number;
  gameTitle: string;
  id: number;
  fileUrl: string;
  title?: string;
}

export interface SagaCoverEntry {
  key: string;
  gameId: number;
  gameTitle: string;
  id: number;
  fileUrl: string;
  title?: string;
}

export interface SagaMusicEntry {
  key: string;
  gameId: number;
  gameTitle: string;
  id: number;
  fileUrl: string;
  title?: string;
  artist?: string;
  originalFileName: string;
}

export interface SagaContent {
  games: SagaGameEntry[];
  memories: SagaMemoryEntry[];
  achievements: SagaAchievementEntry[];
  savePoints: SagaSavePointEntry[];
  screenshots: SagaScreenshotEntry[];
  covers: SagaCoverEntry[];
  music: SagaMusicEntry[];
}

const EMPTY_CONTENT: SagaContent = {
  games: [],
  memories: [],
  achievements: [],
  savePoints: [],
  screenshots: [],
  covers: [],
  music: [],
};

@Injectable({ providedIn: 'root' })
export class SagaContentService {
  private readonly gameService = inject(GameService);
  private readonly runService = inject(RunService);
  private readonly memoryService = inject(GameMemoryService);
  private readonly achievementService = inject(AchievementService);
  private readonly screenshotService = inject(GameScreenshotService);
  private readonly musicService = inject(GameMusicService);
  private readonly coverService = inject(GameCoverService);
  private readonly savePointService = inject(SavePointService);

  loadContent(gameSagaNames: string[]): Observable<SagaContent> {
    return this.gameService.getAll().pipe(
      switchMap((allGames) => {
        const games = allGames.filter((game) => !!game.saga && gameSagaNames.includes(game.saga));
        if (games.length === 0) {
          return of(EMPTY_CONTENT);
        }

        return forkJoin({
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
          covers: forkJoin(
            games.map((game) => this.coverService.findByGame(game.id).pipe(catchError(() => of<GameCover[]>([])))),
          ),
        }).pipe(
          switchMap(({ runs, memories, achievements, screenshots, music, covers }) => {
            const allRuns: { game: Game; run: Run }[] = [];
            games.forEach((game, index) => {
              for (const run of runs[index]) {
                allRuns.push({ game, run });
              }
            });

            const buildContent = (savePointLists: SavePoint[][]): SagaContent => {
              const savePoints: SagaSavePointEntry[] = [];
              allRuns.forEach(({ game, run }, index) => {
                for (const savePoint of savePointLists[index] ?? []) {
                  if (!savePoint.date) {
                    continue;
                  }
                  savePoints.push({
                    key: `savepoint-${savePoint.id}`,
                    gameId: game.id,
                    gameTitle: game.title,
                    runName: run.runName,
                    id: savePoint.id,
                    title: savePoint.title,
                    description: savePoint.description,
                    date: savePoint.date,
                  });
                }
              });

              const memoryEntries: SagaMemoryEntry[] = [];
              const achievementEntries: SagaAchievementEntry[] = [];
              const screenshotEntries: SagaScreenshotEntry[] = [];
              const coverEntries: SagaCoverEntry[] = [];
              const musicEntries: SagaMusicEntry[] = [];

              games.forEach((game, index) => {
                for (const memory of memories[index]) {
                  memoryEntries.push({
                    key: `memory-${memory.id}`,
                    gameId: game.id,
                    gameTitle: game.title,
                    id: memory.id,
                    title: memory.title,
                    description: memory.description,
                    date: memory.memoryDate,
                  });
                }
                for (const achievement of achievements[index]) {
                  if (!achievement.unlocked || !achievement.unlockedDate) {
                    continue;
                  }
                  achievementEntries.push({
                    key: `achievement-${achievement.id}`,
                    gameId: game.id,
                    gameTitle: game.title,
                    id: achievement.id,
                    title: achievement.title,
                    description: achievement.description,
                    date: achievement.unlockedDate,
                  });
                }
                for (const shot of screenshots[index]) {
                  screenshotEntries.push({
                    key: `screenshot-${shot.id}`,
                    gameId: game.id,
                    gameTitle: game.title,
                    id: shot.id,
                    fileUrl: shot.fileUrl,
                    title: shot.title,
                  });
                }
                for (const cover of covers[index]) {
                  coverEntries.push({
                    key: `cover-${cover.id}`,
                    gameId: game.id,
                    gameTitle: game.title,
                    id: cover.id,
                    fileUrl: cover.fileUrl,
                    title: cover.title,
                  });
                }
                for (const track of music[index]) {
                  musicEntries.push({
                    key: `music-${track.id}`,
                    gameId: game.id,
                    gameTitle: game.title,
                    id: track.id,
                    fileUrl: track.fileUrl,
                    title: track.title,
                    artist: track.artist,
                    originalFileName: track.originalFileName,
                  });
                }
              });

              return {
                games: games.map((game) => ({ gameId: game.id, title: game.title })),
                memories: memoryEntries,
                achievements: achievementEntries,
                savePoints,
                screenshots: screenshotEntries,
                covers: coverEntries,
                music: musicEntries,
              };
            };

            if (allRuns.length === 0) {
              return of(buildContent([]));
            }

            return forkJoin(
              allRuns.map(({ run }) => this.savePointService.getByRun(run.id).pipe(catchError(() => of<SavePoint[]>([])))),
            ).pipe(map((savePointLists) => buildContent(savePointLists)));
          }),
        );
      }),
    );
  }
}
