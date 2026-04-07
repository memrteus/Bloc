import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-page-shell',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="page-shell">
      <p class="eyebrow">{{ eyebrow }}</p>
      <h1>{{ title }}</h1>
      <p class="description">{{ description }}</p>
      <div class="content">
        <ng-content></ng-content>
      </div>
    </section>
  `,
  styles: [`
    .page-shell {
      max-width: 860px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #dbe3ee;
      border-radius: 20px;
      padding: 2rem;
      box-shadow: 0 12px 32px rgba(15, 23, 42, 0.08);
    }

    .eyebrow {
      margin: 0 0 0.5rem;
      color: #2563eb;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-size: 0.75rem;
    }

    h1 {
      margin: 0;
      font-size: 2rem;
    }

    .description {
      margin: 0.75rem 0 0;
      color: #475569;
      line-height: 1.6;
    }

    .content {
      margin-top: 1.5rem;
    }
  `]
})
export class PageShellComponent {
  @Input({ required: true }) title!: string;
  @Input({ required: true }) description!: string;
  @Input() eyebrow = 'Bloc';
}
