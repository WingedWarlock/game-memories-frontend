import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map, shareReplay, switchMap } from 'rxjs/operators';
import { Achievement, GameMemory, LifeEvent, Run, SavePoint } from '../models';
import { GameService } from './game.service';
import { RunService } from './run.service';
import { GameMemoryService } from './game-memory.service';
import { AchievementService } from './achievement.service';
import { SavePointService } from './save-point.service';
import { LifeEventService } from './life-event.service';
import { RunWithGame, SpecialDayCandidate, buildSpecialDayCandidates } from '../utils/special-days.util';

@Injectable({ providedIn: 'root' })
export class SpecialDaysService {
  private readonly gameService = inject(GameService);
  private readonly runService = inject(RunService);
  private readonly memoryService = inject(GameMemoryService);
  private readonly achievementService = inject(AchievementService);
  private readonly savePointService = inject(SavePointService);
  private readonly lifeEventService = inject(LifeEventService);

  private candidates$?: Observable<SpecialDayCandidate[]>;

  getCandidates(): Observable<SpecialDayCandidate[]> {
    if (!this.candidates$) {
      this.candidates$ = this.fetchCandidates().pipe(shareReplay(1));
    }
    return this.candidates$;
  }

  /** Forces the next getCandidates() call to re-fetch instead of reusing the cached result. */
  refresh(): void {
    this.candidates$ = undefined;
  }

  private fetchCandidates(): Observable<SpecialDayCandidate[]> {
    return this.gameService.getAll().pipe(
      switchMap((games) => {
        if (games.length === 0) {
          return of<SpecialDayCandidate[]>([]);
        }
        return forkJoin({
          runs: forkJoin(games.map((game) => this.runService.getByGame(game.id).pipe(catchError(() => of<Run[]>([]))))),
          memories: forkJoin(
            games.map((game) => this.memoryService.getByGame(game.id).pipe(catchError(() => of<GameMemory[]>([])))),
          ),
          achievements: forkJoin(
            games.map((game) => this.achievementService.getByGame(game.id).pipe(catchError(() => of<Achievement[]>([])))),
          ),
          lifeEvents: this.lifeEventService.getAll().pipe(catchError(() => of<LifeEvent[]>([]))),
        }).pipe(
          switchMap(({ runs, memories, achievements, lifeEvents }) => {
            const allRuns: RunWithGame[] = [];
            games.forEach((game, index) => {
              for (const run of runs[index]) {
                allRuns.push({ game, run });
              }
            });

            if (allRuns.length === 0) {
              return of(buildSpecialDayCandidates(games, allRuns, memories, achievements, lifeEvents, []));
            }

            return forkJoin(
              allRuns.map(({ run }) => this.savePointService.getByRun(run.id).pipe(catchError(() => of<SavePoint[]>([])))),
            ).pipe(
              map((savePointLists) =>
                buildSpecialDayCandidates(games, allRuns, memories, achievements, lifeEvents, savePointLists),
              ),
            );
          }),
        );
      }),
    );
  }
}
