import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Game, GameRequest } from '../../../../core/models';
import { GAME_STATUS_OPTIONS } from '../../../../core/models/game-status.model';

@Component({
  selector: 'app-game-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './game-form.component.html',
})
export class GameFormComponent {
  private readonly fb = inject(FormBuilder);

  readonly game = input<Game | null>(null);
  readonly saved = output<GameRequest>();
  readonly cancelled = output<void>();

  protected readonly statusOptions = GAME_STATUS_OPTIONS;
  protected readonly isEditMode = computed(() => !!this.game());

  protected readonly form = this.fb.nonNullable.group({
    title: ['', Validators.required],
    saga: [''],
    platform: ['', Validators.required],
    genre: [''],
    developer: [''],
    publisher: [''],
    releaseYear: this.fb.control<number | null>(null),
    status: ['BACKLOG' as Game['status'], Validators.required],
    favorite: [false],
    coverUrl: [''],
    description: [''],
  });

  constructor() {
    effect(() => {
      const game = this.game();
      if (game) {
        this.form.patchValue({
          title: game.title,
          saga: game.saga ?? '',
          platform: game.platform,
          genre: game.genre ?? '',
          developer: game.developer ?? '',
          publisher: game.publisher ?? '',
          releaseYear: game.releaseYear ?? null,
          status: game.status,
          favorite: game.favorite,
          coverUrl: game.coverUrl ?? '',
          description: game.description ?? '',
        });
      } else {
        this.form.reset({
          title: '',
          saga: '',
          platform: '',
          genre: '',
          developer: '',
          publisher: '',
          releaseYear: null,
          status: 'BACKLOG',
          favorite: false,
          coverUrl: '',
          description: '',
        });
      }
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.saved.emit({
      title: value.title,
      saga: value.saga || undefined,
      platform: value.platform,
      genre: value.genre || undefined,
      developer: value.developer || undefined,
      publisher: value.publisher || undefined,
      releaseYear: value.releaseYear ?? undefined,
      status: value.status,
      favorite: value.favorite,
      coverUrl: value.coverUrl || undefined,
      description: value.description || undefined,
    });
  }
}
