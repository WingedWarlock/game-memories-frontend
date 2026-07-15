import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NgFor } from '@angular/common';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Game, GameMusic } from '../../core/models';
import { GameService } from '../../core/services/game.service';
import { GameMusicService } from '../../core/services/game-music.service';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { AlphabetNavComponent } from '../../shared/components/alphabet-nav/alphabet-nav.component';

type MusicViewMode = 'accordion' | 'all';

interface GameMusicGroup {
  game: Game;
  tracks: GameMusic[];
}

function firstLetter(title: string): string {
  return (title.trim()[0] ?? '').toLocaleUpperCase('pt-BR');
}

@Component({
  selector: 'app-music',
  standalone: true,
  imports: [NgFor, IconComponent, AlphabetNavComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './music.page.html',
  styleUrl: './music.page.scss',
})
export class MusicPage {
  private readonly gameService = inject(GameService);
  private readonly gameMusicService = inject(GameMusicService);

  protected readonly loading = signal(true);
  protected readonly error = signal(false);
  protected readonly groups = signal<GameMusicGroup[]>([]);

  protected readonly viewMode = signal<MusicViewMode>('accordion');
  protected readonly expandedGameIds = signal<Set<number>>(new Set());

  protected readonly totalTracks = computed(() => this.groups().reduce((sum, group) => sum + group.tracks.length, 0));

  protected readonly trackByGameId = (_: number, group: GameMusicGroup) => group.game.id;
  protected readonly trackByTrackId = (_: number, track: GameMusic) => track.id;

  private readonly firstGameIdByLetter = computed(() => {
    const map = new Map<string, number>();
    for (const group of this.groups()) {
      const letter = firstLetter(group.game.title);
      if (/[A-Z]/.test(letter) && !map.has(letter)) {
        map.set(letter, group.game.id);
      }
    }
    return map;
  });

  protected readonly availableLetters = computed(() => new Set(this.firstGameIdByLetter().keys()));

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.gameService.getAll().subscribe({
      next: (games) => {
        if (games.length === 0) {
          this.groups.set([]);
          this.loading.set(false);
          return;
        }
        forkJoin(
          games.map((game) => this.gameMusicService.findByGame(game.id).pipe(catchError(() => of<GameMusic[]>([])))),
        ).subscribe((tracksList) => {
          const groups: GameMusicGroup[] = games
            .map((game, index) => ({ game, tracks: tracksList[index] }))
            .filter((group) => group.tracks.length > 0)
            .sort((a, b) => a.game.title.localeCompare(b.game.title, 'pt-BR', { sensitivity: 'base' }));
          this.groups.set(groups);
          this.loading.set(false);
        });
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  setViewMode(mode: MusicViewMode): void {
    this.viewMode.set(mode);
  }

  isExpanded(gameId: number): boolean {
    return this.viewMode() === 'all' || this.expandedGameIds().has(gameId);
  }

  toggleGame(gameId: number): void {
    const next = new Set(this.expandedGameIds());
    if (next.has(gameId)) {
      next.delete(gameId);
    } else {
      next.add(gameId);
    }
    this.expandedGameIds.set(next);
  }

  trackLabel(track: GameMusic): string {
    return track.title || track.originalFileName;
  }

  scrollToLetter(letter: string): void {
    const gameId = this.firstGameIdByLetter().get(letter);
    if (gameId == null) {
      return;
    }
    if (this.viewMode() === 'accordion' && !this.expandedGameIds().has(gameId)) {
      const next = new Set(this.expandedGameIds());
      next.add(gameId);
      this.expandedGameIds.set(next);
    }
    setTimeout(() => {
      document.getElementById(`music-game-${gameId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }
}
