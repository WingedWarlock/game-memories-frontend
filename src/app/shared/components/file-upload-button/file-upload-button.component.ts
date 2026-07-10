import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-file-upload-button',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label class="btn btn-secondary btn-sm file-upload-button">
      <app-icon name="plus" [size]="14" />
      {{ label() }}
      <input type="file" class="visually-hidden" [accept]="accept()" (change)="onChange($event)" />
    </label>
  `,
  styles: `
    .file-upload-button {
      cursor: pointer;
    }
  `,
})
export class FileUploadButtonComponent {
  readonly label = input<string>('Enviar arquivo');
  readonly accept = input<string>('*/*');
  readonly fileSelected = output<File>();

  onChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.fileSelected.emit(file);
    }
    input.value = '';
  }
}
