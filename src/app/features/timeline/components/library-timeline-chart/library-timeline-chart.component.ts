import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { DatePipe, NgFor } from '@angular/common';
import { Achievement, GameMemory, LifeEvent, Run, SavePoint } from '../../../../core/models';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import {
  MarkerCluster,
  TimelineMarkerItem,
  clusterMarkers,
  formatTimelineDate,
  parseTimelineDate,
} from '../../../../core/utils/timeline-chart.util';

export interface LibraryRun extends Run {
  gameTitle: string;
}

interface TimelineRow {
  key: string;
  label: string;
  fullLabel: string;
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
  selector: 'app-library-timeline-chart',
  standalone: true,
  imports: [DatePipe, NgFor, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './library-timeline-chart.component.html',
  styleUrl: './library-timeline-chart.component.scss',
})
export class LibraryTimelineChartComponent {
  readonly runs = input<LibraryRun[]>([]);
  readonly savePointsByRun = input<Map<number, SavePoint[]>>(new Map());
  readonly memoriesByRun = input<Map<number, GameMemory[]>>(new Map());
  readonly achievementsByRun = input<Map<number, Achievement[]>>(new Map());
  readonly lifeEvents = input<LifeEvent[]>([]);

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
    for (const memories of this.memoriesByRun().values()) {
      for (const memory of memories) {
        if (memory.memoryDate) times.push(parseTimelineDate(memory.memoryDate));
      }
    }
    for (const achievements of this.achievementsByRun().values()) {
      for (const achievement of achievements) {
        if (achievement.unlocked && achievement.unlockedDate) times.push(parseTimelineDate(achievement.unlockedDate));
      }
    }
    for (const lifeEvent of this.lifeEvents()) {
      if (lifeEvent.date) times.push(parseTimelineDate(lifeEvent.date));
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
    const memoriesByRun = this.memoriesByRun();
    const achievementsByRun = this.achievementsByRun();

    const runRows = this.runs()
      .map((run): TimelineRow & { sortKey: number } => {
        const savePoints = (savePointsByRun.get(run.id) ?? []).filter((sp) => !!sp.date);
        const savePointItems: TimelineMarkerItem[] = savePoints.map((sp) => ({
          id: `savepoint-${sp.id}`,
          kind: 'savepoint',
          leftPercent: percent(parseTimelineDate(sp.date!)),
          title: sp.title,
          subtitle: sp.slot,
          description: sp.description,
          date: sp.date!,
        }));

        const memories = (memoriesByRun.get(run.id) ?? []).filter((memory) => !!memory.memoryDate);
        const memoryItems: TimelineMarkerItem[] = memories.map((memory) => ({
          id: `memory-${memory.id}`,
          kind: 'memory',
          leftPercent: percent(parseTimelineDate(memory.memoryDate)),
          title: memory.title,
          description: memory.description,
          date: memory.memoryDate,
        }));

        const achievements = (achievementsByRun.get(run.id) ?? []).filter(
          (achievement) => achievement.unlocked && !!achievement.unlockedDate,
        );
        const achievementItems: TimelineMarkerItem[] = achievements.map((achievement) => ({
          id: `achievement-${achievement.id}`,
          kind: 'achievement',
          leftPercent: percent(parseTimelineDate(achievement.unlockedDate!)),
          title: achievement.title,
          description: achievement.description,
          date: achievement.unlockedDate!,
        }));

        const markerItems: TimelineMarkerItem[] = [...savePointItems, ...memoryItems, ...achievementItems];

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

        const fullLabel = `${run.gameTitle} · ${run.runName}`;

        return {
          key: `run-${run.id}`,
          label: fullLabel,
          fullLabel,
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

    const lifeEventItems: TimelineMarkerItem[] = this.lifeEvents()
      .filter((lifeEvent) => !!lifeEvent.date)
      .map((lifeEvent) => ({
        id: `life-event-${lifeEvent.id}`,
        kind: 'life-event',
        leftPercent: percent(parseTimelineDate(lifeEvent.date)),
        title: lifeEvent.title,
        description: lifeEvent.description,
        date: lifeEvent.date,
      }));

    if (lifeEventItems.length === 0) {
      return runRows;
    }

    const momentsRow: TimelineRow = {
      key: 'moments',
      label: 'Momentos',
      fullLabel: 'Momentos de vida',
      hasBar: false,
      leftPercent: 0,
      widthPercent: 0,
      barLabel: '',
      clusters: clusterMarkers(lifeEventItems),
    };

    return [...runRows, momentsRow];
  });

  protected readonly ticks = computed<TimelineTick[]>(() => {
    const domain = this.domain();
    if (!domain) {
      return [];
    }
    const tickCount = 6;
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
