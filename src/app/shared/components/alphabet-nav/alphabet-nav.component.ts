import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

@Component({
  selector: 'app-alphabet-nav',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './alphabet-nav.component.html',
  styleUrl: './alphabet-nav.component.scss',
})
export class AlphabetNavComponent {
  readonly availableLetters = input<Set<string>>(new Set());
  readonly letterClick = output<string>();

  protected readonly letters = LETTERS;

  isAvailable(letter: string): boolean {
    return this.availableLetters().has(letter);
  }

  select(letter: string): void {
    if (this.isAvailable(letter)) {
      this.letterClick.emit(letter);
    }
  }
}
