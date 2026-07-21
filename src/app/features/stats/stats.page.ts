import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NgFor } from '@angular/common';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { NameCount, Run, Stats } from '../../core/models';
import { StatsService } from '../../core/services/stats.service';
import { GameService } from '../../core/services/game.service';
import { RunService } from '../../core/services/run.service';
import { QuickNavComponent } from '../../shared/components/quick-nav/quick-nav.component';

interface DistributionGroup {
  title: string;
  items: NameCount[];
}

interface RunDuration {
  gameId: number;
  gameTitle: string;
  runName: string;
  startDate: string;
  endDate: string;
  days: number;
}

interface RunDurationYearGroup {
  year: number;
  runs: RunDuration[];
  fastest: RunDuration;
  slowest: RunDuration;
}

function daysBetween(startDate: string, endDate: string): number {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  return Math.max(0, Math.round((end - start) / 86400000));
}

@Component({
  selector: 'app-stats',
  standalone: true,
  imports: [NgFor, QuickNavComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './stats.page.html',
  styleUrl: './stats.page.scss',
})
export class StatsPage {
  private readonly statsService = inject(StatsService);
  private readonly gameService = inject(GameService);
  private readonly runService = inject(RunService);

  protected readonly stats = signal<Stats | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal(false);

  protected readonly runDurations = signal<RunDuration[]>([]);

  protected readonly fastestRun = computed<RunDuration | null>(() => {
    const runs = this.runDurations();
    return runs.length === 0 ? null : runs.reduce((min, run) => (run.days < min.days ? run : min));
  });

  protected readonly slowestRun = computed<RunDuration | null>(() => {
    const runs = this.runDurations();
    return runs.length === 0 ? null : runs.reduce((max, run) => (run.days > max.days ? run : max));
  });

  protected readonly runsByYear = computed<RunDurationYearGroup[]>(() => {
    const groups = new Map<number, RunDuration[]>();
    for (const run of this.runDurations()) {
      const year = Number(run.endDate.slice(0, 4));
      const list = groups.get(year) ?? [];
      list.push(run);
      groups.set(year, list);
    }
    return Array.from(groups.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([year, runs]) => {
        const sorted = runs.slice().sort((a, b) => a.days - b.days);
        return { year, runs: sorted, fastest: sorted[0], slowest: sorted[sorted.length - 1] };
      });
  });

  protected readonly trackByRunKey = (_: number, run: RunDuration) => `${run.gameId}-${run.runName}-${run.endDate}`;

  protected readonly quickNavItems = computed(() =>
    this.runsByYear().map((group) => ({ id: `stats-year-${group.year}`, label: String(group.year) })),
  );

  protected readonly distributions = computed<DistributionGroup[]>(() => {
    const stats = this.stats();
    if (!stats) {
      return [];
    }
    return [
      { title: 'Jogos por Saga', items: stats.bySaga },
      { title: 'Jogos por Plataforma', items: stats.byPlatform },
      { title: 'Jogos por Gênero', items: stats.byGenre },
      { title: 'Jogos por Status', items: stats.byStatus },
      { title: 'Jogos por Nota', items: stats.byRating },
    ].filter((group) => group.items.length > 0);
  });

  constructor() {
    this.load();
    this.loadRunDurations();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.statsService.getStats().subscribe({
      next: (stats) => {
        this.stats.set(stats);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  private loadRunDurations(): void {
    this.gameService.getAll().subscribe({
      next: (games) => {
        if (games.length === 0) {
          this.runDurations.set([]);
          return;
        }
        forkJoin(
          games.map((game) => this.runService.getByGame(game.id).pipe(catchError(() => of<Run[]>([])))),
        ).subscribe((runsList) => {
          const durations: RunDuration[] = [];
          games.forEach((game, index) => {
            for (const run of runsList[index]) {
              if (!run.startDate || !run.endDate || run.endDate < run.startDate) {
                continue;
              }
              durations.push({
                gameId: game.id,
                gameTitle: game.title,
                runName: run.runName,
                startDate: run.startDate,
                endDate: run.endDate,
                days: daysBetween(run.startDate, run.endDate),
              });
            }
          });
          this.runDurations.set(durations);
        });
      },
      error: () => this.runDurations.set([]),
    });
  }

  barWidth(count: number, items: NameCount[]): number {
    const max = Math.max(...items.map((item) => item.count), 1);
    return (count / max) * 100;
  }

  protected readonly trackByItemName = (_: number, item: NameCount) => item.name;
}
