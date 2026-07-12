import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Retrospective } from '../../core/models';
import { StatsService } from '../../core/services/stats.service';
import { GAME_RATING_LABEL } from '../../core/models/game-rating.model';
import { LIFE_EVENT_CATEGORY_LABEL } from '../../core/models/life-event.model';
import { IconComponent } from '../../shared/components/icon/icon.component';

@Component({
  selector: 'app-retrospective',
  standalone: true,
  imports: [DatePipe, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './retrospective.page.html',
  styleUrl: './retrospective.page.scss',
})
export class RetrospectivePage {
  private readonly statsService = inject(StatsService);

  protected readonly loadingYears = signal(true);
  protected readonly loading = signal(false);
  protected readonly error = signal(false);
  protected readonly years = signal<number[]>([]);
  protected readonly selectedYear = signal<number | null>(null);
  protected readonly retrospective = signal<Retrospective | null>(null);

  protected readonly ratingLabel = (rating: keyof typeof GAME_RATING_LABEL) => GAME_RATING_LABEL[rating];
  protected readonly lifeEventCategoryLabel = (category: keyof typeof LIFE_EVENT_CATEGORY_LABEL) =>
    LIFE_EVENT_CATEGORY_LABEL[category];

  constructor() {
    this.loadYears();
  }

  private loadYears(): void {
    this.loadingYears.set(true);
    this.statsService.getRetrospectiveYears().subscribe({
      next: (years) => {
        this.years.set(years);
        this.loadingYears.set(false);
        if (years.length > 0) {
          this.selectYear(years[0]);
        }
      },
      error: () => {
        this.loadingYears.set(false);
        this.error.set(true);
      },
    });
  }

  selectYear(year: number): void {
    this.selectedYear.set(year);
    this.loading.set(true);
    this.error.set(false);
    this.statsService.getRetrospective(year).subscribe({
      next: (retrospective) => {
        this.retrospective.set(retrospective);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  onYearChange(event: Event): void {
    const value = Number((event.target as HTMLSelectElement).value);
    if (!Number.isNaN(value)) {
      this.selectYear(value);
    }
  }
}
