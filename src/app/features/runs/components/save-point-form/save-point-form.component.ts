import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SavePoint, SavePointRequest } from '../../../../core/models';

@Component({
  selector: 'app-save-point-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './save-point-form.component.html',
})
export class SavePointFormComponent {
  private readonly fb = inject(FormBuilder);

  readonly savePoint = input<SavePoint | null>(null);
  readonly saved = output<SavePointRequest>();
  readonly cancelled = output<void>();

  protected readonly isEditMode = computed(() => !!this.savePoint());

  protected readonly form = this.fb.nonNullable.group({
    slot: ['', Validators.required],
    title: ['', Validators.required],
    description: [''],
  });

  constructor() {
    effect(() => {
      const savePoint = this.savePoint();
      if (savePoint) {
        this.form.patchValue({
          slot: savePoint.slot,
          title: savePoint.title,
          description: savePoint.description ?? '',
        });
      } else {
        this.form.reset({ slot: '', title: '', description: '' });
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
      slot: value.slot,
      title: value.title,
      description: value.description || undefined,
    });
  }
}
