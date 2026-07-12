import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Run, SavePoint } from '../../../../core/models';
import { IconComponent } from '../../../../shared/components/icon/icon.component';

interface TimelineMarker {
  id: number;
  leftPercent: number;
  label: string;
  savePoint: SavePoint;
  runName: string;
}

interface TimelineRow {
  runId: number;
  runName: string;
  hasBar: boolean;
  leftPercent: number;
  widthPercent: number;
  barLabel: string;
  markers: TimelineMarker[];
}

interface TimelineTick {
  leftPercent: number;
  time: number;
}

function parseDate(iso: string): number {
  return new Date(`${iso}T00:00:00`).getTime();
}

function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

@Component({
  selector: 'app-game-timeline-chart',
  standalone: true,
  imports: [DatePipe, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './game-timeline-chart.component.html',
  styleUrl: './game-timeline-chart.component.scss',
})
export class GameTimelineChartComponent {
  readonly runs = input<Run[]>([]);
  readonly savePointsByRun = input<Map<number, SavePoint[]>>(new Map());

  protected readonly selectedMarker = signal<TimelineMarker | null>(null);

  private readonly domain = computed(() => {
    const times: number[] = [];
    for (const run of this.runs()) {
      if (run.startDate) times.push(parseDate(run.startDate));
      if (run.endDate) times.push(parseDate(run.endDate));
    }
    for (const savePoints of this.savePointsByRun().values()) {
      for (const sp of savePoints) {
        if (sp.date) times.push(parseDate(sp.date));
      }
    }
    if (times.length === 0) {
      return null;
    }
    let min = Math.min(...times);
    let max = Math.max(...times);
    if (min === max) {
      const day = 24 * 60 * 60 * 1000;
      min -= day;
      max += day;
    }
    return { min, max };
  });

  protected readonly isEmpty = computed(() => this.domain() === null);

  protected readonly rows = computed<TimelineRow[]>(() => {
    const domain = this.domain();
    if (!domain) {
      return [];
    }
    const percent = (time: number) => ((time - domain.min) / (domain.max - domain.min)) * 100;
    const savePointsByRun = this.savePointsByRun();

    const rows = this.runs()
      .map((run): TimelineRow & { sortKey: number } => {
        const savePoints = (savePointsByRun.get(run.id) ?? []).filter((sp) => !!sp.date);
        const markers: TimelineMarker[] = savePoints
          .map((sp) => ({
            id: sp.id,
            leftPercent: percent(parseDate(sp.date!)),
            label: `${sp.slot} — ${sp.title}`,
            savePoint: sp,
            runName: run.runName,
          }))
          .sort((a, b) => a.leftPercent - b.leftPercent);

        const startTime = run.startDate ? parseDate(run.startDate) : null;
        const endTime = run.endDate ? parseDate(run.endDate) : null;
        const hasBar = startTime !== null || endTime !== null;
        const left = hasBar ? percent(startTime ?? endTime!) : 0;
        const right = hasBar ? percent(endTime ?? startTime!) : 0;

        const barLabel = run.startDate
          ? `Início: ${formatDate(run.startDate)} — ${run.endDate ? `Fim: ${formatDate(run.endDate)}` : 'Em andamento'}`
          : run.endDate
            ? `Fim: ${formatDate(run.endDate)}`
            : '';

        return {
          runId: run.id,
          runName: run.runName,
          hasBar,
          leftPercent: left,
          widthPercent: Math.max(right - left, hasBar ? 0.8 : 0),
          barLabel,
          markers,
          sortKey: startTime ?? (markers[0]?.leftPercent ?? Infinity),
        };
      })
      .filter((row) => row.hasBar || row.markers.length > 0)
      .sort((a, b) => a.sortKey - b.sortKey);

    return rows;
  });

  protected readonly ticks = computed<TimelineTick[]>(() => {
    const domain = this.domain();
    if (!domain) {
      return [];
    }
    const tickCount = 5;
    const step = (domain.max - domain.min) / (tickCount - 1);
    return Array.from({ length: tickCount }, (_, index) => {
      const time = domain.min + step * index;
      const leftPercent = ((time - domain.min) / (domain.max - domain.min)) * 100;
      return { leftPercent, time };
    });
  });

  selectMarker(marker: TimelineMarker): void {
    this.selectedMarker.set(this.selectedMarker()?.id === marker.id ? null : marker);
  }
}
