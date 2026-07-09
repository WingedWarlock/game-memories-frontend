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
    runName: ['', Validators.required],
    difficulty: [''],
    startDate: [''],
    endDate: [''],
    status: ['IN_PROGRESS' as Run['status'], Validators.required],
    completionPercentage: [0, [Validators.min(0), Validators.max(100)]],
    favoriteRun: [false],
    notes: [''],
  });

  constructor() {
    effect(() => {
      const run = this.run();
      if (run) {
        this.form.patchValue({
          runName: run.runName,
          difficulty: run.difficulty ?? '',
          startDate: run.startDate ?? '',
          endDate: run.endDate ?? '',
          status: run.status,
          completionPercentage: run.completionPercentage,
          favoriteRun: run.favoriteRun,
          notes: run.notes ?? '',
        });
      } else {
        this.form.reset({
          runName: '',
          difficulty: '',
          startDate: '',
          endDate: '',
          status: 'IN_PROGRESS',
          completionPercentage: 0,
          favoriteRun: false,
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
      runName: value.runName,
      difficulty: value.difficulty || undefined,
      startDate: value.startDate || undefined,
      endDate: value.endDate || undefined,
      status: value.status,
      completionPercentage: value.completionPercentage,
      favoriteRun: value.favoriteRun,
      notes: value.notes || undefined,
    });
  }
}
