import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Run, SavePoint, SavePointRequest } from '../../../../core/models';
import { SavePointService } from '../../../../core/services/save-point.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { SavePointFormComponent } from '../save-point-form/save-point-form.component';

@Component({
  selector: 'app-save-points-panel',
  standalone: true,
  imports: [ModalComponent, ConfirmDialogComponent, IconComponent, SavePointFormComponent, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './save-points-panel.component.html',
  styleUrl: './save-points-panel.component.scss',
})
export class SavePointsPanelComponent {
  private readonly savePointService = inject(SavePointService);
  private readonly toast = inject(ToastService);

  readonly run = input<Run | null>(null);
  readonly closed = output<void>();

  protected readonly isOpen = computed(() => !!this.run());

  protected readonly savePoints = signal<SavePoint[]>([]);
  protected readonly loading = signal(false);
  protected readonly showForm = signal(false);
  protected readonly editingSavePoint = signal<SavePoint | null>(null);
  protected readonly toDelete = signal<SavePoint | null>(null);

  constructor() {
    effect(() => {
      const run = this.run();
      this.showForm.set(false);
      this.editingSavePoint.set(null);
      this.toDelete.set(null);
      if (run) {
        this.load(run.id);
      } else {
        this.savePoints.set([]);
      }
    });
  }

  private load(runId: number): void {
    this.loading.set(true);
    this.savePointService.getByRun(runId).subscribe({
      next: (savePoints) => {
        this.savePoints.set(savePoints);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openCreate(): void {
    this.editingSavePoint.set(null);
    this.showForm.set(true);
  }

  openEdit(savePoint: SavePoint): void {
    this.editingSavePoint.set(savePoint);
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingSavePoint.set(null);
  }

  onSaved(payload: SavePointRequest): void {
    const run = this.run();
    const editing = this.editingSavePoint();
    if (!run) {
      return;
    }

    const request = editing
      ? this.savePointService.update(editing.id, payload)
      : this.savePointService.create(run.id, payload);

    request.subscribe({
      next: () => {
        this.closeForm();
        this.load(run.id);
        this.toast.success(editing ? 'SavePoint atualizado com sucesso.' : 'SavePoint criado com sucesso.');
      },
      error: () => {
        this.toast.error(editing ? 'Não foi possível atualizar o save point.' : 'Não foi possível criar o save point.');
      },
    });
  }

  requestDelete(savePoint: SavePoint): void {
    this.toDelete.set(savePoint);
  }

  confirmDelete(): void {
    const savePoint = this.toDelete();
    const run = this.run();
    if (!savePoint || !run) {
      return;
    }
    this.savePointService.delete(savePoint.id).subscribe({
      next: () => {
        this.toDelete.set(null);
        this.load(run.id);
        this.toast.success('SavePoint removido com sucesso.');
      },
      error: () => {
        this.toDelete.set(null);
        this.toast.error('Não foi possível remover o save point.');
      },
    });
  }
}
