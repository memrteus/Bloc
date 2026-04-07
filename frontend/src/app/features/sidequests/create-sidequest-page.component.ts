import { Component } from '@angular/core';

import { PageShellComponent } from '../../shared/ui/page-shell.component';

@Component({
  selector: 'app-create-sidequest-page',
  standalone: true,
  imports: [PageShellComponent],
  template: `
    <app-page-shell
      eyebrow="Sidequests"
      title="Create a sidequest"
      description="This placeholder page is where students will eventually create a sidequest with a title, description, category, and location. The real form is intentionally deferred."
    >
      <ul class="placeholder-list">
        <li>Title</li>
        <li>Description</li>
        <li>Category</li>
        <li>Location</li>
        <li>24-hour expiration rule</li>
      </ul>
    </app-page-shell>
  `,
  styles: [`
    .placeholder-list {
      margin: 0;
      padding-left: 1.25rem;
      color: #475569;
      line-height: 1.8;
    }
  `]
})
export class CreateSidequestPageComponent {}
