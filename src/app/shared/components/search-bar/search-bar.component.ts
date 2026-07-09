import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [FormsModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label class="search-bar">
      <app-icon name="search" [size]="16" />
      <input
        type="search"
        [placeholder]="placeholder()"
        [ngModel]="value()"
        (ngModelChange)="valueChange.emit($event)"
      />
    </label>
  `,
  styles: `
    .search-bar {
      display: flex;
      align-items: center;
      gap: 10px;
      background: var(--bg-elevated);
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-md);
      padding: 0 14px;
      color: var(--text-muted);
      max-width: 360px;
      width: 100%;

      &:focus-within {
        border-color: var(--accent);
        box-shadow: 0 0 0 3px var(--accent-soft);
      }

      input {
        border: none;
        background: transparent;
        padding: 10px 0;

        &:focus {
          box-shadow: none;
        }
      }
    }
  `,
})
export class SearchBarComponent {
  readonly placeholder = input<string>('Pesquisar...');
  readonly value = input<string>('');
  readonly valueChange = output<string>();
}
