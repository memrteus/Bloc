import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { TopNavComponent } from './shared/components/top-nav/top-nav.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, TopNavComponent],
  template: `
    <app-top-nav></app-top-nav>
    <main class="app-content">
      <router-outlet></router-outlet>
    </main>
  `,
  styles: [`
    .app-content {
      padding: 2rem 1.25rem 3rem;
    }
  `]
})
export class AppComponent {}
