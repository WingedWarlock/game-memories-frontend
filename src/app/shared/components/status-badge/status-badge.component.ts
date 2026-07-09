import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type BadgeVariant = 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="badge" [class]="badgeClass()">{{ label() }}</span>`,
})
export class StatusBadgeComponent {
  readonly label = input.required<string>();
  readonly variant = input<BadgeVariant>('neutral');

  protected readonly badgeClass = computed(() => {
    const variant = this.variant();
    return variant === 'neutral' ? 'badge' : `badge badge-${variant}`;
  });
}
