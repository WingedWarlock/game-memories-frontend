import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { DatePipe, NgFor } from '@angular/common';
import { Achievement, GameMemory, Run, SavePoint } from '../../../../core/models';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import {
  MarkerCluster,
  TimelineMarkerItem,
  clusterMarkers,
  formatTimelineDate,
  parseTimelineDate,
} from '../../../../core/utils/timeline-chart.util';

interface TimelineRow {
  key: string;
  label: string;
  hasBar: boolean;
  leftPercent: number;
  widthPercent: number;
  barLabel: string;
  clusters: MarkerCluster[];
}

interface TimelineTick {
  leftPercent: number;
  time: number;
}

@Component({
  selector: 'app-game-timeline-chart',
  standalone: true,
  imports: [DatePipe, NgFor, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './game-timeline-chart.component.html',
  styleUrl: './game-timeline-chart.component.scss',
})
export class GameTimelineChartComponent {
  readonly runs = input<Run[]>([]);
  readonly savePointsByRun = input<Map<number, SavePoint[]>>(new Map());
  readonly memories = input<GameMemory[]>([]);
  readonly achievements = input<Achievement[]>([]);

  protected readonly selectedCluster = signal<MarkerCluster | null>(null);
  protected readonly trackByItemId = (_: number, item: TimelineMarkerItem) => item.id;

  private readonly domain = computed(() => {
    const times: number[] = [];
    for (const run of this.runs()) {
      if (run.startDate) times.push(parseTimelineDate(run.startDate));
      if (run.endDate) times.push(parseTimelineDate(run.endDate));
    }
    for (const savePoints of this.savePointsByRun().values()) {
      for (const sp of savePoints) {
        if (sp.date) times.push(parseTimelineDate(sp.date));
      }
    }
    for (const memory of this.memories()) {
      if (memory.memoryDate) times.push(parseTimelineDate(memory.memoryDate));
    }
    for (const achievement of this.achievements()) {
      if (achievement.unlocked && achievement.unlockedDate) times.push(parseTimelineDate(achievement.unlockedDate));
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

    const runRows = this.runs()
      .map((run): TimelineRow & { sortKey: number } => {
        const savePoints = (savePointsByRun.get(run.id) ?? []).filter((sp) => !!sp.date);
        const markerItems: TimelineMarkerItem[] = savePoints.map((sp) => ({
          id: `savepoint-${sp.id}`,
          kind: 'savepoint',
          leftPercent: percent(parseTimelineDate(sp.date!)),
          title: sp.title,
          subtitle: sp.slot,
          description: sp.description,
          date: sp.date!,
        }));

        const startTime = run.startDate ? parseTimelineDate(run.startDate) : null;
        const endTime = run.endDate ? parseTimelineDate(run.endDate) : null;
        const hasBar = startTime !== null || endTime !== null;
        const left = hasBar ? percent(startTime ?? endTime!) : 0;
        const right = hasBar ? percent(endTime ?? startTime!) : 0;

        const barLabel = run.startDate
          ? `Início: ${formatTimelineDate(run.startDate)} — ${run.endDate ? `Fim: ${formatTimelineDate(run.endDate)}` : 'Em andamento'}`
          : run.endDate
            ? `Fim: ${formatTimelineDate(run.endDate)}`
            : '';

        return {
          key: `run-${run.id}`,
          label: run.runName,
          hasBar,
          leftPercent: left,
          widthPercent: Math.max(right - left, hasBar ? 0.8 : 0),
          barLabel,
          clusters: clusterMarkers(markerItems),
          sortKey: startTime ?? (markerItems[0]?.leftPercent ?? Infinity),
        };
      })
      .filter((row) => row.hasBar || row.clusters.length > 0)
      .sort((a, b) => a.sortKey - b.sortKey);

    const memoryItems: TimelineMarkerItem[] = this.memories()
      .filter((memory) => !!memory.memoryDate)
      .map((memory) => ({
        id: `memory-${memory.id}`,
        kind: 'memory',
        leftPercent: percent(parseTimelineDate(memory.memoryDate)),
        title: memory.title,
        description: memory.description,
        date: memory.memoryDate,
      }));

    const achievementItems: TimelineMarkerItem[] = this.achievements()
      .filter((achievement) => achievement.unlocked && !!achievement.unlockedDate)
      .map((achievement) => ({
        id: `achievement-${achievement.id}`,
        kind: 'achievement',
        leftPercent: percent(parseTimelineDate(achievement.unlockedDate!)),
        title: achievement.title,
        description: achievement.description,
        date: achievement.unlockedDate!,
      }));

    const extraRows: TimelineRow[] = [];
    if (memoryItems.length > 0) {
      extraRows.push({
        key: 'memories',
        label: 'Memórias',
        hasBar: false,
        leftPercent: 0,
        widthPercent: 0,
        barLabel: '',
        clusters: clusterMarkers(memoryItems),
      });
    }
    if (achievementItems.length > 0) {
      extraRows.push({
        key: 'achievements',
        label: 'Conquistas',
        hasBar: false,
        leftPercent: 0,
        widthPercent: 0,
        barLabel: '',
        clusters: clusterMarkers(achievementItems),
      });
    }

    return [...runRows, ...extraRows];
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

  selectCluster(cluster: MarkerCluster): void {
    this.selectedCluster.set(this.selectedCluster()?.key === cluster.key ? null : cluster);
  }

  closeDetail(): void {
    this.selectedCluster.set(null);
  }
}
