import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-toast-stack',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toast-stack">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="toast" [class.toast-success]="toast.type === 'success'" [class.toast-error]="toast.type === 'error'">
          <app-icon [name]="toast.type === 'success' ? 'check' : 'alert'" [size]="16" />
          <span>{{ toast.message }}</span>
          <button type="button" class="toast-close" (click)="toastService.dismiss(toast.id)" aria-label="Fechar notificação">
            <app-icon name="close" [size]="13" />
          </button>
        </div>
      }
    </div>
  `,
})
export class ToastStackComponent {
  protected readonly toastService = inject(ToastService);
}
