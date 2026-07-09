import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ModalComponent } from '../modal/modal.component';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [ModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal [open]="open()" [title]="title()" size="sm" (closed)="cancelled.emit()">
      <p class="confirm-message">{{ message() }}</p>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" (click)="cancelled.emit()">
          {{ cancelLabel() }}
        </button>
        <button
          type="button"
          [class]="danger() ? 'btn btn-danger' : 'btn btn-primary'"
          (click)="confirmed.emit()"
        >
          {{ confirmLabel() }}
        </button>
      </div>
    </app-modal>
  `,
  styles: `
    .confirm-message {
      color: var(--text-secondary);
      margin-bottom: 4px;
    }
  `,
})
export class ConfirmDialogComponent {
  readonly open = input<boolean>(false);
  readonly title = input<string>('Confirmar ação');
  readonly message = input<string>('Tem certeza que deseja continuar?');
  readonly confirmLabel = input<string>('Confirmar');
  readonly cancelLabel = input<string>('Cancelar');
  readonly danger = input<boolean>(false);

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();
}
