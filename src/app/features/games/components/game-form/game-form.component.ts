import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Game, GameRating, GameRequest } from '../../../../core/models';
import { GAME_STATUS_OPTIONS } from '../../../../core/models/game-status.model';
import { GAME_RATING_OPTIONS } from '../../../../core/models/game-rating.model';
import { IconComponent } from '../../../../shared/components/icon/icon.component';

@Component({
  selector: 'app-game-form',
  standalone: true,
  imports: [ReactiveFormsModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './game-form.component.html',
})
export class GameFormComponent {
  private readonly fb = inject(FormBuilder);

  readonly game = input<Game | null>(null);
  readonly saved = output<GameRequest>();
  readonly cancelled = output<void>();

  protected readonly statusOptions = GAME_STATUS_OPTIONS;
  protected readonly ratingOptions = GAME_RATING_OPTIONS;
  protected readonly isEditMode = computed(() => !!this.game());

  protected readonly form = this.fb.nonNullable.group({
    title: ['', Validators.required],
    saga: [''],
    platform: ['', Validators.required],
    genre: [''],
    status: ['NOT_STARTED' as Game['status'], Validators.required],
    rating: [null as GameRating | null],
    favorite: [false],
    myHundredPercent: [false],
    description: [''],
    notes: [''],
  });

  protected readonly ratingHint = signal<string | null>(null);

  private hintFor(rating: GameRating | null): string | null {
    return this.ratingOptions.find((option) => option.value === rating)?.hint ?? null;
  }

  constructor() {
    this.form.controls.rating.valueChanges.subscribe((rating) => this.ratingHint.set(this.hintFor(rating)));

    effect(() => {
      const game = this.game();
      if (game) {
        this.ratingHint.set(this.hintFor(game.rating ?? null));
        this.form.patchValue({
          title: game.title,
          saga: game.saga ?? '',
          platform: game.platform,
          genre: game.genre ?? '',
          status: game.status,
          rating: game.rating ?? null,
          favorite: game.favorite,
          myHundredPercent: game.myHundredPercent,
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
          rating: null,
          favorite: false,
          myHundredPercent: false,
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
      rating: value.rating ?? undefined,
      favorite: value.favorite,
      myHundredPercent: value.myHundredPercent,
      description: value.description || undefined,
      notes: value.notes || undefined,
    });
  }
}
