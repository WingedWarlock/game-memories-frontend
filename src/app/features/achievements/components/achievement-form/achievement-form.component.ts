import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Achievement, AchievementRequest } from '../../../../core/models';

@Component({
  selector: 'app-achievement-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './achievement-form.component.html',
})
export class AchievementFormComponent {
  private readonly fb = inject(FormBuilder);

  readonly achievement = input<Achievement | null>(null);
  readonly saved = output<AchievementRequest>();
  readonly cancelled = output<void>();

  protected readonly isEditMode = computed(() => !!this.achievement());

  protected readonly form = this.fb.nonNullable.group({
    title: ['', Validators.required],
    description: [''],
    unlocked: [false],
    unlockedDate: [''],
  });

  constructor() {
    effect(() => {
      const achievement = this.achievement();
      if (achievement) {
        this.form.patchValue({
          title: achievement.title,
          description: achievement.description ?? '',
          unlocked: achievement.unlocked,
          unlockedDate: achievement.unlockedDate ?? '',
        });
      } else {
        this.form.reset({ title: '', description: '', unlocked: false, unlockedDate: '' });
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
      description: value.description || undefined,
      unlocked: value.unlocked,
      unlockedDate: value.unlockedDate || undefined,
    });
  }
}
