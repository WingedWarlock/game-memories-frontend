import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgFor } from '@angular/common';
import { Game, Saga } from '../../../../core/models';

export interface SagaMergeSubmission {
  name: string;
  gameSagaNames: string[];
}

@Component({
  selector: 'app-saga-merge-form',
  standalone: true,
  imports: [NgFor, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './saga-merge-form.component.html',
  styleUrl: './saga-merge-form.component.scss',
})
export class SagaMergeFormComponent {
  private readonly fb = inject(FormBuilder);

  readonly games = input.required<Game[]>();
  readonly existingSagas = input.required<Saga[]>();

  readonly saved = output<SagaMergeSubmission>();
  readonly cancelled = output<void>();

  protected readonly form = this.fb.group({
    name: ['', Validators.required],
  });

  protected readonly selectedNames = signal<Set<string>>(new Set());

  protected readonly availableSagaNames = computed<string[]>(() => {
    const claimed = new Set<string>();
    for (const saga of this.existingSagas()) {
      for (const claimedName of saga.gameSagaNames) {
        claimed.add(claimedName);
      }
    }
    const names = new Set<string>();
    for (const game of this.games()) {
      const saga = game.saga?.trim();
      if (saga && !claimed.has(saga)) {
        names.add(saga);
      }
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
  });

  protected readonly trackByName = (_: number, name: string) => name;

  isSelected(name: string): boolean {
    return this.selectedNames().has(name);
  }

  toggleName(name: string): void {
    const next = new Set(this.selectedNames());
    if (next.has(name)) {
      next.delete(name);
    } else {
      next.add(name);
    }
    this.selectedNames.set(next);
  }

  submit(): void {
    if (this.form.invalid || this.selectedNames().size === 0) {
      this.form.markAllAsTouched();
      return;
    }
    this.saved.emit({ name: this.form.value.name!.trim(), gameSagaNames: Array.from(this.selectedNames()) });
  }
}
