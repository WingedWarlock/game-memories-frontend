import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Mod, ModRequest } from '../../../../core/models';

@Component({
  selector: 'app-mod-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './mod-form.component.html',
})
export class ModFormComponent {
  private readonly fb = inject(FormBuilder);

  readonly mod = input<Mod | null>(null);
  readonly saved = output<ModRequest>();
  readonly cancelled = output<void>();

  protected readonly isEditMode = computed(() => !!this.mod());

  protected readonly form = this.fb.nonNullable.group({
    title: ['', Validators.required],
    description: [''],
    link: [''],
    active: [false],
    notes: [''],
  });

  constructor() {
    effect(() => {
      const mod = this.mod();
      if (mod) {
        this.form.patchValue({
          title: mod.title,
          description: mod.description ?? '',
          link: mod.link ?? '',
          active: mod.active,
          notes: mod.notes ?? '',
        });
      } else {
        this.form.reset({ title: '', description: '', link: '', active: false, notes: '' });
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
      link: value.link || undefined,
      active: value.active,
      notes: value.notes || undefined,
    });
  }
}
