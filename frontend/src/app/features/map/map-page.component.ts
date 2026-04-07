import { Component } from '@angular/core';

import { PageShellComponent } from '../../shared/ui/page-shell.component';

@Component({
  selector: 'app-map-page',
  standalone: true,
  imports: [PageShellComponent],
  template: `
    <app-page-shell
      eyebrow="Map"
      title="Active sidequests map"
      description="This placeholder represents the future map-based discovery view for active sidequests. Map provider integration and live data are intentionally not part of this ticket."
    >
      <div class="map-placeholder">Map canvas placeholder</div>
    </app-page-shell>
  `,
  styles: [`
    .map-placeholder {
      min-height: 280px;
      display: grid;
      place-items: center;
      border-radius: 18px;
      border: 2px dashed #93c5fd;
      background: linear-gradient(135deg, #dbeafe, #eff6ff);
      color: #1d4ed8;
      font-weight: 600;
    }
  `]
})
export class MapPageComponent {}
