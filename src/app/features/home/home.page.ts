import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Game, GameRequest } from '../../core/models';
import { GameService } from '../../core/services/game.service';
import { SearchBarComponent } from '../../shared/components/search-bar/search-bar.component';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { GameCardComponent } from '../games/components/game-card/game-card.component';
import { GameFormComponent } from '../games/components/game-form/game-form.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    SearchBarComponent,
    ModalComponent,
    ConfirmDialogComponent,
    IconComponent,
    GameCardComponent,
    GameFormComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.page.html',
  styleUrl: './home.page.scss',
})
export class HomePage {
  private readonly gameService = inject(GameService);

  protected readonly games = signal<Game[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal(false);
  protected readonly searchTerm = signal('');

  protected readonly showGameModal = signal(false);
  protected readonly editingGame = signal<Game | null>(null);
  protected readonly gameToDelete = signal<Game | null>(null);

  constructor() {
    this.loadGames();
  }

  loadGames(): void {
    this.loading.set(true);
    this.error.set(false);
    this.gameService.getAll().subscribe({
      next: (games) => {
        this.games.set(games);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  openCreateModal(): void {
    this.editingGame.set(null);
    this.showGameModal.set(true);
  }

  openEditModal(game: Game): void {
    this.editingGame.set(game);
    this.showGameModal.set(true);
  }

  closeGameModal(): void {
    this.showGameModal.set(false);
    this.editingGame.set(null);
  }

  onGameSaved(payload: GameRequest): void {
    const editing = this.editingGame();
    const request = editing
      ? this.gameService.update(editing.id, payload)
      : this.gameService.create(payload);

    request.subscribe({
      next: () => {
        this.closeGameModal();
        this.loadGames();
      },
    });
  }

  requestDelete(game: Game): void {
    this.gameToDelete.set(game);
  }

  cancelDelete(): void {
    this.gameToDelete.set(null);
  }

  confirmDelete(): void {
    const game = this.gameToDelete();
    if (!game) {
      return;
    }
    this.gameService.delete(game.id).subscribe({
      next: () => {
        this.gameToDelete.set(null);
        this.loadGames();
      },
    });
  }
}
