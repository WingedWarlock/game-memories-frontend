import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Game } from '../../../../core/models';
import { GAME_STATUS_LABEL, GAME_STATUS_VARIANT } from '../../../../core/models/game-status.model';
import { FavoriteIconComponent } from '../../../../shared/components/favorite-icon/favorite-icon.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';

@Component({
  selector: 'app-game-card',
  standalone: true,
  imports: [RouterLink, FavoriteIconComponent, StatusBadgeComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './game-card.component.html',
  styleUrl: './game-card.component.scss',
})
export class GameCardComponent {
  readonly game = input.required<Game>();
  readonly editRequested = output<Game>();
  readonly deleteRequested = output<Game>();

  protected readonly statusLabel = (status: Game['status']) => GAME_STATUS_LABEL[status];
  protected readonly statusVariant = (status: Game['status']) => GAME_STATUS_VARIANT[status];

  onEdit(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.editRequested.emit(this.game());
  }

  onDelete(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.deleteRequested.emit(this.game());
  }
}
