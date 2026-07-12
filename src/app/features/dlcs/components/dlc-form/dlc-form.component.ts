import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Dlc, DlcRequest } from '../../../../core/models';

@Component({
  selector: 'app-dlc-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dlc-form.component.html',
})
export class DlcFormComponent {
  private readonly fb = inject(FormBuilder);

  readonly dlc = input<Dlc | null>(null);
  readonly saved = output<DlcRequest>();
  readonly cancelled = output<void>();

  protected readonly isEditMode = computed(() => !!this.dlc());

  protected readonly form = this.fb.nonNullable.group({
    title: ['', Validators.required],
    description: [''],
    completed: [false],
    notes: [''],
  });

  constructor() {
    effect(() => {
      const dlc = this.dlc();
      if (dlc) {
        this.form.patchValue({
          title: dlc.title,
          description: dlc.description ?? '',
          completed: dlc.completed,
          notes: dlc.notes ?? '',
        });
      } else {
        this.form.reset({ title: '', description: '', completed: false, notes: '' });
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
      completed: value.completed,
      notes: value.notes || undefined,
    });
  }
}
