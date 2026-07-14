import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export interface QuickNavItem {
  id: string;
  label: string;
}

@Component({
  selector: 'app-quick-nav',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './quick-nav.component.html',
  styleUrl: './quick-nav.component.scss',
})
export class QuickNavComponent {
  readonly items = input<QuickNavItem[]>([]);
  /** Emitted right before scrolling — lets the parent expand/reveal a target that might be collapsed or hidden. */
  readonly beforeScroll = output<string>();

  scrollTo(id: string): void {
    this.beforeScroll.emit(id);
    setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }
}
