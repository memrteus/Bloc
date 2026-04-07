import { Component } from '@angular/core';

import { PageShellComponent } from '../../shared/ui/page-shell.component';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [PageShellComponent],
  template: `
    <app-page-shell
      eyebrow="Auth"
      title="Login"
      description="This placeholder page will later connect to Supabase Auth for student sign-in. For now, it confirms the auth route and feature structure are in place."
    >
      <p class="placeholder">Login form fields and validation will be added in a later ticket.</p>
    </app-page-shell>
  `,
  styles: [`
    .placeholder {
      margin: 0;
      color: #475569;
    }
  `]
})
export class LoginPageComponent {}
