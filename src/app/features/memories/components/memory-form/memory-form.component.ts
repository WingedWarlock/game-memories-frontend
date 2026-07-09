import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { GameMemory, GameMemoryRequest } from '../../../../core/models';
import { MEMORY_TYPE_OPTIONS } from '../../../../core/models/memory-type.model';

@Component({
  selector: 'app-memory-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './memory-form.component.html',
})
export class MemoryFormComponent {
  private readonly fb = inject(FormBuilder);

  readonly memory = input<GameMemory | null>(null);
  readonly saved = output<GameMemoryRequest>();
  readonly cancelled = output<void>();

  protected readonly typeOptions = MEMORY_TYPE_OPTIONS;
  protected readonly isEditMode = computed(() => !!this.memory());

  protected readonly form = this.fb.nonNullable.group({
    title: ['', Validators.required],
    description: ['', Validators.required],
    date: ['', Validators.required],
    type: ['GENERAL' as GameMemory['type'], Validators.required],
  });

  constructor() {
    effect(() => {
      const memory = this.memory();
      if (memory) {
        this.form.patchValue({
          title: memory.title,
          description: memory.description,
          date: memory.date,
          type: memory.type,
        });
      } else {
        this.form.reset({
          title: '',
          description: '',
          date: '',
          type: 'GENERAL',
        });
      }
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saved.emit(this.form.getRawValue());
  }
}
