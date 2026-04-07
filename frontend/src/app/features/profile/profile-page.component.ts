import { Component } from '@angular/core';

import { PageShellComponent } from '../../shared/ui/page-shell.component';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [PageShellComponent],
  template: `
    <app-page-shell
      eyebrow="Profile"
      title="Profile"
      description="This placeholder page is reserved for the student profile view. Future tickets can add user details, joined sidequests, and profile preferences."
    >
      <p class="placeholder">Profile details will be added later.</p>
    </app-page-shell>
  `,
  styles: [`
    .placeholder {
      margin: 0;
      color: #475569;
    }
  `]
})
export class ProfilePageComponent {}
