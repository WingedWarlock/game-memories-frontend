import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-favorite-icon',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="favorite-icon"
      [class.is-favorite]="favorite()"
      [attr.title]="favorite() ? 'Favorito' : null"
    >
      <app-icon [name]="favorite() ? 'star' : 'star-outline'" [size]="size()" />
    </span>
  `,
})
export class FavoriteIconComponent {
  readonly favorite = input<boolean>(false);
  readonly size = input<number>(16);
}
