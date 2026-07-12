import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe, NgFor } from '@angular/common';
import { HistoryEvent, HistoryEventType } from '../../core/models';
import { HistoryEventService } from '../../core/services/history-event.service';
import { IconComponent, IconName } from '../../shared/components/icon/icon.component';

interface HistoryDayGroup {
  dateKey: string;
  events: HistoryEvent[];
}

const EVENT_ICON: Record<HistoryEventType, IconName> = {
  GAME_ADDED: 'plus',
  GAME_REMOVED: 'trash',
  GAME_FAVORITED: 'star',
  GAME_UNFAVORITED: 'star-outline',
  GAME_HUNDRED_PERCENT: 'crown',
  GAME_RATING_CHANGED: 'check',
  GAME_STATUS_CHANGED: 'alert',
  RUN_CREATED: 'plus',
  RUN_COMPLETED: 'check',
  MEMORY_ADDED: 'book',
  SCREENSHOT_ADDED: 'camera',
  MUSIC_ADDED: 'music',
  ACHIEVEMENT_UNLOCKED: 'trophy',
  DLC_ADDED: 'package',
  MOD_ADDED: 'wrench',
  SAVEPOINT_ADDED: 'save',
  LIFE_EVENT_ADDED: 'calendar',
};

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [DatePipe, NgFor, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './history.page.html',
  styleUrl: './history.page.scss',
})
export class HistoryPage {
  private readonly historyService = inject(HistoryEventService);

  protected readonly loading = signal(true);
  protected readonly error = signal(false);
  protected readonly events = signal<HistoryEvent[]>([]);

  protected readonly dayGroups = computed<HistoryDayGroup[]>(() => {
    const groups = new Map<string, HistoryEvent[]>();
    for (const event of this.events()) {
      const dateKey = event.occurredAt.slice(0, 10);
      const list = groups.get(dateKey) ?? [];
      list.push(event);
      groups.set(dateKey, list);
    }
    return Array.from(groups.entries()).map(([dateKey, events]) => ({ dateKey, events }));
  });

  protected readonly eventIcon = (type: HistoryEventType) => EVENT_ICON[type];

  protected readonly trackByEventId = (_: number, event: HistoryEvent) => event.id;

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.historyService.getAll().subscribe({
      next: (events) => {
        this.events.set(events);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }
}
