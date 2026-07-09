import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Run, RunRequest } from '../../../../core/models';
import { RUN_STATUS_OPTIONS } from '../../../../core/models/run-status.model';

@Component({
  selector: 'app-run-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './run-form.component.html',
})
export class RunFormComponent {
  private readonly fb = inject(FormBuilder);

  readonly run = input<Run | null>(null);
  readonly saved = output<RunRequest>();
  readonly cancelled = output<void>();

  protected readonly statusOptions = RUN_STATUS_OPTIONS;
  protected readonly isEditMode = computed(() => !!this.run());

  protected readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    difficulty: [''],
    startDate: [''],
    endDate: [''],
    status: ['PLANNED' as Run['status'], Validators.required],
    completionPercentage: [0, [Validators.min(0), Validators.max(100)]],
    favorite: [false],
    notes: [''],
  });

  constructor() {
    effect(() => {
      const run = this.run();
      if (run) {
        this.form.patchValue({
          name: run.name,
          difficulty: run.difficulty ?? '',
          startDate: run.startDate ?? '',
          endDate: run.endDate ?? '',
          status: run.status,
          completionPercentage: run.completionPercentage,
          favorite: run.favorite,
          notes: run.notes ?? '',
        });
      } else {
        this.form.reset({
          name: '',
          difficulty: '',
          startDate: '',
          endDate: '',
          status: 'PLANNED',
          completionPercentage: 0,
          favorite: false,
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
      name: value.name,
      difficulty: value.difficulty || undefined,
      startDate: value.startDate || undefined,
      endDate: value.endDate || undefined,
      status: value.status,
      completionPercentage: value.completionPercentage,
      favorite: value.favorite,
      notes: value.notes || undefined,
    });
  }
}
