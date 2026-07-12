import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LifeEvent, LifeEventCategory, LifeEventRequest } from '../../../../core/models';
import { LIFE_EVENT_CATEGORY_OPTIONS } from '../../../../core/models/life-event.model';

@Component({
  selector: 'app-life-event-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './life-event-form.component.html',
})
export class LifeEventFormComponent {
  private readonly fb = inject(FormBuilder);

  readonly lifeEvent = input<LifeEvent | null>(null);
  readonly saved = output<LifeEventRequest>();
  readonly cancelled = output<void>();

  protected readonly categoryOptions = LIFE_EVENT_CATEGORY_OPTIONS;
  protected readonly isEditMode = computed(() => !!this.lifeEvent());

  protected readonly form = this.fb.nonNullable.group({
    title: ['', Validators.required],
    description: [''],
    date: ['', Validators.required],
    category: ['PERSONAL' as LifeEventCategory, Validators.required],
  });

  constructor() {
    effect(() => {
      const lifeEvent = this.lifeEvent();
      if (lifeEvent) {
        this.form.patchValue({
          title: lifeEvent.title,
          description: lifeEvent.description ?? '',
          date: lifeEvent.date,
          category: lifeEvent.category,
        });
      } else {
        this.form.reset({ title: '', description: '', date: '', category: 'PERSONAL' });
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
      date: value.date,
      category: value.category,
    });
  }
}
