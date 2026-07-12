import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NameCount, Stats } from '../../core/models';
import { StatsService } from '../../core/services/stats.service';

interface DistributionGroup {
  title: string;
  items: NameCount[];
}

@Component({
  selector: 'app-stats',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './stats.page.html',
  styleUrl: './stats.page.scss',
})
export class StatsPage {
  private readonly statsService = inject(StatsService);

  protected readonly stats = signal<Stats | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal(false);

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

  barWidth(count: number, items: NameCount[]): number {
    const max = Math.max(...items.map((item) => item.count), 1);
    return (count / max) * 100;
  }
}
