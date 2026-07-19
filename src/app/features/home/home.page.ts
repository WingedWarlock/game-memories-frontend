import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Game, GameRequest } from '../../core/models';
import { GameService } from '../../core/services/game.service';
import { ToastService } from '../../core/services/toast.service';
import { SearchBarComponent } from '../../shared/components/search-bar/search-bar.component';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { GameCardComponent } from '../games/components/game-card/game-card.component';
import { GameFormComponent } from '../games/components/game-form/game-form.component';
import { AlphabetNavComponent } from '../../shared/components/alphabet-nav/alphabet-nav.component';

function firstLetter(title: string): string {
  return (title.trim()[0] ?? '').toLocaleUpperCase('pt-BR');
}

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
    AlphabetNavComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.page.html',
  styleUrl: './home.page.scss',
})
export class HomePage {
  private readonly gameService = inject(GameService);
  private readonly toast = inject(ToastService);

  protected readonly games = signal<Game[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal(false);
  protected readonly searchTerm = signal('');

  protected readonly showGameModal = signal(false);
  protected readonly editingGame = signal<Game | null>(null);
  protected readonly gameToDelete = signal<Game | null>(null);

  protected readonly filteredGames = computed<Game[]>(() => {
    const term = this.searchTerm().trim().toLocaleLowerCase('pt-BR');
    if (!term) {
      return this.games();
    }
    return this.games().filter(
      (game) =>
        game.title.toLocaleLowerCase('pt-BR').includes(term) ||
        (game.saga ?? '').toLocaleLowerCase('pt-BR').includes(term) ||
        game.platform.toLocaleLowerCase('pt-BR').includes(term),
    );
  });

  private readonly firstGameIdByLetter = computed(() => {
    const map = new Map<string, number>();
    for (const game of this.filteredGames()) {
      const letter = firstLetter(game.title);
      if (/[A-Z]/.test(letter) && !map.has(letter)) {
        map.set(letter, game.id);
      }
    }
    return map;
  });

  protected readonly availableLetters = computed(() => new Set(this.firstGameIdByLetter().keys()));

  constructor() {
    this.loadGames();
  }

  loadGames(): void {
    this.loading.set(true);
    this.error.set(false);
    this.gameService.getAll().subscribe({
      next: (games) => {
        this.games.set(
          games.slice().sort((a, b) => a.title.localeCompare(b.title, 'pt-BR', { sensitivity: 'base' })),
        );
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  scrollToLetter(letter: string): void {
    const gameId = this.firstGameIdByLetter().get(letter);
    if (gameId != null) {
      document.getElementById(`game-${gameId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
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
        this.toast.success(editing ? 'Game atualizado com sucesso.' : 'Game criado com sucesso.');
      },
      error: () => {
        this.toast.error(editing ? 'Não foi possível atualizar o game.' : 'Não foi possível criar o game.');
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
        this.toast.success('Game removido com sucesso.');
      },
      error: () => {
        this.gameToDelete.set(null);
        this.toast.error('Não foi possível remover o game.');
      },
    });
  }
}
