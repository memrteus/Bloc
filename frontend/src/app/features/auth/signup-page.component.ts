import { Component } from '@angular/core';

import { PageShellComponent } from '../../shared/ui/page-shell.component';

@Component({
  selector: 'app-signup-page',
  standalone: true,
  imports: [PageShellComponent],
  template: `
    <app-page-shell
      eyebrow="Auth"
      title="Signup"
      description="This placeholder page is reserved for the Bloc signup flow. It will later use Supabase Auth without introducing custom password logic in the frontend."
    >
      <p class="placeholder">Signup UI will be implemented in a later ticket.</p>
    </app-page-shell>
  `,
  styles: [`
    .placeholder {
      margin: 0;
      color: #475569;
    }
  `]
})
export class SignupPageComponent {}
