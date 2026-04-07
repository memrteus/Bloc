import { Component, inject } from '@angular/core';

import { AppConfigService } from '../../core/services/app-config.service';
import { PageShellComponent } from '../../shared/ui/page-shell.component';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [PageShellComponent],
  template: `
    <app-page-shell
      eyebrow="Overview"
      title="Campus sidequests, built for quick connection."
      description="Bloc helps students discover short-lived sidequests on a map, create their own, and join what is happening nearby. This frontend ticket focuses on structure, navigation, and placeholder views."
    >
      <div class="info-grid">
        <div class="info-card">
          <h2>API Base URL</h2>
          <p>{{ config.environment.apiBaseUrl }}</p>
        </div>
        <div class="info-card">
          <h2>Supabase Project</h2>
          <p>{{ config.environment.supabaseUrl }}</p>
        </div>
      </div>
    </app-page-shell>
  `,
  styles: [`
    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1rem;
    }

    .info-card {
      padding: 1rem;
      border-radius: 16px;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
    }

    .info-card h2 {
      margin: 0 0 0.5rem;
      font-size: 1rem;
    }

    .info-card p {
      margin: 0;
      color: #1e3a8a;
      word-break: break-word;
    }
  `]
})
export class HomePageComponent {
  protected readonly config = inject(AppConfigService);
}
