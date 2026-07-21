import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NgFor } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Achievement, Game, GameMemory, LifeEvent, LifeEventRequest } from '../../core/models';
import { LifeEventService } from '../../core/services/life-event.service';
import { GameService } from '../../core/services/game.service';
import { GameMemoryService } from '../../core/services/game-memory.service';
import { AchievementService } from '../../core/services/achievement.service';
import { ToastService } from '../../core/services/toast.service';
import { LIFE_EVENT_CATEGORY_LABEL } from '../../core/models/life-event.model';

import { ModalComponent } from '../../shared/components/modal/modal.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { LifeEventFormComponent } from './components/life-event-form/life-event-form.component';
import { QuickNavComponent } from '../../shared/components/quick-nav/quick-nav.component';

type MomentKind = 'life-event' | 'memory' | 'achievement';

interface MomentEntry {
  key: string;
  kind: MomentKind;
  title: string;
  description?: string;
  date: string;
  meta: string;
  gameId?: number;
  gameTitle?: string;
  lifeEvent?: LifeEvent;
}

interface MomentYearGroup {
  year: number;
  entries: MomentEntry[];
}

@Component({
  selector: 'app-life-events',
  standalone: true,
  imports: [NgFor, RouterLink, ModalComponent, ConfirmDialogComponent, IconComponent, LifeEventFormComponent, QuickNavComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './life-events.page.html',
  styleUrl: './life-events.page.scss',
})
export class LifeEventsPage {
  private readonly lifeEventService = inject(LifeEventService);
  private readonly gameService = inject(GameService);
  private readonly memoryService = inject(GameMemoryService);
  private readonly achievementService = inject(AchievementService);
  private readonly toast = inject(ToastService);

  protected readonly loading = signal(true);
  protected readonly error = signal(false);
  protected readonly lifeEvents = signal<LifeEvent[]>([]);
  protected readonly linkedEntries = signal<MomentEntry[]>([]);

  protected readonly showModal = signal(false);
  protected readonly editingLifeEvent = signal<LifeEvent | null>(null);
  protected readonly lifeEventToDelete = signal<LifeEvent | null>(null);

  protected readonly showMemories = signal(true);
  protected readonly showAchievements = signal(true);

  protected readonly trackByEntryKey = (_: number, entry: MomentEntry) => entry.key;

  protected readonly yearGroups = computed<MomentYearGroup[]>(() => {
    const lifeEventEntries: MomentEntry[] = this.lifeEvents().map((lifeEvent) => ({
      key: `life-event-${lifeEvent.id}`,
      kind: 'life-event',
      title: lifeEvent.title,
      description: lifeEvent.description,
      date: lifeEvent.date,
      meta: LIFE_EVENT_CATEGORY_LABEL[lifeEvent.category],
      lifeEvent,
    }));

    const visibleLinkedEntries = this.linkedEntries().filter((entry) => {
      if (entry.kind === 'memory') {
        return this.showMemories();
      }
      if (entry.kind === 'achievement') {
        return this.showAchievements();
      }
      return true;
    });

    const groups = new Map<number, MomentEntry[]>();
    for (const entry of [...lifeEventEntries, ...visibleLinkedEntries]) {
      const year = Number(entry.date.slice(0, 4));
      const list = groups.get(year) ?? [];
      list.push(entry);
      groups.set(year, list);
    }
    return Array.from(groups.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([year, entries]) => ({
        year,
        entries: entries.sort((a, b) => b.date.localeCompare(a.date)),
      }));
  });

  protected readonly quickNavItems = computed(() =>
    this.yearGroups().map((group) => ({ id: `moment-year-${group.year}`, label: String(group.year) })),
  );

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.lifeEventService.getAll().subscribe({
      next: (lifeEvents) => {
        this.lifeEvents.set(lifeEvents);
        this.loading.set(false);
        this.loadLinkedEntries();
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  private loadLinkedEntries(): void {
    this.gameService.getAll().subscribe({
      next: (games) => {
        if (games.length === 0) {
          this.linkedEntries.set([]);
          return;
        }
        forkJoin({
          memories: forkJoin(games.map((game) => this.memoryService.getByGame(game.id).pipe(catchError(() => of<GameMemory[]>([]))))),
          achievements: forkJoin(
            games.map((game) => this.achievementService.getByGame(game.id).pipe(catchError(() => of<Achievement[]>([])))),
          ),
        }).subscribe(({ memories, achievements }) => {
          const gameById = new Map<number, Game>(games.map((game) => [game.id, game]));
          const entries: MomentEntry[] = [];

          memories.forEach((gameMemories) => {
            for (const memory of gameMemories) {
              const game = gameById.get(memory.gameId);
              entries.push({
                key: `memory-${memory.id}`,
                kind: 'memory',
                title: memory.title,
                description: memory.description,
                date: memory.memoryDate,
                meta: 'Memória',
                gameId: memory.gameId,
                gameTitle: game?.title,
              });
            }
          });

          achievements.forEach((gameAchievements) => {
            for (const achievement of gameAchievements) {
              if (!achievement.unlocked || !achievement.unlockedDate) {
                continue;
              }
              const game = gameById.get(achievement.gameId);
              entries.push({
                key: `achievement-${achievement.id}`,
                kind: 'achievement',
                title: achievement.title,
                description: achievement.description,
                date: achievement.unlockedDate,
                meta: 'Conquista',
                gameId: achievement.gameId,
                gameTitle: game?.title,
              });
            }
          });

          this.linkedEntries.set(entries);
        });
      },
      error: () => this.linkedEntries.set([]),
    });
  }

  toggleMemories(): void {
    this.showMemories.update((value) => !value);
  }

  toggleAchievements(): void {
    this.showAchievements.update((value) => !value);
  }

  openCreate(): void {
    this.editingLifeEvent.set(null);
    this.showModal.set(true);
  }

  openEdit(lifeEvent: LifeEvent): void {
    this.editingLifeEvent.set(lifeEvent);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingLifeEvent.set(null);
  }

  onSaved(payload: LifeEventRequest): void {
    const editing = this.editingLifeEvent();
    const request = editing ? this.lifeEventService.update(editing.id, payload) : this.lifeEventService.create(payload);
    request.subscribe({
      next: () => {
        this.closeModal();
        this.load();
        this.toast.success(editing ? 'Momento atualizado com sucesso.' : 'Momento adicionado com sucesso.');
      },
      error: () => {
        this.toast.error(editing ? 'Não foi possível atualizar o momento.' : 'Não foi possível adicionar o momento.');
      },
    });
  }

  requestDelete(lifeEvent: LifeEvent): void {
    this.lifeEventToDelete.set(lifeEvent);
  }

  confirmDelete(): void {
    const lifeEvent = this.lifeEventToDelete();
    if (!lifeEvent) {
      return;
    }
    this.lifeEventService.delete(lifeEvent.id).subscribe({
      next: () => {
        this.lifeEventToDelete.set(null);
        this.load();
        this.toast.success('Momento removido com sucesso.');
      },
      error: () => {
        this.lifeEventToDelete.set(null);
        this.toast.error('Não foi possível remover o momento.');
      },
    });
  }
}
