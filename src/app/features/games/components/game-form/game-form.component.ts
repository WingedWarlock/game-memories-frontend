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
    status: ['NOT_STARTED' as Game['status'], Validators.required],
    favorite: [false],
    description: [''],
    notes: [''],
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
          status: game.status,
          favorite: game.favorite,
          description: game.description ?? '',
          notes: game.notes ?? '',
        });
      } else {
        this.form.reset({
          title: '',
          saga: '',
          platform: '',
          genre: '',
          status: 'NOT_STARTED',
          favorite: false,
          description: '',
          notes: '',
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
      status: value.status,
      favorite: value.favorite,
      description: value.description || undefined,
      notes: value.notes || undefined,
    });
  }
}
