import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { LifeEvent, LifeEventRequest } from '../../core/models';
import { LifeEventService } from '../../core/services/life-event.service';
import { ToastService } from '../../core/services/toast.service';
import { LIFE_EVENT_CATEGORY_LABEL } from '../../core/models/life-event.model';

import { ModalComponent } from '../../shared/components/modal/modal.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { LifeEventFormComponent } from './components/life-event-form/life-event-form.component';

interface MomentYearGroup {
  year: number;
  lifeEvents: LifeEvent[];
}

@Component({
  selector: 'app-life-events',
  standalone: true,
  imports: [ModalComponent, ConfirmDialogComponent, IconComponent, LifeEventFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './life-events.page.html',
  styleUrl: './life-events.page.scss',
})
export class LifeEventsPage {
  private readonly lifeEventService = inject(LifeEventService);
  private readonly toast = inject(ToastService);

  protected readonly loading = signal(true);
  protected readonly error = signal(false);
  protected readonly lifeEvents = signal<LifeEvent[]>([]);

  protected readonly showModal = signal(false);
  protected readonly editingLifeEvent = signal<LifeEvent | null>(null);
  protected readonly lifeEventToDelete = signal<LifeEvent | null>(null);

  protected readonly categoryLabel = (category: LifeEvent['category']) => LIFE_EVENT_CATEGORY_LABEL[category];

  protected readonly yearGroups = computed<MomentYearGroup[]>(() => {
    const groups = new Map<number, LifeEvent[]>();
    for (const lifeEvent of this.lifeEvents()) {
      const year = Number(lifeEvent.date.slice(0, 4));
      const list = groups.get(year) ?? [];
      list.push(lifeEvent);
      groups.set(year, list);
    }
    return Array.from(groups.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([year, lifeEvents]) => ({
        year,
        lifeEvents: lifeEvents.sort((a, b) => b.date.localeCompare(a.date)),
      }));
  });

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
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
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
