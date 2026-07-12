import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type IconName =
  | 'plus'
  | 'edit'
  | 'trash'
  | 'star'
  | 'star-outline'
  | 'search'
  | 'close'
  | 'chevron-right'
  | 'save'
  | 'book'
  | 'check'
  | 'alert'
  | 'crown'
  | 'camera'
  | 'music'
  | 'trophy'
  | 'package'
  | 'wrench'
  | 'calendar';

@Component({
  selector: 'app-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (name() === 'crown') {
      <img
        src="icons/sora-crown.png"
        [style.width.px]="size()"
        [style.height.px]="size() * 0.69"
        alt=""
        aria-hidden="true"
      />
    } @else {
    <svg
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      @switch (name()) {
        @case ('plus') {
          <path d="M12 5v14M5 12h14" />
        }
        @case ('edit') {
          <path
            d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"
          />
        }
        @case ('trash') {
          <path
            d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6"
          />
        }
        @case ('star') {
          <polygon
            points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26"
            fill="currentColor"
          />
        }
        @case ('star-outline') {
          <polygon
            points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26"
          />
        }
        @case ('search') {
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        }
        @case ('close') {
          <path d="M18 6L6 18M6 6l12 12" />
        }
        @case ('chevron-right') {
          <path d="M9 18l6-6-6-6" />
        }
        @case ('save') {
          <path
            d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"
          />
          <path d="M17 21v-8H7v8M7 3v5h8" />
        }
        @case ('book') {
          <path
            d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"
          />
          <path
            d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"
          />
        }
        @case ('check') {
          <path d="M20 6L9 17l-5-5" />
        }
        @case ('alert') {
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v5" />
          <path d="M12 16h.01" />
        }
        @case ('camera') {
          <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
          <circle cx="12" cy="13" r="3.5" />
        }
        @case ('music') {
          <path d="M9 18V5l10-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="16" cy="16" r="3" />
        }
        @case ('trophy') {
          <path d="M7 4h10v5a5 5 0 0 1-10 0V4z" />
          <path d="M7 5H4a2 2 0 0 0 0 4h1M17 5h3a2 2 0 0 1 0 4h-1" />
          <path d="M12 17v4M8 21h8" />
        }
        @case ('package') {
          <path d="M21 8l-9-5-9 5 9 5 9-5z" />
          <path d="M3 8v8l9 5 9-5V8" />
          <path d="M12 13v8" />
        }
        @case ('wrench') {
          <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.8 2.8-2-2z" />
        }
        @case ('calendar') {
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        }
      }
    </svg>
    }
  `,
})
export class IconComponent {
  readonly name = input.required<IconName>();
  readonly size = input<number>(18);
}
