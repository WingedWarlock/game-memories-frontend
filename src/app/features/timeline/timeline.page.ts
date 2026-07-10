import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

import { Game, Run } from '../../core/models';
import { GameService } from '../../core/services/game.service';
import { RunService } from '../../core/services/run.service';
import { GameCardComponent } from '../games/components/game-card/game-card.component';

interface TimelineEntry {
  game: Game;
  isPlaying: boolean;
  captionLabel: string | null;
  completionDate: string | null;
}

interface TimelineYearGroup {
  year: number;
  entries: TimelineEntry[];
}

function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

@Component({
  selector: 'app-timeline',
  standalone: true,
  imports: [GameCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './timeline.page.html',
  styleUrl: './timeline.page.scss',
})
export class TimelinePage {
  private readonly gameService = inject(GameService);
  private readonly runService = inject(RunService);

  protected readonly loading = signal(true);
  protected readonly error = signal(false);
  protected readonly yearGroups = signal<TimelineYearGroup[]>([]);
  protected readonly isEmpty = signal(false);

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);

    this.gameService
      .getAll()
      .pipe(
        switchMap((games) => {
          if (games.length === 0) {
            return of({ games, runsByGameId: new Map<number, Run[]>() });
          }
          const runRequests = games.map((game) =>
            this.runService.getByGame(game.id).pipe(catchError(() => of<Run[]>([]))),
          );
          return forkJoin(runRequests).pipe(
            map((runsList) => {
              const runsByGameId = new Map<number, Run[]>();
              games.forEach((game, index) => runsByGameId.set(game.id, runsList[index]));
              return { games, runsByGameId };
            }),
          );
        }),
      )
      .subscribe({
        next: ({ games, runsByGameId }) => {
          const groups = this.buildYearGroups(games, runsByGameId);
          this.yearGroups.set(groups);
          this.isEmpty.set(groups.length === 0);
          this.loading.set(false);
        },
        error: () => {
          this.error.set(true);
          this.loading.set(false);
        },
      });
  }

  private buildYearGroups(games: Game[], runsByGameId: Map<number, Run[]>): TimelineYearGroup[] {
    const currentYear = new Date().getFullYear();

    const playingEntries: TimelineEntry[] = games
      .filter((game) => game.status === 'PLAYING')
      .map((game) => ({ game, isPlaying: true, captionLabel: null, completionDate: null }));

    const playingIds = new Set(playingEntries.map((entry) => entry.game.id));
    const completedByYear = new Map<number, TimelineEntry[]>();

    for (const game of games) {
      if (playingIds.has(game.id)) {
        continue;
      }
      const completedRuns = (runsByGameId.get(game.id) ?? []).filter(
        (run) => run.status === 'COMPLETED' && !!run.endDate,
      );
      if (completedRuns.length === 0) {
        continue;
      }
      const mostRecent = completedRuns.reduce((latest, run) =>
        run.endDate! > latest.endDate! ? run : latest,
      );
      const year = Number(mostRecent.endDate!.slice(0, 4));
      const entry: TimelineEntry = {
        game,
        isPlaying: false,
        captionLabel: `Concluído em ${formatDate(mostRecent.endDate!)}`,
        completionDate: mostRecent.endDate!,
      };
      const list = completedByYear.get(year) ?? [];
      list.push(entry);
      completedByYear.set(year, list);
    }

    for (const list of completedByYear.values()) {
      list.sort((a, b) => b.completionDate!.localeCompare(a.completionDate!));
    }

    const years = new Set(completedByYear.keys());
    if (playingEntries.length > 0) {
      years.add(currentYear);
    }

    return Array.from(years)
      .sort((a, b) => b - a)
      .map((year) => {
        const entries =
          year === currentYear
            ? [...playingEntries, ...(completedByYear.get(year) ?? [])]
            : (completedByYear.get(year) ?? []);
        return { year, entries };
      })
      .filter((group) => group.entries.length > 0);
  }
}
